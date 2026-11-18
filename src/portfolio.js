import { CATEGORY_IDS, CURRENCIES, summarizeAccounts } from './composables/useAccounts.js'

function decimalParts(value) {
  const [coefficient, exponent = '0'] = value.toString().split('e')
  const fraction = coefficient.split('.')[1] || ''
  return { digits: BigInt(coefficient.replace('.', '')), scale: fraction.length - Number(exponent) }
}

function cryptoValueCents(quantity, price) {
  const amount = decimalParts(quantity)
  const rate = decimalParts(price)
  const product = amount.digits * rate.digits
  const scale = amount.scale + rate.scale - 2
  // Multiply decimal values before rounding to cents, including exact half-cent ties.
  const divisor = scale > 0 ? 10n ** BigInt(scale) : 1n
  const cents = scale > 0 ? (product + divisor / 2n) / divisor : product * 10n ** BigInt(-scale)
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null
}

export function validateCryptoHoldings(items) {
  if (!Array.isArray(items)) throw new TypeError('Список криптовалют должен быть массивом.')
  const ids = new Set()

  return items.map((item, index) => {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    const name = typeof item?.name === 'string' ? item.name.trim() : ''
    if (!id || ids.has(id)) throw new TypeError(`Криптопозиция ${index + 1}: id должен быть непустым и уникальным.`)
    if (!name || name.length > 80) throw new TypeError(`Криптопозиция ${index + 1}: укажите название длиной до 80 символов.`)
    if (typeof item.symbol !== 'string' || !/^[A-Z][A-Z0-9]{1,11}$/.test(item.symbol)) {
      throw new TypeError(`Криптопозиция ${index + 1}: укажите символ монеты в верхнем регистре.`)
    }
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new TypeError(`Криптопозиция ${index + 1}: количество должно быть положительным числом.`)
    }
    ids.add(id)
    return { id, name, symbol: item.symbol, quantity: item.quantity }
  })
}

export function buildPortfolio(fixedAccounts, holdings, quotes, currency, category = null) {
  if (!CURRENCIES.includes(currency)) throw new RangeError('Unknown portfolio currency')
  if (category !== null && !CATEGORY_IDS.includes(category)) throw new RangeError('Unknown portfolio category')
  if (!Array.isArray(fixedAccounts)) throw new TypeError('Список счетов должен быть массивом.')

  const normalizedHoldings = validateCryptoHoldings(holdings)
  const relevantAccounts = fixedAccounts.filter((account) => category === null || account.category === category)
  const selectedAccounts = relevantAccounts.filter((account) => account.currency === currency)
  const fixedSummary = summarizeAccounts(selectedAccounts, currency)
  let totalCents = Math.round(fixedSummary.total * 100)
  const cryptoItems = category !== null && category !== 'crypto' ? [] : normalizedHoldings.map((holding) => {
    const quote = quotes?.[holding.symbol]
    const rawPrice = quote?.rates?.[currency]
    const unitPrice = typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null
    let balance = null

    if (unitPrice !== null) {
      const cents = cryptoValueCents(holding.quantity, unitPrice)
      if (cents !== null && Number.isSafeInteger(totalCents + cents)) {
        balance = cents / 100
        if (Math.abs(cents - balance * 100) <= 0.000001) totalCents += cents
        else balance = null
      }
    }

    return {
      ...holding,
      id: `crypto:${holding.id}`,
      category: 'crypto',
      currency,
      unitPrice,
      receivedAt: unitPrice !== null && typeof quote.receivedAt === 'number' && Number.isFinite(quote.receivedAt) && quote.receivedAt > 0 ? quote.receivedAt : null,
      balance,
    }
  })

  const items = [...selectedAccounts, ...cryptoItems]
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new TypeError('Идентификаторы счетов и криптопозиций должны быть уникальными.')
  }
  const missingCount = cryptoItems.filter((item) => item.balance === null).length
  const knownSummary = summarizeAccounts(items.filter((item) => item.balance !== null), currency)

  return {
    items,
    summary: {
      ...knownSummary,
      total: missingCount ? null : knownSummary.total,
      knownTotal: knownSummary.total,
      incomplete: missingCount > 0,
      count: items.length,
      missingCount,
      otherCurrencyCount: relevantAccounts.length - selectedAccounts.length,
    },
  }
}
