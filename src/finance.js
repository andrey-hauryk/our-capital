export const CURRENCIES = Object.freeze(['RUB', 'BYN', 'USD', 'EUR'])

export const categoryLabels = {
  securities: 'Ценные бумаги',
  iis: 'ИИС',
  crypto: 'Крипта',
  cash: 'Наличные / накопления',
}

export const assetGroups = [
  { id: 'securities', label: 'Ценные бумаги', shortLabel: 'Бумаги', route: 'securities', icon: 'securities', color: '#a94166', categories: ['securities', 'iis'] },
  { id: 'crypto', label: 'Крипта', shortLabel: 'Крипта', route: 'crypto', icon: 'crypto', color: '#bd8aab', categories: ['crypto'] },
  { id: 'cash', label: 'Наличные / накопления', shortLabel: 'Накопления', route: 'savings', icon: 'wallet', color: '#d9bda2', categories: ['cash'] },
]

export function formatMoney(amount, currency) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount)
}
export function formatCoinPrice(amount, currency) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 8,
  }).format(amount)
}

export function formatQuantity(quantity) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(quantity)
}

export function formatShare(share) {
  if (share > 0 && share < 0.1) return '<0,1%'
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(share)}%`
}
