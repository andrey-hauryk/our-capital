import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCOUNTS_STORAGE_KEY, summarizeAccounts, validateAccount } from '../src/composables/useAccounts.js'

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

test('validation handles localized amounts and rejects invalid balances or categories', () => {
  assert.deepEqual(validateAccount(account({ name: '  Копилка  ', balance: '12,34' })).account, {
    name: 'Копилка', category: 'securities', balance: 12.34, currency: 'RUB',
  })
  for (const balance of ['', null, undefined, -1, Infinity, NaN, 'abc', 1.234, Number.MAX_SAFE_INTEGER]) {
    assert.equal(validateAccount(account({ balance })).valid, false, `accepted invalid balance: ${balance}`)
  }
  assert.equal(validateAccount(account({ category: 'unknown' })).valid, false)
  assert.equal(validateAccount(account({ currency: 'JPY' })).valid, false)
  assert.equal(validateAccount(account({ name: ' ' })).valid, false)
  assert.equal(validateAccount(account({ balance: 0 })).valid, true)
})

test('storage mutations preserve existing data and remain transactional', async (context) => {
  const originalWindow = globalThis.window
  let moduleIndex = 0
  const setup = async (initial, failWrite = false) => {
    let raw = initial
    let writes = 0
    globalThis.window = {
      localStorage: {
        getItem(key) { assert.equal(key, ACCOUNTS_STORAGE_KEY); return raw },
        setItem(key, value) {
          assert.equal(key, ACCOUNTS_STORAGE_KEY)
          if (failWrite) throw new Error('Quota exceeded')
          writes++
          raw = value
        },
      },
      addEventListener() {},
    }
    const module = await import(`../src/composables/useAccounts.js?storage-test=${moduleIndex++}`)
    return { store: module.useAccounts(), getRaw: () => raw, getWrites: () => writes }
  }

  try {
    await context.test('malformed storage is preserved and cannot be silently overwritten', async () => {
      const { store, getRaw, getWrites } = await setup('{broken json')
      assert.match(store.storageError.value, /Исходные данные сохранены/)
      assert.equal(store.addAccount(account()).ok, false)
      assert.equal(getRaw(), '{broken json')
      assert.equal(getWrites(), 0)
    })

    await context.test('invalid existing records are preserved', async () => {
      const raw = JSON.stringify([account({ balance: -1 })])
      const { store, getRaw } = await setup(raw)
      assert.equal(store.addAccount(account()).ok, false)
      assert.equal(getRaw(), raw)
    })

    await context.test('failed write does not add an account or remove an existing one', async () => {
      const raw = JSON.stringify([account()])
      const { store, getRaw } = await setup(raw, true)
      assert.equal(store.addAccount(account({ name: 'Ещё один' })).ok, false)
      assert.equal(store.accounts.value.length, 1)
      assert.equal(store.removeAccount('account-1').ok, false)
      assert.equal(store.accounts.value.length, 1)
      assert.equal(getRaw(), raw)
    })

    await context.test('successful changes persist and aggregate without mixing currencies', async () => {
      const { store, getRaw } = await setup(null)
      const added = store.addAccount(account({ currency: 'BYN', category: 'cash', balance: '15,50' }))
      assert.equal(added.ok, true)
      assert.equal(store.accounts.value.length, 1)
      assert.equal(store.getOverview('BYN').total, 15.5)
      assert.equal(store.getOverview('RUB').total, 0)
      assert.equal(JSON.parse(getRaw())[0].id, added.account.id)
      assert.equal(store.removeAccount(added.account.id).ok, true)
      assert.equal(store.accounts.value.length, 0)
      assert.deepEqual(JSON.parse(getRaw()), [])
    })
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
