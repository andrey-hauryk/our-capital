import assert from 'node:assert/strict'
import test from 'node:test'
import { accounts } from '../src/data/accounts.js'
import { securitiesHoldings } from '../src/data/securities.js'
import { buildPortfolio, validateSecuritiesHoldings } from '../src/portfolio.js'

const stock = (changes = {}) => ({ id: 'broker-sber', name: 'Сбербанк', symbol: 'SBER', quantity: 1000, category: 'securities', ...changes })
const quote = (rub, changes = {}) => ({ rates: { RUB: rub, USD: rub / 100, BYN: rub * 0.03, EUR: rub / 110 }, priceRub: rub, receivedAt: 1700000000000, marketTime: '18:49:59', priceType: 'last', priceDate: '2026-11-18', ...changes })
const stockQuotes = () => ({ SBER: quote(300), SBERP: quote(290) })
const portfolio = (currency = 'RUB', category = null, quotes = stockQuotes()) => buildPortfolio([], [], {}, currency, category, securitiesHoldings, quotes)

test('configured securities preserve the exact broker and IIS share quantities', () => {
  assert.deepEqual(securitiesHoldings.map(({ symbol, quantity, category }) => ({ symbol, quantity, category })), [
    { symbol: 'SBERP', quantity: 2110, category: 'securities' },
    { symbol: 'SBER', quantity: 1000, category: 'securities' },
    { symbol: 'SBER', quantity: 1139, category: 'iis' },
    { symbol: 'SBERP', quantity: 395, category: 'iis' },
  ])
  assert.equal(securitiesHoldings.filter((item) => item.symbol === 'SBER').reduce((sum, item) => sum + item.quantity, 0), 2139)
  assert.equal(securitiesHoldings.filter((item) => item.symbol === 'SBERP').reduce((sum, item) => sum + item.quantity, 0), 2505)
  assert.equal(validateSecuritiesHoldings(securitiesHoldings).length, 4)
})

test('broker and IIS are valued separately while overview counts every position once', () => {
  const all = portfolio()
  const broker = portfolio('RUB', 'securities')
  const iis = portfolio('RUB', 'iis')
  assert.equal(broker.summary.total, 911900)
  assert.equal(iis.summary.total, 456250)
  assert.equal(all.summary.total, 1368150)
  assert.equal(all.summary.total, broker.summary.total + iis.summary.total)
  assert.equal(all.summary.count, 4)
  assert.equal(broker.summary.count, 2)
  assert.equal(iis.summary.count, 2)
  assert.equal(new Set(all.items.map((item) => item.id)).size, 4)
  assert.equal(all.items.filter((item) => item.symbol === 'SBER').length, 2)
  assert.equal(all.items.every((item) => item.assetType === 'security'), true)
  assert.equal(all.items.find((item) => item.id === 'security:broker-sberp').quantity, 2110)
})

