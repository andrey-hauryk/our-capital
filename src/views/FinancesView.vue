<script setup>
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { assetGroups, CURRENCIES } from '../finance'
import { useCryptoQuotes } from '../composables/useCryptoQuotes'
import { useSecuritiesQuotes } from '../composables/useSecuritiesQuotes'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const selectedCurrency = ref('RUB')
const { start, stop } = useCryptoQuotes()
const { start: startSecurities, stop: stopSecurities } = useSecuritiesQuotes()
const navigation = [{ id: 'overview', label: 'Обзор', shortLabel: 'Обзор', route: 'finances', icon: 'overview' }, ...assetGroups]

provide('selectedCurrency', selectedCurrency)
onMounted(() => { start(); startSecurities() })
onUnmounted(() => { stop(); stopSecurities() })
</script>

<template>
  <div class="finance-app">
    <aside class="sidebar">
      <RouterLink class="brand-link" :to="{ name: 'finances' }"><AppIcon name="heart" /><span class="brand-name">Наш капитал</span></RouterLink>
      <nav class="desktop-nav" aria-label="Разделы финансов">
        <RouterLink v-for="item in navigation" :key="item.id" :to="{ name: item.route }" class="nav-link" :class="{ 'is-active': route.meta.section === item.id }" :aria-current="route.meta.section === item.id ? 'page' : undefined"><AppIcon class="nav-icon" :name="item.icon" /><span>{{ item.label }}</span></RouterLink>
      </nav>
      <div class="sidebar-footer"><RouterLink class="dedication-link" :to="{ name: 'welcome' }"><AppIcon name="heart" />К посвящению</RouterLink></div>
    </aside>
    <div class="workspace">
      <header class="workspace-header">
        <RouterLink class="workspace-label" :to="{ name: 'welcome' }" aria-label="К посвящению"><AppIcon name="heart" /><span>Для нас двоих</span></RouterLink>
        <div class="workspace-actions"><label class="currency-picker"><span class="currency-label">Валюта</span><select v-model="selectedCurrency" aria-label="Валюта сводки"><option v-for="currency in CURRENCIES" :key="currency" :value="currency">{{ currency }}</option></select><AppIcon name="chevron" /></label></div>
      </header>
      <main id="finance-content" class="dashboard-main" tabindex="-1">
        <RouterView />
      </main>
    </div>
    <nav class="mobile-nav" aria-label="Разделы финансов">
      <RouterLink v-for="item in navigation" :key="item.id" :to="{ name: item.route }" class="mobile-nav-link" :class="{ 'is-active': route.meta.section === item.id }" :aria-label="item.label" :aria-current="route.meta.section === item.id ? 'page' : undefined"><AppIcon :name="item.icon" /><span>{{ item.shortLabel }}</span></RouterLink>
    </nav>
  </div>
</template>
