<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main tabindex="-1">
    <section aria-labelledby="finances-title">
      <h1 id="finances-title">Наши финансы</h1>
      <p>Здесь будем вести учёт наших доходов и расходов.</p>
      <RouterLink class="back-link" :to="{ name: 'welcome' }">К посвящению</RouterLink>
    </section>
  </main>
</template>
