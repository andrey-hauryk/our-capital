import assert from 'node:assert/strict'
import test from 'node:test'
import { createQuoteStore, parseCoinbaseQuote } from '../src/composables/useCryptoQuotes.js'

const holdings = [{ symbol: 'DOGE' }]
const payload = (changes = {}) => ({ data: { currency: 'DOGE', rates: { RUB: '4.83487408134', BYN: '0.17608703202', USD: '0.05863', EUR: '0.05359', ...changes } } })
const response = (body = payload()) => ({ ok: true, status: 200, json: async () => body })

test('Coinbase quotes preserve per-coin precision and validate every supported currency', () => {
  assert.equal(parseCoinbaseQuote(payload(), 'DOGE').rates.USD, 0.05863)
  assert.equal(parseCoinbaseQuote(payload(), 'DOGE').rates.RUB, 4.83487408134)
  assert.throws(() => parseCoinbaseQuote(payload(), 'BTC'), TypeError)
  for (const invalid of [null, '', ' ', false, 0, -1, Infinity, 'NaN', '0x10', undefined]) {
    assert.throws(() => parseCoinbaseQuote(payload({ BYN: invalid }), 'DOGE'), TypeError, `accepted ${invalid}`)
  }
})

test('successful refresh stores quotes, timestamp and one request per unique symbol', async () => {
  const calls = []
  const store = createQuoteStore({ holdings: [...holdings, ...holdings], now: () => 123456, fetchImpl: async (...args) => { calls.push(args); return response() } })
  assert.equal(calls.length, 0, 'Factory creation must not fetch')
  assert.deepEqual(await store.refresh(), { ok: true })
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'https://api.coinbase.com/v2/exchange-rates?currency=DOGE')
  assert.equal(calls[0][1].credentials, 'omit')
  assert.equal(store.quotes.value.DOGE.receivedAt, 123456)
  assert.equal(store.quotes.value.DOGE.rates.RUB, 4.83487408134)
  assert.equal(store.loading.value, false)
  assert.equal(store.error.value, '')
})

test('failed refresh keeps the last successful quote and its original timestamp', async () => {
  let fail = false
  let time = 100
  const store = createQuoteStore({ holdings, now: () => time, fetchImpl: async () => {
    if (fail) throw new Error('Network unavailable')
    return response()
  } })
  await store.refresh()
  fail = true
  time = 200
  assert.deepEqual(await store.refresh(), { ok: false })
  assert.equal(store.quotes.value.DOGE.receivedAt, 100)
  assert.equal(store.quotes.value.DOGE.rates.USD, 0.05863)
  assert.match(store.error.value, /Не удалось обновить/)
})

test('HTTP errors and malformed responses never create zero or fabricated quotes', async () => {
  for (const result of [{ ok: false, status: 429 }, response(payload({ RUB: null })), response({ data: { currency: 'BTC', rates: {} } })]) {
    const store = createQuoteStore({ holdings, fetchImpl: async () => result })
    assert.deepEqual(await store.refresh(), { ok: false })
    assert.deepEqual(store.quotes.value, {})
    assert.ok(store.error.value)
  }
})

test('overlapping refreshes share one request and stop aborts without a spurious error', async () => {
  let calls = 0
  const store = createQuoteStore({ holdings, fetchImpl: (_url, { signal }) => {
    calls++
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  } })
  const first = store.refresh()
  const second = store.refresh()
  assert.equal(first, second)
  assert.equal(calls, 1)
  assert.equal(store.loading.value, true)
  store.stop()
  assert.deepEqual(await first, { ok: false, cancelled: true })
  assert.equal(store.loading.value, false)
  assert.equal(store.error.value, '')
  assert.deepEqual(store.quotes.value, {})
})

test('a timed-out request clears loading state and reports unavailable price', async () => {
  const store = createQuoteStore({ holdings, timeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }) })
  assert.deepEqual(await store.refresh(), { ok: false })
  assert.equal(store.loading.value, false)
  assert.deepEqual(store.quotes.value, {})
  assert.match(store.error.value, /не ответил вовремя/)
})

test('returning after cancelling the initial request fetches again immediately', async () => {
  let calls = 0
  const store = createQuoteStore({ holdings, fetchImpl: (_url, { signal }) => {
    calls++
    if (calls > 1) return Promise.resolve(response())
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  }, setIntervalImpl: () => 1, clearIntervalImpl: () => {} })
  store.start()
  const first = store.refresh()
  store.stop()
  await first
  store.start()
  await store.refresh()
  assert.equal(calls, 2)
  assert.equal(store.quotes.value.DOGE.rates.USD, 0.05863)
  store.stop()
})

test('start owns one interval, throttles repeated entry and stop cleans it up', async () => {
  let requests = 0
  let intervals = 0
  let cleared = 0
  let tick
  let time = 1000
  const store = createQuoteStore({ holdings, now: () => time, fetchImpl: async () => { requests++; return response() }, setIntervalImpl: (callback, milliseconds) => {
    intervals++
    assert.equal(milliseconds, 60000)
    tick = callback
    return intervals
  }, clearIntervalImpl: () => { cleared++ } })
  store.start()
  store.start()
  await store.refresh()
  assert.equal(requests, 1)
  assert.equal(intervals, 1)
  time += 60000
  await tick()
  assert.equal(requests, 2)
  store.stop()
  assert.equal(cleared, 1)
  store.start()
  assert.equal(requests, 2, 'Reopening immediately must not bypass interval throttle')
  store.stop()
})
