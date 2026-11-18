<script setup>
import AppIcon from './AppIcon.vue'
import { categoryLabels, formatMoney } from '../finance'

defineProps({
  accounts: { type: Array, required: true },
  title: { type: String, default: 'Наши счета' },
  emptyTitle: { type: String, default: 'Начнём с первого счёта' },
  emptyDescription: { type: String, default: 'Добавьте текущий остаток — и общая картина появится здесь.' },
})
defineEmits(['add'])
</script>

<template>
  <section class="panel accounts-panel" aria-labelledby="accounts-title">
    <header class="panel-heading">
      <div class="panel-title">
        <h2 id="accounts-title">{{ title }}</h2>
        <span class="count-badge">{{ accounts.length }}</span>
      </div>
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
    <div v-else class="accounts-empty">
      <span class="empty-icon"><AppIcon name="wallet" /></span>
      <h3>{{ emptyTitle }}</h3>
      <p>{{ emptyDescription }}</p>
      <button class="secondary-button" type="button" @click="$emit('add')">Добавить счёт</button>
    </div>
    <p class="account-storage-note">Счета хранятся только в этом браузере.</p>
  </section>
</template>
