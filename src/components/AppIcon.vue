<script setup>
defineProps({ name: { type: String, default: 'overview' } })

const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  securities: 'M4 3v17h17 M8 14l4-5 4 3 4-7',
  crypto: 'M16 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z M10 8v8 M8 10h3a2 2 0 0 1 0 4H8 M15 4a7 7 0 0 1 4 12',
  wallet: 'M20 8H5a2 2 0 0 1 0-4h13v4 M4 7v12a1 1 0 0 0 1 1h15V8 M20 12h-5v4h5 M17 14h.01',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M6 18 18 6',
  chevron: 'm7 10 5 5 5-5',
}
</script>

<template>
  <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path :d="paths[name] || paths.wallet" />
  </svg>
</template>
