import { readonly, ref } from 'vue'
import { cryptoHoldings } from '../data/crypto.js'
import { CURRENCIES } from '../finance.js'

const API_ROOT = 'https://api.coinbase.com/v2/exchange-rates'
const REFRESH_MS = 60_000
const TIMEOUT_MS = 10_000

export function parseCoinbaseQuote(payload, symbol, currencies = CURRENCIES) {
  if (payload?.data?.currency !== symbol || !payload.data.rates || Array.isArray(payload.data.rates)) {
    throw new TypeError('Unexpected Coinbase quote response')
  }
  const rates = Object.fromEntries(currencies.map((currency) => {
    const raw = payload.data.rates[currency]
    const text = typeof raw === 'string' ? raw.trim() : null
    if ((typeof raw !== 'number' && typeof raw !== 'string') ||
      (text !== null && !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text))) {
      throw new TypeError(`Invalid ${currency} quote`)
    }
    const rate = Number(raw)
    if (!Number.isFinite(rate) || rate <= 0) throw new TypeError(`Invalid ${currency} quote`)
    return [currency, rate]
  }))
  return { rates }
}

export function createQuoteStore({
  holdings = cryptoHoldings,
  currencies = CURRENCIES,
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
  refreshMs = REFRESH_MS,
  timeoutMs = TIMEOUT_MS,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
} = {}) {
  const symbols = [...new Set(holdings.map((holding) => holding.symbol))]
  if (symbols.some((symbol) => typeof symbol !== 'string' || !/^[A-Z0-9]{2,12}$/.test(symbol))) {
    throw new TypeError('Invalid crypto symbol')
  }
  const quotes = ref({})
  const loading = ref(false)
  const error = ref('')
  let interval = null
  let active = null
  let lastAttemptAt = null

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
        const results = await Promise.allSettled(symbols.map(async (symbol) => {
          const response = await fetchImpl(`${API_ROOT}?currency=${encodeURIComponent(symbol)}`, {
            signal: request.controller.signal,
            credentials: 'omit',
            cache: 'no-store',
          })
          if (!response.ok) throw new Error(`Coinbase HTTP ${response.status}`)
          const quote = parseCoinbaseQuote(await response.json(), symbol, currencies)
          return { symbol, quote: { ...quote, receivedAt: now() } }
        }))

        if (request.cancelled) return { ok: false, cancelled: true }
        const next = { ...quotes.value }
        for (const result of results) {
          if (result.status === 'fulfilled') next[result.value.symbol] = result.value.quote
        }
        quotes.value = next
        const failed = results.some((result) => result.status === 'rejected')
        if (failed) {
          error.value = request.timedOut
            ? 'Источник курса не ответил вовремя. Повторим запрос автоматически.'
            : 'Не удалось обновить курс. Повторим запрос автоматически.'
          return { ok: false }
        }
        error.value = ''
        return { ok: true }
      } catch {
        if (request.cancelled) return { ok: false, cancelled: true }
        error.value = 'Не удалось обновить курс. Повторим запрос автоматически.'
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

export function useCryptoQuotes() {
  sharedStore ||= createQuoteStore()
  return sharedStore
}