test('selected currency values stocks with crypto and matching fixed accounts without duplication', () => {
  const crypto = [{ id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', quantity: 1000 }]
  const cryptoQuotes = { DOGE: { rates: { USD: 0.1 }, receivedAt: 1700000000000 } }
  const fixed = [{ id: 'usd-cash', name: 'Деньги', category: 'cash', currency: 'USD', balance: 20 }, { id: 'rub-cash', name: 'Рубли', category: 'cash', currency: 'RUB', balance: 100 }]
  const result = buildPortfolio(fixed, crypto, cryptoQuotes, 'USD', null, securitiesHoldings, stockQuotes())
  assert.equal(result.summary.total, 13801.5)
  assert.equal(result.summary.count, 6)
  assert.equal(result.summary.otherCurrencyCount, 1)
  assert.equal(result.summary.byCategory.find((item) => item.id === 'securities').balance, 9119)
  assert.equal(result.summary.byCategory.find((item) => item.id === 'iis').balance, 4562.5)
  assert.equal(result.items.filter((item) => item.assetType === 'crypto').length, 1)
  assert.equal(portfolio('USD').summary.total, 13681.5)
  assert.equal(portfolio('BYN').summary.total, 41044.5)
})

test('missing stock prices retain share quantities and mark the whole selected total incomplete', () => {
  const quotes = { SBERP: quote(290) }
  const result = portfolio('RUB', null, quotes)
  assert.equal(result.summary.total, null)
  assert.equal(result.summary.incomplete, true)
  assert.equal(result.summary.missingCount, 2)
  assert.equal(result.summary.knownTotal, 726450)
  assert.equal(result.items.length, 4)
  assert.deepEqual(result.items.filter((item) => item.balance === null).map((item) => item.quantity), [1000, 1139])
  for (const invalid of [null, undefined, '', '300', 0, -1, Infinity, NaN]) {
    const result = buildPortfolio([], [], {}, 'RUB', null, [stock()], { SBER: quote(300, { rates: { RUB: invalid } }) })
    assert.equal(result.items[0].quantity, 1000)
    assert.equal(result.items[0].unitPrice, null)
    assert.equal(result.items[0].balance, null)
    assert.equal(result.summary.total, null)
  }
  assert.equal(portfolio('USD', null, { SBER: quote(300, { rates: { RUB: 300 } }), SBERP: quote(290) }).summary.incomplete, true)
})

test('stock valuation rounds only the multiplied monetary result and preserves quote metadata', () => {
  const previous = quote(300, { rates: { USD: 0.001005 }, priceType: 'previous', priceDate: '2026-11-17', marketTime: null })
  const { items, summary } = buildPortfolio([], [], {}, 'USD', null, [stock()], { SBER: previous })
  assert.equal(summary.total, 1.01)
  assert.equal(items[0].unitPrice, 0.001005)
  assert.equal(items[0].priceRub, 300)
  assert.equal(items[0].priceType, 'previous')
  assert.equal(items[0].priceDate, '2026-11-17')
  assert.equal(items[0].marketTime, null)
  assert.equal(items[0].receivedAt, 1700000000000)
  const oversized = buildPortfolio([], [], {}, 'RUB', null, [stock()], { SBER: quote(1e20) })
  assert.equal(oversized.items[0].balance, null)
  assert.equal(oversized.summary.total, null)
})

test('stock holdings are excluded from unrelated categories and old callers remain valid', () => {
  const cryptoOnly = portfolio('RUB', 'crypto')
  const cashOnly = portfolio('RUB', 'cash')
  assert.equal(cryptoOnly.items.length, 0)
  assert.equal(cashOnly.items.length, 0)
  assert.equal(cryptoOnly.summary.total, 0)
  assert.equal(cashOnly.summary.incomplete, false)
  assert.equal(buildPortfolio([], [], {}, 'RUB').summary.total, 0)
  for (const currency of ['RUB', 'USD', 'BYN', 'EUR']) {
    assert.doesNotThrow(() => buildPortfolio(accounts, [], {}, currency, null, securitiesHoldings, {}))
  }
})

test('invalid stock configurations and cross-source duplicate IDs fail validation', () => {
  for (const quantity of [0, -1, 0.5, '1000', null, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateSecuritiesHoldings([stock({ quantity })]), TypeError)
  }
  for (const category of ['crypto', 'cash', null, undefined]) {
    assert.throws(() => validateSecuritiesHoldings([stock({ category })]), TypeError)
  }
  assert.throws(() => validateSecuritiesHoldings(null), TypeError)
  assert.throws(() => validateSecuritiesHoldings([null]), TypeError)
  assert.throws(() => validateSecuritiesHoldings([stock({ name: '' })]), TypeError)
  assert.throws(() => validateSecuritiesHoldings([stock({ symbol: 'sber' })]), TypeError)
  assert.throws(() => validateSecuritiesHoldings([stock({ symbol: 'ABCDEFGHIJKLM' })]), TypeError)
  assert.throws(() => validateSecuritiesHoldings([stock(), stock({ id: ' broker-sber ' })]), TypeError)
  assert.throws(() => buildPortfolio([{ id: 'security:broker-sber', name: 'Деньги', category: 'cash', currency: 'RUB', balance: 1 }], [], {}, 'RUB', null, [stock()], stockQuotes()), TypeError)
})
