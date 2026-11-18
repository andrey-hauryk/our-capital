import assert from 'node:assert/strict'
import test from 'node:test'
import { createSecuritiesQuoteStore, parseMoexQuotes, parseRubleRates } from '../src/composables/useSecuritiesQuotes.js'

const holdings = [{ symbol: 'SBER' }, { symbol: 'SBERP' }, { symbol: 'SBER' }]
const marketPayload = () => ({
  securities: { columns: ['SECID', 'PREVPRICE', 'PREVDATE', 'CURRENCYID'], data: [['SBER', 297, '2026-11-17', 'SUR'], ['SBERP', 295, '2026-11-17', 'SUR']] },
  marketdata: { columns: ['SECID', 'LAST', 'SYSTIME', 'UPDATETIME'], data: [['SBER', 300.125, '2026-11-18 18:40:00', '18:40:00'], ['SBERP', 298.15, '2026-11-18 18:40:00', '18:40:00']] },
})
const fxPayload = () => ({ data: { currency: 'RUB', rates: { RUB: '1', USD: '0.012', BYN: '0.036', EUR: '0.011' } } })
const response = (data) => ({ ok: true, status: 200, json: async () => data })
const provider = (url) => Promise.resolve(response(url.startsWith('https://iss.moex.com') ? marketPayload() : fxPayload()))

test('MOEX parser reads named columns and preserves raw price and market time', () => {
  const parsed = parseMoexQuotes(marketPayload(), ['SBER', 'SBERP'])
  assert.equal(parsed.SBER.priceRub, 300.125)
  assert.equal(parsed.SBER.priceType, 'last')
  assert.equal(parsed.SBER.priceDate, '2026-11-18')
  assert.equal(parsed.SBER.marketTime, '2026-11-18 18:40:00')
  const reordered = marketPayload()
  reordered.marketdata = { columns: ['LAST', 'SECID'], data: [[300.125, 'SBER'], [298.15, 'SBERP']] }
  assert.equal(parseMoexQuotes(reordered, ['SBER']).SBER.priceRub, 300.125)
  assert.throws(() => parseMoexQuotes({ securities: { columns: [], data: [] } }, ['SBER']), TypeError)
})

test('missing live price falls back only to a positive previous price with its date', () => {
  const payload = marketPayload()
  payload.marketdata.data[0][1] = null
  const previous = parseMoexQuotes(payload, ['SBER']).SBER
  assert.equal(previous.priceRub, 297)
  assert.equal(previous.priceType, 'previous')
  assert.equal(previous.priceDate, '2026-11-17')
  assert.equal(previous.marketTime, null)
  payload.securities.data[0][2] = null
  assert.deepEqual(parseMoexQuotes(payload, ['SBER']), {})
  payload.securities.data[0][2] = '2026-11-17'
  for (const invalid of [0, -1, null, '', ' ', true, Infinity]) {
    payload.securities.data[0][1] = invalid
    assert.deepEqual(parseMoexQuotes(payload, ['SBER']), {})
  }
})

test('FX parser validates base, one RUB per RUB and all supported positive rates', () => {
  assert.equal(parseRubleRates(fxPayload()).USD, 0.012)
  const wrongBase = fxPayload()
  wrongBase.data.currency = 'USD'
  assert.throws(() => parseRubleRates(wrongBase), TypeError)
  const wrongRub = fxPayload()
  wrongRub.data.rates.RUB = 2
  assert.throws(() => parseRubleRates(wrongRub), TypeError)
  for (const invalid of [null, '', false, 0, -1, Infinity, 'NaN', '0x10']) {
    const invalidRate = fxPayload()
    invalidRate.data.rates.USD = invalid
    assert.throws(() => parseRubleRates(invalidRate), TypeError)
  }
})

test('one MOEX request serves both accounts and one FX request converts without price rounding', async () => {
  const calls = []
  const store = createSecuritiesQuoteStore({ holdings, now: () => 123456, fetchImpl: (url, options) => { calls.push({ url, options }); return provider(url) } })
  assert.equal(calls.length, 0)
  assert.deepEqual(await store.refresh(), { ok: true })
  assert.equal(calls.length, 2)
  const moexUrl = new URL(calls.find((call) => call.url.includes('iss.moex.com')).url)
  assert.equal(moexUrl.searchParams.get('securities'), 'SBER,SBERP')
  assert.ok(calls.every((call) => call.options.credentials === 'omit'))
  assert.equal(store.quotes.value.SBER.rates.RUB, 300.125)
  assert.equal(store.quotes.value.SBER.rates.USD, 300.125 * 0.012)
  assert.equal(store.quotes.value.SBER.receivedAt, 123456)
  assert.equal(store.quotes.value.SBER.delayMinutes, 15)
  assert.equal(store.error.value, '')
})

test('MOEX failure preserves previous quotes and their original receipt time', async () => {
  let fail = false
  let timestamp = 100
  const store = createSecuritiesQuoteStore({ holdings, now: () => timestamp, fetchImpl: (url) => {
    if (fail && url.includes('iss.moex.com')) return Promise.reject(new Error('Unavailable'))
    return provider(url)
  } })
  await store.refresh()
  fail = true
  timestamp = 200
  assert.deepEqual(await store.refresh(), { ok: false })
  assert.equal(store.quotes.value.SBER.receivedAt, 100)
  assert.equal(store.quotes.value.SBER.rates.RUB, 300.125)
  assert.match(store.error.value, /Мосбиржи/)
})

