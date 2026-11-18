<script setup>
import AppIcon from './AppIcon.vue'
import { categoryLabels, formatMoney } from '../finance'

defineProps({
  accounts: { type: Array, required: true },
  title: { type: String, default: 'Наши счета' },
  emptyText: { type: String, default: 'Данных пока нет.' },
})
</script>

<template>
  <section class="panel accounts-panel" aria-labelledby="accounts-title">
    <header class="panel-heading">
      <h2 id="accounts-title">{{ title }}</h2>
    </header>
    <ul v-if="accounts.length" class="account-list" aria-label="Счета">
      <li v-for="account in accounts" :key="account.id" class="account-row">
        <div class="account-identity">
          <span class="account-icon"><AppIcon :name="account.category === 'crypto' ? 'crypto' : account.category === 'cash' ? 'wallet' : 'securities'" /></span>
          <div>
            <span class="account-name">{{ account.name }}</span>
            <span class="account-category">{{ categoryLabels[account.category] }}</span>
          </div>
        </div>
        <strong class="account-balance">{{ formatMoney(account.balance, account.currency) }}</strong>
      </li>
    </ul>
    <p v-else class="accounts-empty">{{ emptyText }}</p>
  </section>
</template>
