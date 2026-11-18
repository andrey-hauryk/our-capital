import { computed, toValue } from 'vue'
import { cryptoHoldings } from '../data/crypto.js'
import { securitiesHoldings } from '../data/securities.js'
import { buildPortfolio } from '../portfolio.js'
import { useAccounts } from './useAccounts.js'
import { useCryptoQuotes } from './useCryptoQuotes.js'
import { useSecuritiesQuotes } from './useSecuritiesQuotes.js'

export function usePortfolio(currency, category = null) {
  const { accounts } = useAccounts()
  const { quotes } = useCryptoQuotes()
  const { quotes: securitiesQuotes } = useSecuritiesQuotes()
  const portfolio = computed(() => buildPortfolio(accounts.value, cryptoHoldings, quotes.value, toValue(currency), toValue(category), securitiesHoldings, securitiesQuotes.value))

  return {
    items: computed(() => portfolio.value.items),
    summary: computed(() => portfolio.value.summary),
    hasCrypto: computed(() => portfolio.value.items.some((item) => item.assetType === 'crypto')),
    hasSecurities: computed(() => portfolio.value.items.some((item) => item.assetType === 'security')),
  }
}