test('fresh same-origin snapshot avoids direct MOEX and preserves the producer timestamp', async () => {
  const calls = []
  const store = createSecuritiesQuoteStore({ holdings, snapshotUrl: '/market/securities.json', now: () => 2000000, fetchImpl: async (url) => {
    calls.push(url)
    return response({ receivedAt: 1800000, moex: marketPayload(), fx: fxPayload() })
  } })
  assert.deepEqual(await store.refresh(), { ok: true })
  assert.deepEqual(calls, ['/market/securities.json'])
  assert.equal(store.quotes.value.SBER.receivedAt, 1800000)
  assert.equal(store.quotes.value.SBER.source, 'snapshot')
  assert.equal(store.quotes.value.SBER.rates.USD, 300.125 * 0.012)
})

test('expired or malformed snapshot falls back to live providers', async () => {
  for (const snapshot of [
    { receivedAt: 1, moex: marketPayload(), fx: fxPayload() },
    { receivedAt: 4000001, moex: marketPayload(), fx: fxPayload() },
    { receivedAt: 3999999, moex: {}, fx: fxPayload() },
    { receivedAt: 3999999, moex: marketPayload(), fx: {} },
  ]) {
    const calls = []
    const store = createSecuritiesQuoteStore({ holdings, snapshotUrl: '/market/securities.json', now: () => 4000000, fetchImpl: (url) => {
      calls.push(url)
      return url.startsWith('/') ? Promise.resolve(response(snapshot)) : provider(url)
    } })
    assert.deepEqual(await store.refresh(), { ok: true })
    assert.equal(calls.length, 3)
    assert.equal(store.quotes.value.SBER.source, 'moex')
    assert.equal(store.quotes.value.SBER.receivedAt, 4000000)
  }
})

test('snapshot without FX keeps actual snapshot ruble prices and marks other currencies unavailable', async () => {
  const store = createSecuritiesQuoteStore({ holdings, snapshotUrl: '/market/securities.json', now: () => 1000, fetchImpl: async () => response({ receivedAt: 999, moex: marketPayload(), fx: null }) })
  assert.deepEqual(await store.refresh(), { ok: false })
  assert.equal(store.quotes.value.SBER.receivedAt, 999)
  assert.equal(store.quotes.value.SBER.rates.RUB, 300.125)
  assert.equal(store.quotes.value.SBER.rates.USD, null)
  assert.match(store.error.value, /Курс валют недоступен/)
})

test('FX failure retains a fresh ruble quote and never fabricates foreign values', async () => {
  const store = createSecuritiesQuoteStore({ holdings, fetchImpl: (url) => url.includes('coinbase.com') ? Promise.reject(new Error('FX unavailable')) : provider(url) })
  assert.deepEqual(await store.refresh(), { ok: false })
  assert.equal(store.quotes.value.SBER.rates.RUB, 300.125)
  assert.equal(store.quotes.value.SBER.rates.USD, null)
  assert.equal(store.quotes.value.SBER.rates.BYN, null)
  assert.match(store.error.value, /Курс валют недоступен/)
})

test('partial quotes are retained individually and missing positions are reported', async () => {
  const partial = marketPayload()
  partial.marketdata.data[1][1] = null
  partial.securities.data[1][1] = null
  const store = createSecuritiesQuoteStore({ holdings, fetchImpl: (url) => Promise.resolve(response(url.includes('iss.moex.com') ? partial : fxPayload())) })
  assert.deepEqual(await store.refresh(), { ok: false })
  assert.equal(store.quotes.value.SBER.priceRub, 300.125)
  assert.equal(store.quotes.value.SBERP, undefined)
  assert.match(store.error.value, /Не все котировки/)
})

test('refresh dedupes requests and stop aborts without a spurious error', async () => {
  let requests = 0
  const store = createSecuritiesQuoteStore({ holdings, fetchImpl: (_url, { signal }) => {
    requests++
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  } })
  const first = store.refresh()
  const second = store.refresh()
  assert.equal(first, second)
  assert.equal(requests, 2)
  store.stop()
  assert.deepEqual(await first, { ok: false, cancelled: true })
  assert.equal(store.error.value, '')
  assert.equal(store.loading.value, false)
})

test('timeouts report unavailable quotes and the interval is cleaned up', async () => {
  const timedOut = createSecuritiesQuoteStore({ holdings, timeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }) })
  assert.deepEqual(await timedOut.refresh(), { ok: false })
  assert.match(timedOut.error.value, /не ответила вовремя/)
  assert.deepEqual(timedOut.quotes.value, {})
  let intervals = 0
  let cleared = 0
  const store = createSecuritiesQuoteStore({ holdings, fetchImpl: provider, setIntervalImpl: (_callback, milliseconds) => { intervals++; assert.equal(milliseconds, 60000); return intervals }, clearIntervalImpl: () => { cleared++ } })
  store.start()
  store.start()
  await store.refresh()
  assert.equal(intervals, 1)
  store.stop()
  assert.equal(cleared, 1)
})
