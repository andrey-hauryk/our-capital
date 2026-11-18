import assert from 'node:assert/strict'
import test from 'node:test'
import { accounts } from '../src/data/accounts.js'
import { cryptoHoldings } from '../src/data/crypto.js'
import { buildPortfolio, validateCryptoHoldings } from '../src/portfolio.js'

const holding = (changes = {}) => ({ id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', quantity: 1000, ...changes })
const fixed = (changes = {}) => ({ id: 'cash-rub', name: 'Накопления', category: 'cash', balance: 100, currency: 'RUB', ...changes })
const quotes = (rates = {}) => ({ DOGE: { rates: { RUB: 8.12345678, USD: 0.12345678, BYN: 0.4, EUR: 0.11, ...rates }, receivedAt: 1700000000000 } })

test('1000 DOGE is a coin quantity and raw unit price is multiplied before rounding', () => {
  const { items, summary } = buildPortfolio([], [holding()], quotes(), 'USD')
  assert.equal(items.length, 1)
  assert.equal(items[0].quantity, 1000)
  assert.equal(items[0].unitPrice, 0.12345678)
  assert.equal(items[0].balance, 123.46)
  assert.equal(items[0].receivedAt, 1700000000000)
  assert.equal(summary.total, 123.46)
  assert.equal(summary.incomplete, false)
  assert.equal(summary.count, 1)
  assert.equal(summary.byCategory.find((item) => item.id === 'crypto').balance, 123.46)
  assert.equal(buildPortfolio([], [holding()], quotes({ USD: 0.001005 }), 'USD').summary.total, 1.01)
  assert.equal(buildPortfolio([], [holding({ quantity: 1e-3 })], quotes({ USD: 5 }), 'USD').summary.total, 0.01)
})

test('a holding is valued once in the selected currency alongside matching fixed accounts', () => {
  const fixedAccounts = [fixed(), fixed({ id: 'cash-usd', balance: 20, currency: 'USD' })]
  const rub = buildPortfolio(fixedAccounts, [holding()], quotes(), 'RUB')
  const usd = buildPortfolio(fixedAccounts, [holding()], quotes(), 'USD')
  assert.equal(rub.summary.total, 8223.46)
  assert.equal(usd.summary.total, 143.46)
  assert.equal(rub.items.length, 2)
  assert.equal(usd.items.length, 2)
  assert.equal(rub.summary.otherCurrencyCount, 1)
  assert.equal(usd.summary.otherCurrencyCount, 1)
  assert.equal(rub.items.filter((item) => item.symbol === 'DOGE').length, 1)
  assert.equal(usd.items.filter((item) => item.symbol === 'DOGE').length, 1)
})

test('missing or invalid quote retains the holding and marks the total incomplete', () => {
  for (const price of [undefined, null, '', '0.1', 0, -1, NaN, Infinity]) {
    const { items, summary } = buildPortfolio([fixed()], [holding()], quotes({ RUB: price }), 'RUB')
    assert.equal(items.length, 2)
    assert.equal(items[1].quantity, 1000)
    assert.equal(items[1].balance, null)
    assert.equal(summary.total, null)
    assert.equal(summary.knownTotal, 100)
    assert.equal(summary.incomplete, true)
    assert.equal(summary.missingCount, 1)
  }
  const unavailable = buildPortfolio([], [holding()], {}, 'RUB')
  assert.equal(unavailable.items[0].unitPrice, null)
  assert.equal(unavailable.items[0].receivedAt, null)
  assert.equal(unavailable.summary.total, null)
})

test('unsafe dynamic valuation remains unavailable instead of overflowing monetary totals', () => {
  const oversized = buildPortfolio([], [holding()], quotes({ RUB: 1e20 }), 'RUB')
  assert.equal(oversized.items[0].balance, null)
  assert.equal(oversized.summary.incomplete, true)
  const overflowingSum = buildPortfolio([fixed({ balance: 60000000000000 })], [holding()], quotes({ RUB: 60000000000 }), 'RUB')
  assert.equal(overflowingSum.items[1].balance, null)
  assert.equal(overflowingSum.summary.knownTotal, 60000000000000)
  assert.equal(overflowingSum.summary.total, null)
})

test('crypto category includes fixed crypto balances once and other categories exclude holdings', () => {
  const fixedAccounts = [fixed(), fixed({ id: 'exchange', category: 'crypto', balance: 10 })]
  const crypto = buildPortfolio(fixedAccounts, [holding()], quotes(), 'RUB', 'crypto')
  const cash = buildPortfolio(fixedAccounts, [holding()], {}, 'RUB', 'cash')
  assert.equal(crypto.summary.total, 8133.46)
  assert.equal(crypto.summary.count, 2)
  assert.equal(cash.summary.total, 100)
  assert.equal(cash.summary.incomplete, false)
  assert.equal(cash.items.length, 1)
})

test('separate wallets may contain the same coin without duplicate currency valuations', () => {
  const positions = [holding({ id: 'wallet-a', quantity: 0.125 }), holding({ id: 'wallet-b', quantity: 0.875 })]
  const result = buildPortfolio([], positions, quotes({ USD: 2 }), 'USD')
  assert.equal(result.items.length, 2)
  assert.equal(result.summary.total, 2)
  assert.equal(result.items[0].quantity, 0.125)
  assert.equal(result.items[0].balance, 0.25)
})

test('holding code data is validated before publication', () => {
  assert.equal(validateCryptoHoldings(cryptoHoldings).length, cryptoHoldings.length)
  for (const quantity of [null, '1000', 0, -1, Infinity, NaN]) {
    assert.throws(() => validateCryptoHoldings([holding({ quantity })]), TypeError)
  }
  assert.throws(() => validateCryptoHoldings(null), TypeError)
  assert.throws(() => validateCryptoHoldings([null]), TypeError)
  assert.throws(() => validateCryptoHoldings([holding({ name: '' })]), TypeError)
  assert.throws(() => validateCryptoHoldings([holding({ symbol: 'doge' })]), TypeError)
  assert.throws(() => validateCryptoHoldings([holding({ symbol: 'ABCDEFGHIJKLM' })]), TypeError)
  assert.throws(() => validateCryptoHoldings([holding(), holding({ id: ' dogecoin ' })]), TypeError)
  for (const currency of ['RUB', 'BYN', 'USD', 'EUR']) {
    assert.doesNotThrow(() => buildPortfolio(accounts, cryptoHoldings, {}, currency))
  }
  assert.throws(() => buildPortfolio([], [], {}, 'JPY'), RangeError)
  assert.throws(() => buildPortfolio([], [], {}, 'RUB', 'unknown'), RangeError)
  assert.throws(() => buildPortfolio([fixed({ id: 'crypto:dogecoin' })], [holding()], quotes(), 'RUB'), TypeError)
})
