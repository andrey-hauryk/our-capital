import { readonly, ref } from 'vue'
import { securitiesHoldings } from '../data/securities.js'
import { CURRENCIES } from '../finance.js'

const MOEX_ROOT = 'https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities.json'
const FX_URL = 'https://api.coinbase.com/v2/exchange-rates?currency=RUB'

function positiveNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value.trim())) return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null
}

function sectionRows(section, requiredColumns) {
  if (!Array.isArray(section?.columns) || !Array.isArray(section.data) ||
    section.columns.some((column) => typeof column !== 'string') ||
    new Set(section.columns).size !== section.columns.length ||
    requiredColumns.some((column) => !section.columns.includes(column))) {
    throw new TypeError('Unexpected MOEX section')
  }
  const records = new Map()
  for (const row of section.data) {
    if (!Array.isArray(row) || row.length !== section.columns.length) throw new TypeError('Unexpected MOEX row')
    const record = Object.fromEntries(section.columns.map((column, index) => [column, row[index]]))
    if (typeof record.SECID !== 'string' || records.has(record.SECID)) throw new TypeError('Unexpected MOEX security')
    records.set(record.SECID, record)
  }
  return records
}

export function parseMoexQuotes(payload, symbols) {
  const securities = sectionRows(payload?.securities, ['SECID', 'PREVPRICE', 'PREVDATE', 'CURRENCYID'])
  const market = sectionRows(payload?.marketdata, ['SECID', 'LAST'])
  const result = {}

  for (const symbol of symbols) {
    const security = securities.get(symbol)
    const trade = market.get(symbol)
    if (!security || !['RUB', 'SUR', 'RUR'].includes(security.CURRENCYID)) continue
    const last = positiveNumber(trade?.LAST)
    const previous = positiveNumber(security.PREVPRICE)
    const previousDate = dateOnly(security.PREVDATE)
    const systime = typeof trade?.SYSTIME === 'string' ? trade.SYSTIME : null
    const updateTime = typeof trade?.UPDATETIME === 'string' ? trade.UPDATETIME : null
    if (last !== null) {
      result[symbol] = { priceRub: last, priceType: 'last', priceDate: dateOnly(systime?.slice(0, 10)), marketTime: systime || updateTime }
    } else if (previous !== null && previousDate !== null) {
      result[symbol] = { priceRub: previous, priceType: 'previous', priceDate: previousDate, marketTime: null }
    }
  }
  return result
}

export function parseRubleRates(payload, currencies = CURRENCIES) {
  if (payload?.data?.currency !== 'RUB' || !payload.data.rates || Array.isArray(payload.data.rates)) {
    throw new TypeError('Unexpected RUB exchange rates')
  }
  const rates = Object.fromEntries(currencies.map((currency) => {
    const value = positiveNumber(payload.data.rates[currency])
    if (value === null || (currency === 'RUB' && Math.abs(value - 1) > 1e-12)) throw new TypeError(`Invalid ${currency} exchange rate`)
    return [currency, value]
  }))
  return rates
}

function requestUrl(symbols) {
  const url = new URL(MOEX_ROOT)
  url.searchParams.set('iss.meta', 'off')
  url.searchParams.set('iss.only', 'securities,marketdata')
  url.searchParams.set('securities', symbols.join(','))
  url.searchParams.set('securities.columns', 'SECID,PREVPRICE,PREVDATE,CURRENCYID')
  url.searchParams.set('marketdata.columns', 'SECID,LAST,SYSTIME,UPDATETIME')
  return url.toString()
}

