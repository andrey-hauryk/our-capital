import assert from 'node:assert/strict'
import test from 'node:test'
import { CURRENCIES, summarizeAccounts, validateAccount, validateAccounts } from '../src/composables/useAccounts.js'
import { accounts as configuredAccounts } from '../src/data/accounts.js'

const account = (changes = {}) => ({ id: 'account-1', name: 'Наш счёт', category: 'securities', balance: 10, currency: 'RUB', ...changes })

test('overview keeps currencies separate and calculates category shares in minor units', () => {
  const result = summarizeAccounts([
    account({ balance: 0.1 }),
    account({ id: 'account-2', category: 'iis', balance: 0.2 }),
    account({ id: 'account-3', category: 'crypto', balance: 900, currency: 'USD' }),
  ], 'RUB')
  assert.equal(result.total, 0.3)
  assert.equal(result.count, 2)
  assert.equal(result.otherCurrencyCount, 1)
  assert.equal(result.byCategory.find((category) => category.id === 'crypto').balance, 0)
  assert.ok(Math.abs(result.byCategory.reduce((sum, category) => sum + category.share, 0) - 100) < 0.000001)
})

test('empty and zero balance overview has no fabricated allocation or invalid percentages', () => {
  assert.equal(summarizeAccounts([], 'EUR').total, 0)
  assert.deepEqual(summarizeAccounts([account({ balance: 0 })], 'RUB').byCategory.map((category) => category.share), [0, 0, 0, 0])
  assert.throws(() => summarizeAccounts([], 'JPY'), RangeError)
  assert.throws(() => summarizeAccounts([account({ balance: Infinity })], 'RUB'), TypeError)
  assert.throws(() => summarizeAccounts([account({ balance: '10' })], 'RUB'), TypeError)
  assert.throws(() => summarizeAccounts([account({ balance: Number.MAX_SAFE_INTEGER })], 'RUB'), RangeError)
  assert.throws(() => summarizeAccounts([account({ balance: 0.001 })], 'RUB'), RangeError)
})

test('code data requires numeric balances, valid categories and currencies', () => {
  assert.deepEqual(validateAccount(account({ name: '  Копилка  ', balance: 12.34 })).account, {
    name: 'Копилка', category: 'securities', balance: 12.34, currency: 'RUB',
  })
  for (const balance of ['', '12.34', '12,34', null, undefined, -1, Infinity, NaN, 'abc', 1.234, Number.MAX_SAFE_INTEGER]) {
    assert.equal(validateAccount(account({ balance })).valid, false, `accepted invalid balance: ${balance}`)
  }
  assert.equal(validateAccount(account({ category: 'unknown' })).valid, false)
  assert.equal(validateAccount(account({ currency: 'JPY' })).valid, false)
  assert.equal(validateAccount(account({ name: ' ' })).valid, false)
  assert.equal(validateAccount(account({ balance: 0 })).valid, true)
})

test('configured accounts are valid before publication', () => {
  const validated = validateAccounts(configuredAccounts)
  assert.equal(validated.length, configuredAccounts.length)
  for (const currency of CURRENCIES) assert.doesNotThrow(() => summarizeAccounts(validated, currency))
})

test('configuration rejects duplicate IDs, incomplete records and unsafe totals', () => {
  assert.throws(() => validateAccounts(null), TypeError)
  assert.throws(() => validateAccounts([account({ id: ' ' })]), TypeError)
  assert.throws(() => validateAccounts([account(), account({ id: ' account-1 ' })]), TypeError)
  assert.throws(() => validateAccounts([account({ name: '' })]), TypeError)
  assert.throws(() => validateAccounts([account({ category: 'unknown' })]), TypeError)
  assert.throws(() => validateAccounts([account({ currency: 'JPY' })]), TypeError)
  assert.throws(() => validateAccounts([account({ balance: '15.50' })]), TypeError)
  assert.throws(() => validateAccounts([
    account({ balance: 60000000000000 }),
    account({ id: 'account-2', balance: 60000000000000 }),
  ]), RangeError)
  assert.deepEqual(validateAccounts([account({ id: ' savings ', name: ' Копилка ' })]), [account({ id: 'savings', name: 'Копилка' })])
})
