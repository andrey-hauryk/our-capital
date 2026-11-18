import { computed, readonly, ref } from 'vue'
import { accounts as configuredAccounts } from '../data/accounts.js'

export const CATEGORY_IDS = Object.freeze(['securities', 'iis', 'crypto', 'cash'])
export const CURRENCIES = Object.freeze(['RUB', 'BYN', 'USD', 'EUR'])
export function validateAccount(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 80) return { valid: false, error: 'Название счёта должно содержать от 1 до 80 символов.' }
  if (!CATEGORY_IDS.includes(input.category)) return { valid: false, error: 'Неизвестная категория счёта.' }
  if (!CURRENCIES.includes(input.currency)) return { valid: false, error: 'Неизвестная валюта счёта.' }

  const balance = input.balance
  const cents = typeof balance === 'number' ? Math.round(balance * 100) : NaN
  if (typeof balance !== 'number' || !Number.isFinite(balance) || balance < 0 || !Number.isSafeInteger(cents) || Math.abs(cents - balance * 100) > 0.000001) {
    return { valid: false, error: 'Остаток должен быть неотрицательным числом, не более двух знаков после запятой.' }
  }

  return { valid: true, account: { name, category: input.category, currency: input.currency, balance: cents / 100 } }
}

export function summarizeAccounts(items, currency) {
  if (!CURRENCIES.includes(currency)) throw new RangeError('Unknown account currency')
  for (const account of items) {
    if (!account || !CATEGORY_IDS.includes(account.category) || !CURRENCIES.includes(account.currency) ||
      typeof account.balance !== 'number' || !Number.isFinite(account.balance) || account.balance < 0) {
      throw new TypeError('Invalid account in overview')
    }
  }
  const selected = items.filter((account) => account.currency === currency)
  const totalCents = sumCents(selected)
  return {
    currency,
    total: totalCents / 100,
    count: selected.length,
    otherCurrencyCount: items.length - selected.length,
    byCategory: CATEGORY_IDS.map((id) => {
      const categoryAccounts = selected.filter((account) => account.category === id)
      const cents = sumCents(categoryAccounts)
      return { id, balance: cents / 100, count: categoryAccounts.length, share: totalCents > 0 ? cents / totalCents * 100 : 0 }
    }),
  }
}

function sumCents(items) {
  return items.reduce((sum, account) => {
    const cents = Math.round(account.balance * 100)
    if (!Number.isSafeInteger(cents) || Math.abs(cents - account.balance * 100) > 0.000001 || !Number.isSafeInteger(sum + cents)) {
      throw new RangeError('Account total is outside the supported precision')
    }
    return sum + cents
  }, 0)
}

export function validateAccounts(items) {
  if (!Array.isArray(items)) throw new TypeError('Список счетов должен быть массивом.')
  const ids = new Set()
  const normalized = items.map((item, index) => {
    const checked = validateAccount(item)
    if (!checked.valid) throw new TypeError(`Счёт ${index + 1}: ${checked.error}`)
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || ids.has(id)) throw new TypeError(`Счёт ${index + 1}: id должен быть непустым и уникальным.`)
    ids.add(id)
    return { id, ...checked.account }
  })
  for (const currency of CURRENCIES) summarizeAccounts(normalized, currency)
  return normalized
}

const accountState = readonly(ref(validateAccounts(configuredAccounts)))
const accounts = computed(() => accountState.value)

export function useAccounts() {
  return {
    accounts,
    getOverview: (currency) => summarizeAccounts(accountState.value, currency),
  }
}
