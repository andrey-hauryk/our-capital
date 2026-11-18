import { mkdir, writeFile } from 'node:fs/promises'
import { securitiesHoldings } from '../src/data/securities.js'
import { parseMoexQuotes, parseRubleRates } from '../src/composables/useSecuritiesQuotes.js'

const symbols = [...new Set(securitiesHoldings.map((holding) => holding.symbol))]
const marketUrl = new URL('https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities.json')
marketUrl.searchParams.set('iss.meta', 'off')
marketUrl.searchParams.set('iss.only', 'securities,marketdata')
marketUrl.searchParams.set('securities', symbols.join(','))
marketUrl.searchParams.set('securities.columns', 'SECID,PREVPRICE,PREVDATE,CURRENCYID')
marketUrl.searchParams.set('marketdata.columns', 'SECID,LAST,SYSTIME,UPDATETIME')

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

try {
  const [marketResult, fxResult] = await Promise.allSettled([
    fetchJson(marketUrl),
    fetchJson('https://api.coinbase.com/v2/exchange-rates?currency=RUB'),
  ])
  if (marketResult.status !== 'fulfilled') throw marketResult.reason
  const rawMoex = marketResult.value
  const selectedSection = (section) => {
    const index = section.columns.indexOf('SECID')
    return { columns: section.columns, data: section.data.filter((row) => symbols.includes(row[index])) }
  }
  const moex = { securities: selectedSection(rawMoex.securities), marketdata: selectedSection(rawMoex.marketdata) }
  const parsed = parseMoexQuotes(moex, symbols)
  if (!Object.keys(parsed).length) throw new Error('No valid MOEX prices returned')
  let fx = null
  if (fxResult.status === 'fulfilled') {
    try { fx = { data: { currency: 'RUB', rates: parseRubleRates(fxResult.value) } } } catch { /* RUB valuation remains available. */ }
  }
  const receivedAt = Date.now()
  await mkdir('dist/market', { recursive: true })
  await writeFile('dist/market/securities.json', JSON.stringify({ receivedAt, moex, fx }))
  console.log(`Saved MOEX snapshot for ${Object.keys(parsed).join(', ')} at ${new Date(receivedAt).toISOString()}`)
} catch (error) {
  // Quote availability must not prevent publishing the read-only positions.
  console.warn(`::warning::MOEX snapshot unavailable: ${error.message}`)
}
