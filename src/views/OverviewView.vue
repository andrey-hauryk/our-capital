<script setup>
import { computed, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { useAccounts } from '../composables/useAccounts'
import { assetGroups, formatMoney } from '../finance'
import AccountsPanel from '../components/AccountsPanel.vue'
import AppIcon from '../components/AppIcon.vue'

const currency = inject('selectedCurrency')
const openAccountDialog = inject('openAccountDialog')
const { accounts, getOverview } = useAccounts()
const summary = computed(() => getOverview(currency.value))
const visibleAccounts = computed(() => accounts.value.filter((account) => account.currency === currency.value))
const groups = computed(() => assetGroups.map((group) => {
  const categories = summary.value.byCategory.filter((item) => group.categories.includes(item.id))
  const balance = categories.reduce((total, item) => total + Math.round(item.balance * 100), 0) / 100
  return { ...group, balance, count: categories.reduce((total, item) => total + item.count, 0), share: summary.value.total > 0 ? balance / summary.value.total * 100 : 0 }
}))
const filledGroups = computed(() => groups.value.filter((group) => group.count > 0).length)
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
      <div class="page-title-block"><p class="page-eyebrow">Общая картина</p><h1>Обзор</h1><p class="page-description">Наши накопления и планы — в одном месте.</p></div>
      <button class="primary-button" type="button" @click="openAccountDialog()"><AppIcon name="plus" class="icon-small" />Добавить счёт</button>
    </header>
    <div class="overview-grid">
      <article class="capital-card" aria-labelledby="capital-title">
        <p id="capital-title" class="card-eyebrow">Всего в {{ currency }}</p>
        <strong class="capital-amount">{{ formatMoney(summary.total, currency) }}</strong>
        <p class="capital-note">Только счета в выбранной валюте</p>
        <div class="capital-stats"><div><span>Счетов в {{ currency }}</span><strong>{{ summary.count }}</strong></div><div><span>Категорий</span><strong>{{ filledGroups }} <small>из 3</small></strong></div></div>
      </article>
      <article class="panel distribution-card" aria-labelledby="distribution-title">
        <header class="panel-heading"><h2 id="distribution-title">Распределение</h2></header>
        <div class="distribution-body">
          <div class="donut" :style="donutStyle" aria-hidden="true"><div class="donut-hole"><span>{{ summary.total ? 'Категорий' : 'Пока пусто' }}</span><strong>{{ summary.total ? filledGroups : '♡' }}</strong></div></div>
          <ul class="distribution-legend" aria-label="Распределение капитала по категориям">
            <li v-for="group in groups" :key="group.id"><RouterLink class="legend-link" :to="{ name: group.route }"><span class="legend-dot" :style="{ backgroundColor: group.color }"></span><span class="legend-label">{{ group.label }}<small v-if="group.id === 'securities'" class="legend-meta">Включая ИИС</small></span><span class="legend-value">{{ summary.total ? `${Math.round(group.share)}%` : '—' }}</span></RouterLink></li>
          </ul>
        </div>
      </article>
    </div>
    <p class="currency-note">Суммы разных валют не складываются.<template v-if="summary.otherCurrencyCount"> Счета в других валютах: {{ summary.otherCurrencyCount }}. Выберите валюту вверху.</template></p>
    <AccountsPanel :accounts="visibleAccounts" :empty-title="accounts.length ? `Нет счетов в ${currency}` : 'Начнём с первого счёта'" :empty-description="accounts.length ? 'Выберите другую валюту или добавьте счёт в выбранной.' : 'Добавьте текущий остаток — и общая картина появится здесь.'" @add="openAccountDialog()" />
  </div>
</template>
