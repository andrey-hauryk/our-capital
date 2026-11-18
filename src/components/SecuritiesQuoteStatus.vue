<script setup>
import { computed } from 'vue'
import { useSecuritiesQuotes } from '../composables/useSecuritiesQuotes.js'

const props = defineProps({ positions: { type: Array, required: true } })
const { quotes, loading, error, refresh } = useSecuritiesQuotes()
const symbols = computed(() => [...new Set(props.positions.filter((item) => item.assetType === 'security').map((item) => item.symbol))])
const relevantQuotes = computed(() => symbols.value.map((symbol) => quotes.value[symbol]).filter(Boolean))
const updatedAt = computed(() => relevantQuotes.value.length ? Math.min(...relevantQuotes.value.map((quote) => quote.receivedAt)) : null)
const updatedTime = computed(() => updatedAt.value ? new Date(updatedAt.value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '')
const isSnapshot = computed(() => relevantQuotes.value.some((quote) => quote.source === 'snapshot'))
const previousSessions = computed(() => symbols.value.filter((symbol) => quotes.value[symbol]?.priceType === 'previous').map((symbol) => `${symbol}: ${quotes.value[symbol].priceDate}`).join(', '))
</script>

<template>
  <div class="quote-status securities-quote-status" :class="{ 'quote-status-error': error }">
    <p role="status">
      <template v-if="error && updatedAt">{{ error }} Данные получены в {{ updatedTime }}.</template>
      <template v-else-if="error">Котировки Мосбиржи недоступны. Количество акций сохранено.</template>
      <template v-else-if="loading && !updatedAt">Получаем котировки Мосбиржи…</template>
      <template v-else-if="updatedAt"><a href="https://www.moex.com/ru/data/" target="_blank" rel="noopener noreferrer">Мосбиржа</a> · задержка биржи 15 минут · {{ isSnapshot ? 'снимок от' : 'получено в' }} {{ updatedTime }}.<template v-if="previousSessions"> Цена предыдущей сессии: {{ previousSessions }}.</template></template>
    </p>
    <button v-if="error" type="button" class="quote-retry" :disabled="loading" @click="refresh">{{ loading ? 'Обновляем…' : 'Повторить' }}</button>
  </div>
</template>
