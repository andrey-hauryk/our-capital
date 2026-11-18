<script setup>
import { computed } from 'vue'
import { useCryptoQuotes } from '../composables/useCryptoQuotes.js'

const { quotes, loading, error, refresh } = useCryptoQuotes()
const updatedAt = computed(() => {
  const times = Object.values(quotes.value).map((quote) => quote.receivedAt)
  return times.length ? Math.min(...times) : null
})
const updatedTime = computed(() => updatedAt.value ? new Date(updatedAt.value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '')
</script>

<template>
  <div class="quote-status" :class="{ 'quote-status-error': error }">
    <p role="status">
      <template v-if="error && updatedAt">Курс не обновился. Последние данные получены в {{ updatedTime }}.</template>
      <template v-else-if="error">Курс недоступен. Стоимость крипты пока не рассчитана.</template>
      <template v-else-if="loading && !updatedAt">Получаем курс DOGE…</template>
      <template v-else-if="updatedAt"><a href="https://www.coinbase.com/price/dogecoin" target="_blank" rel="noopener noreferrer">Курс Coinbase</a> · получен в {{ updatedTime }} · обновление раз в минуту.</template>
    </p>
    <button v-if="error" type="button" class="quote-retry" :disabled="loading" @click="refresh">{{ loading ? 'Обновляем…' : 'Повторить' }}</button>
  </div>
</template>
