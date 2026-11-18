import { computed, toValue } from 'vue'
import { cryptoHoldings } from '../data/crypto.js'
import { buildPortfolio } from '../portfolio.js'
import { useAccounts } from './useAccounts.js'
import { useCryptoQuotes } from './useCryptoQuotes.js'

export function usePortfolio(currency, category = null) {
  const { accounts } = useAccounts()
  const { quotes } = useCryptoQuotes()
  const portfolio = computed(() => buildPortfolio(accounts.value, cryptoHoldings, quotes.value, toValue(currency), toValue(category)))

  return {
    items: computed(() => portfolio.value.items),
    summary: computed(() => portfolio.value.summary),
    hasCrypto: computed(() => portfolio.value.items.some((item) => item.symbol)),
  }
}
