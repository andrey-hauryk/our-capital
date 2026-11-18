<script setup>
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { summarizeAccounts, useAccounts } from '../composables/useAccounts'
import { categoryLabels, formatMoney } from '../finance'
import AccountsPanel from '../components/AccountsPanel.vue'
import AppIcon from '../components/AppIcon.vue'

const props = defineProps({ category: { type: String, required: true } })
const currency = inject('selectedCurrency')
const openAccountDialog = inject('openAccountDialog')
const { accounts } = useAccounts()
const isSecurities = computed(() => ['securities', 'iis'].includes(props.category))
const title = computed(() => isSecurities.value ? 'Ценные бумаги' : categoryLabels[props.category])
const descriptions = { securities: 'Брокерские счета и индивидуальные инвестиционные счета.', iis: 'Брокерские счета и индивидуальные инвестиционные счета.', crypto: 'Всё, что хранится на наших биржах и кошельках.', cash: 'Деньги под рукой и накопления на наши планы.' }
const categoryAccounts = computed(() => accounts.value.filter((account) => account.category === props.category))
const summary = computed(() => summarizeAccounts(categoryAccounts.value, currency.value))
const visibleAccounts = computed(() => categoryAccounts.value.filter((account) => account.currency === currency.value))
</script>

<template>
  <div class="dashboard-page">
    <header class="page-heading"><div class="page-title-block"><p class="page-eyebrow">Наши активы</p><h1>{{ title }}</h1><p class="page-description">{{ descriptions[category] }}</p></div><button class="primary-button" type="button" @click="openAccountDialog(category)"><AppIcon name="plus" class="icon-small" />Добавить счёт</button></header>
    <nav v-if="isSecurities" class="section-tabs" aria-label="Подразделы ценных бумаг"><RouterLink class="section-tab" :class="{ 'is-active': category === 'securities' }" :to="{ name: 'securities' }" :aria-current="category === 'securities' ? 'page' : undefined">Ценные бумаги</RouterLink><RouterLink class="section-tab" :class="{ 'is-active': category === 'iis' }" :to="{ name: 'iis' }" :aria-current="category === 'iis' ? 'page' : undefined">ИИС</RouterLink></nav>
    <div class="category-total panel"><div><span class="metric-label">{{ categoryLabels[category] }} · всего в {{ currency }}</span><strong class="metric-value">{{ formatMoney(summary.total, currency) }}</strong></div><span class="metric-count">Счетов: {{ summary.count }}</span></div>
    <p class="currency-note">Только счета в {{ currency }}.<template v-if="summary.otherCurrencyCount"> В других валютах: {{ summary.otherCurrencyCount }}.</template></p>
    <AccountsPanel :accounts="visibleAccounts" :title="category === 'iis' ? 'Счета ИИС' : 'Счета'" :empty-title="`Пока нет счетов в ${currency}`" empty-description="Добавьте счёт и его текущую стоимость, чтобы включить их в общую аналитику." @add="openAccountDialog(category)" />
  </div>
</template>
