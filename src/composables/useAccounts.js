import { computed, readonly, ref } from 'vue'

export const CATEGORY_IDS = Object.freeze(['securities', 'iis', 'crypto', 'cash'])
export const CURRENCIES = Object.freeze(['RUB', 'BYN', 'USD', 'EUR'])
export const ACCOUNTS_STORAGE_KEY = 'our-capital.accounts.v1'

const accountState = ref([])
const storageError = ref('')
const accounts = computed(() => readonly(accountState.value))
let initialized = false
let storage = null

export function validateAccount(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 80) return { valid: false, error: 'Введите название счёта длиной до 80 символов.' }
  if (!CATEGORY_IDS.includes(input.category)) return { valid: false, error: 'Выберите категорию счёта.' }
  if (!CURRENCIES.includes(input.currency)) return { valid: false, error: 'Выберите валюту счёта.' }

  const rawBalance = typeof input.balance === 'string' ? input.balance.trim().replace(',', '.') : input.balance
  if (rawBalance === '' || (typeof rawBalance !== 'string' && typeof rawBalance !== 'number')) {
    return { valid: false, error: 'Введите сумму на счёте.' }
  }
  const balance = Number(rawBalance)
  const cents = Math.round(balance * 100)
  if (!Number.isFinite(balance) || balance < 0 || !Number.isSafeInteger(cents) || Math.abs(cents - balance * 100) > 0.000001) {
    return { valid: false, error: 'Укажите неотрицательную сумму, не более двух знаков после запятой.' }
  }

  return { valid: true, account: { name, category: input.category, currency: input.currency, balance: cents / 100 } }
}

export function summarizeAccounts(items, currency) {
  if (!CURRENCIES.includes(currency)) throw new RangeError('Unknown account currency')
  for (const account of items) {
    if (!CATEGORY_IDS.includes(account.category) || !CURRENCIES.includes(account.currency) ||
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

function readStoredAccounts(raw) {
  if (raw === null) return []
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Invalid account storage')
  const ids = new Set()
  const restored = parsed.map((item) => {
    const checked = validateAccount(item)
    if (!checked.valid || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) {
      throw new Error('Invalid stored account')
    }
    ids.add(item.id)
    return { id: item.id, ...checked.account }
  })
  for (const currency of CURRENCIES) summarizeAccounts(restored, currency)
  return restored
}

function retryStorage() {
  if (typeof window === 'undefined') return { ok: false, error: 'Хранилище доступно только в браузере.' }
  try {
    storage = window.localStorage
    const raw = storage.getItem(ACCOUNTS_STORAGE_KEY)
    let restored
    try {
      restored = readStoredAccounts(raw)
    } catch {
      storageError.value = 'Не удалось прочитать сохранённые счета. Исходные данные сохранены; новые записи пока заблокированы.'
      return { ok: false, error: storageError.value }
    }
    accountState.value = restored
    storageError.value = ''
    return { ok: true }
  } catch {
    storageError.value = 'Хранилище браузера недоступно. Разрешите локальное хранение и попробуйте снова.'
    return { ok: false, error: storageError.value }
  }
}

function persist(next) {
  try {
    storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next))
    accountState.value = next
    storageError.value = ''
    return { ok: true }
  } catch {
    storageError.value = 'Не удалось сохранить изменения в браузере. Освободите место и попробуйте снова.'
    return { ok: false, error: storageError.value }
  }
}

function addAccount(input) {
  const checked = validateAccount(input)
  if (!checked.valid) return { ok: false, error: checked.error }
  const ready = retryStorage()
  if (!ready.ok) return ready
  const account = { id: globalThis.crypto.randomUUID(), ...checked.account }
  const next = [...accountState.value, account]
  try {
    summarizeAccounts(next, account.currency)
  } catch {
    return { ok: false, error: 'Общая сумма в этой валюте слишком велика. Укажите меньшую сумму.' }
  }
  const result = persist(next)
  return result.ok ? { ok: true, account } : result
}

function removeAccount(id) {
  const ready = retryStorage()
  if (!ready.ok) return ready
  if (!accountState.value.some((account) => account.id === id)) return { ok: false, error: 'Счёт не найден.' }
  return persist(accountState.value.filter((account) => account.id !== id))
}

export function useAccounts() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    retryStorage()
    window.addEventListener?.('storage', (event) => {
      if (event.key === ACCOUNTS_STORAGE_KEY || event.key === null) retryStorage()
    })
  }
  return {
    accounts,
    storageError: readonly(storageError),
    addAccount,
    removeAccount,
    retryStorage,
    getOverview: (currency) => summarizeAccounts(accountState.value, currency),
  }
}