export function createSecuritiesQuoteStore({
  holdings = securitiesHoldings,
  currencies = CURRENCIES,
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
  refreshMs = 60_000,
  timeoutMs = 10_000,
  snapshotUrl = null,
  maxSnapshotAgeMs = 30 * 60_000,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
} = {}) {
  const symbols = [...new Set(holdings.map((holding) => holding.symbol))]
  if (symbols.some((symbol) => typeof symbol !== 'string' || !/^[A-Z0-9]{2,12}$/.test(symbol))) throw new TypeError('Invalid security symbol')
  const quotes = ref({})
  const loading = ref(false)
  const error = ref('')
  let active = null
  let interval = null
  let lastAttemptAt = null

  async function fetchJson(url, signal) {
    const response = await fetchImpl(url, { signal, credentials: 'omit', cache: 'no-store' })
    if (!response.ok) throw new Error(`Quote HTTP ${response.status}`)
    return response.json()
  }

  function applyQuotes(marketQuotes, fxRates, receivedAt, source) {
    const next = { ...quotes.value }
    for (const [symbol, quote] of Object.entries(marketQuotes)) {
      const rates = Object.fromEntries(currencies.map((currency) => {
        const value = currency === 'RUB' ? quote.priceRub : fxRates ? quote.priceRub * fxRates[currency] : null
        return [currency, typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null]
      }))
      next[symbol] = { ...quote, rates, receivedAt, delayMinutes: 15, source }
    }
    quotes.value = next
    if (symbols.some((symbol) => !marketQuotes[symbol])) {
      error.value = 'Не все котировки Мосбиржи доступны. Оценка без курса отмечена прочерком.'
      return { ok: false }
    }
    if (!fxRates) {
      error.value = 'Курс валют недоступен. Стоимость в рублях обновлена; оценка в других валютах пока недоступна.'
      return { ok: false }
    }
    error.value = ''
    return { ok: true }
  }

  async function readSnapshot(signal) {
    if (!snapshotUrl) return null
    try {
      const payload = await fetchJson(snapshotUrl, signal)
      if (!Number.isSafeInteger(payload?.receivedAt) || payload.receivedAt <= 0 ||
        payload.receivedAt > now() || now() - payload.receivedAt > maxSnapshotAgeMs) return null
      const marketQuotes = parseMoexQuotes(payload.moex, symbols)
      if (!Object.keys(marketQuotes).length) return null
      const fxRates = payload.fx === null ? null : parseRubleRates(payload.fx, currencies)
      return { marketQuotes, fxRates, receivedAt: payload.receivedAt }
    } catch {
      return null
    }
  }

  function refresh() {
    if (active) return active.promise
    if (!symbols.length) return Promise.resolve({ ok: true })
    const request = { controller: new AbortController(), cancelled: false, timedOut: false, promise: null }
    active = request
    loading.value = true
    lastAttemptAt = now()
    request.promise = (async () => {
      const timeout = setTimeout(() => {
        request.timedOut = true
        request.controller.abort()
      }, timeoutMs)
      try {
        if (snapshotUrl) {
          const snapshot = await readSnapshot(request.controller.signal)
          if (request.cancelled) return { ok: false, cancelled: true }
          if (snapshot) return applyQuotes(snapshot.marketQuotes, snapshot.fxRates, snapshot.receivedAt, 'snapshot')
        }
        const [marketResult, fxResult] = await Promise.allSettled([
          fetchJson(requestUrl(symbols), request.controller.signal).then((payload) => parseMoexQuotes(payload, symbols)),
          fetchJson(FX_URL, request.controller.signal).then((payload) => parseRubleRates(payload, currencies)),
        ])
        if (request.cancelled) return { ok: false, cancelled: true }
        if (marketResult.status === 'rejected') {
          error.value = request.timedOut ? 'Мосбиржа не ответила вовремя. Повторим запрос автоматически.' : 'Не удалось обновить котировки Мосбиржи. Повторим запрос автоматически.'
          return { ok: false }
        }
        const marketQuotes = marketResult.value
        const fxRates = fxResult.status === 'fulfilled' ? fxResult.value : null
        return applyQuotes(marketQuotes, fxRates, now(), 'moex')
      } catch {
        if (request.cancelled) return { ok: false, cancelled: true }
        error.value = 'Не удалось обновить котировки. Повторим запрос автоматически.'
        return { ok: false }
      } finally {
        clearTimeout(timeout)
        if (active === request) {
          active = null
          loading.value = false
        }
      }
    })()
    return request.promise
  }

  function start() {
    if (interval !== null || !symbols.length) return
    interval = setIntervalImpl(refresh, refreshMs)
    if (lastAttemptAt === null || now() - lastAttemptAt >= refreshMs) refresh()
  }

  function stop() {
    if (interval !== null) clearIntervalImpl(interval)
    interval = null
    if (active) {
      active.cancelled = true
      active.controller.abort()
      active = null
      loading.value = false
      if (symbols.some((symbol) => !quotes.value[symbol])) lastAttemptAt = null
    }
  }

  return { quotes: readonly(quotes), loading: readonly(loading), error: readonly(error), refresh, start, stop }
}

let sharedStore

export function useSecuritiesQuotes() {
  sharedStore ||= createSecuritiesQuoteStore({ snapshotUrl: `${import.meta.env.BASE_URL}market/securities.json` })
  return sharedStore
}
