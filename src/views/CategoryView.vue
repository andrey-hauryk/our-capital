<script setup>
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { usePortfolio } from '../composables/usePortfolio'
import { categoryLabels, formatMoney } from '../finance'
import AccountsPanel from '../components/AccountsPanel.vue'
import QuoteStatus from '../components/QuoteStatus.vue'

const props = defineProps({ category: { type: String, required: true } })
const currency = inject('selectedCurrency')
const { items: visibleAccounts, summary, hasCrypto } = usePortfolio(currency, () => props.category)
const isSecurities = computed(() => ['securities', 'iis'].includes(props.category))
const title = computed(() => isSecurities.value ? 'Ценные бумаги' : categoryLabels[props.category])
</script>

<template>
  <div class="dashboard-page">
    <header class="page-heading"><h1>{{ title }}</h1></header>
    <nav v-if="isSecurities" class="section-tabs" aria-label="Подразделы ценных бумаг"><RouterLink class="section-tab" :class="{ 'is-active': category === 'securities' }" :to="{ name: 'securities' }" :aria-current="category === 'securities' ? 'page' : undefined">Ценные бумаги</RouterLink><RouterLink class="section-tab" :class="{ 'is-active': category === 'iis' }" :to="{ name: 'iis' }" :aria-current="category === 'iis' ? 'page' : undefined">ИИС</RouterLink></nav>
    <div class="category-total panel"><div><span class="metric-label">{{ categoryLabels[category] }} · всего в {{ currency }}</span><strong class="metric-value">{{ summary.incomplete ? '—' : formatMoney(summary.total, currency) }}</strong></div><span class="metric-count">{{ category === 'crypto' ? 'Позиций' : 'Счетов' }}: {{ summary.count }}</span></div>
    <QuoteStatus v-if="hasCrypto" />
    <p v-if="summary.otherCurrencyCount" class="currency-note">Счета в других валютах: {{ summary.otherCurrencyCount }}.</p>
    <AccountsPanel :accounts="visibleAccounts" :title="category === 'crypto' ? 'Монеты' : category === 'iis' ? 'Счета ИИС' : 'Счета'" />
  </div>
</template>
