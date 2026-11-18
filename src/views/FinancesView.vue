<script setup>
import { provide, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { CURRENCIES, useAccounts } from '../composables/useAccounts'
import { assetGroups } from '../finance'
import AccountDialog from '../components/AccountDialog.vue'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const selectedCurrency = ref('RUB')
const accountDialog = ref(null)
const { storageError, retryStorage } = useAccounts()
const navigation = [{ id: 'overview', label: 'Обзор', shortLabel: 'Обзор', route: 'finances', icon: 'overview' }, ...assetGroups]

function openAccountDialog(category = route.meta.category || 'securities') {
  accountDialog.value.open(category, selectedCurrency.value)
}

function accountSaved(account) {
  selectedCurrency.value = account.currency
  if (route.meta.section !== 'overview') {
    router.push({ name: { securities: 'securities', iis: 'iis', crypto: 'crypto', cash: 'savings' }[account.category] })
  }
}

provide('selectedCurrency', selectedCurrency)
provide('openAccountDialog', openAccountDialog)
</script>

<template>
  <div class="finance-app">
    <aside class="sidebar">
      <RouterLink class="brand-link" :to="{ name: 'finances' }"><AppIcon name="heart" /><span><span class="brand-name">Наш капитал</span><small class="brand-caption">Для нас двоих</small></span></RouterLink>
      <nav class="desktop-nav" aria-label="Разделы финансов">
        <RouterLink v-for="item in navigation" :key="item.id" :to="{ name: item.route }" class="nav-link" :class="{ 'is-active': route.meta.section === item.id }" :aria-current="route.meta.section === item.id ? 'page' : undefined"><AppIcon class="nav-icon" :name="item.icon" /><span>{{ item.label }}</span></RouterLink>
      </nav>
      <div class="sidebar-footer"><RouterLink class="dedication-link" :to="{ name: 'welcome' }"><AppIcon name="heart" />К посвящению</RouterLink><p class="storage-caption">С любовью, для нашего будущего.</p></div>
    </aside>
    <div class="workspace">
      <header class="workspace-header">
        <RouterLink class="workspace-label" :to="{ name: 'welcome' }" aria-label="К посвящению"><AppIcon name="heart" /><span>Для нас двоих</span></RouterLink>
        <div class="workspace-actions"><label class="currency-picker"><span class="currency-label">Валюта</span><select v-model="selectedCurrency" aria-label="Валюта сводки"><option v-for="currency in CURRENCIES" :key="currency" :value="currency">{{ currency }}</option></select><AppIcon name="chevron" /></label></div>
      </header>
      <main id="finance-content" class="dashboard-main" tabindex="-1">
        <div v-if="storageError" class="storage-alert" role="alert"><p>{{ storageError }}</p><button class="text-button" type="button" @click="retryStorage">Попробовать снова</button></div>
        <RouterView />
      </main>
    </div>
    <nav class="mobile-nav" aria-label="Разделы финансов">
      <RouterLink v-for="item in navigation" :key="item.id" :to="{ name: item.route }" class="mobile-nav-link" :class="{ 'is-active': route.meta.section === item.id }" :aria-label="item.label" :aria-current="route.meta.section === item.id ? 'page' : undefined"><AppIcon :name="item.icon" /><span>{{ item.shortLabel }}</span></RouterLink>
    </nav>
    <AccountDialog ref="accountDialog" @saved="accountSaved" />
  </div>
</template>
