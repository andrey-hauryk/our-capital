<script setup>
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { usePortfolio } from '../composables/usePortfolio'
import { assetGroups, formatMoney, formatShare } from '../finance'
import AccountsPanel from '../components/AccountsPanel.vue'
import QuoteStatus from '../components/QuoteStatus.vue'
import SecuritiesQuoteStatus from '../components/SecuritiesQuoteStatus.vue'

const currency = inject('selectedCurrency')
const { items: visibleAccounts, summary, hasCrypto, hasSecurities } = usePortfolio(currency)
const groups = computed(() => assetGroups.map((group) => {
  const categories = summary.value.byCategory.filter((item) => group.categories.includes(item.id))
  const balance = categories.reduce((total, item) => total + Math.round(item.balance * 100), 0) / 100
  return { ...group, balance, share: summary.value.total > 0 ? balance / summary.value.total * 100 : 0 }
}))
const donutStyle = computed(() => {
  if (!summary.value.total) return {}
  let start = 0
  const stops = groups.value.map((group) => {
    const end = start + group.share
    const stop = `${group.color} ${start}% ${end}%`
    start = end
    return stop
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})
</script>

<template>
  <div class="dashboard-page">
    <header class="page-heading">
      <h1>Обзор</h1>
    </header>
    <div class="overview-grid">
      <article class="capital-card" aria-labelledby="capital-title">
        <p id="capital-title" class="card-eyebrow">Всего в {{ currency }}</p>
        <strong class="capital-amount">{{ summary.incomplete ? '—' : formatMoney(summary.total, currency) }}</strong>
        <p class="capital-note">Позиций: {{ summary.count }}<template v-if="summary.incomplete"> · ждём курс</template></p>
      </article>
      <article class="panel distribution-card" aria-labelledby="distribution-title">
        <header class="panel-heading"><h2 id="distribution-title">Распределение</h2></header>
        <div class="distribution-body">
          <div class="donut" :style="donutStyle" aria-hidden="true"><div class="donut-hole"><strong>{{ summary.total ? '100%' : '—' }}</strong></div></div>
          <ul class="distribution-legend" aria-label="Распределение капитала по категориям">
            <li v-for="group in groups" :key="group.id"><RouterLink class="legend-link" :to="{ name: group.route }"><span class="legend-dot" :style="{ backgroundColor: group.color }"></span><span class="legend-label">{{ group.label }}</span><span class="legend-value">{{ summary.total ? formatShare(group.share) : '—' }}</span></RouterLink></li>
          </ul>
        </div>
      </article>
    </div>
    <QuoteStatus v-if="hasCrypto" />
    <SecuritiesQuoteStatus v-if="hasSecurities" :positions="visibleAccounts" />
    <p v-if="summary.otherCurrencyCount" class="currency-note">Счета в других валютах: {{ summary.otherCurrencyCount }}. Выберите валюту вверху.</p>
    <AccountsPanel v-if="visibleAccounts.length" :accounts="visibleAccounts" title="Счета и активы" />
  </div>
</template>
