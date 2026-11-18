<script setup>
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { summarizeAccounts, useAccounts } from '../composables/useAccounts'
import { categoryLabels, formatMoney } from '../finance'
import AccountsPanel from '../components/AccountsPanel.vue'

const props = defineProps({ category: { type: String, required: true } })
const currency = inject('selectedCurrency')
const { accounts } = useAccounts()
const isSecurities = computed(() => ['securities', 'iis'].includes(props.category))
const title = computed(() => isSecurities.value ? 'Ценные бумаги' : categoryLabels[props.category])
const categoryAccounts = computed(() => accounts.value.filter((account) => account.category === props.category))
const summary = computed(() => summarizeAccounts(categoryAccounts.value, currency.value))
const visibleAccounts = computed(() => categoryAccounts.value.filter((account) => account.currency === currency.value))
</script>

<template>
  <div class="dashboard-page">
    <header class="page-heading"><h1>{{ title }}</h1></header>
    <nav v-if="isSecurities" class="section-tabs" aria-label="Подразделы ценных бумаг"><RouterLink class="section-tab" :class="{ 'is-active': category === 'securities' }" :to="{ name: 'securities' }" :aria-current="category === 'securities' ? 'page' : undefined">Ценные бумаги</RouterLink><RouterLink class="section-tab" :class="{ 'is-active': category === 'iis' }" :to="{ name: 'iis' }" :aria-current="category === 'iis' ? 'page' : undefined">ИИС</RouterLink></nav>
    <div class="category-total panel"><div><span class="metric-label">{{ categoryLabels[category] }} · всего в {{ currency }}</span><strong class="metric-value">{{ formatMoney(summary.total, currency) }}</strong></div><span class="metric-count">Счетов: {{ summary.count }}</span></div>
    <p v-if="summary.otherCurrencyCount" class="currency-note">Счета в других валютах: {{ summary.otherCurrencyCount }}.</p>
    <AccountsPanel :accounts="visibleAccounts" :title="category === 'iis' ? 'Счета ИИС' : 'Счета'" />
  </div>
</template>
