<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="finance-page" tabindex="-1">
    <section class="finance-overview" aria-labelledby="finances-title">
      <h1 id="finances-title">Наши финансы</h1>

      <ul class="category-list" aria-label="Категории финансов">
        <li class="category-card">
          <h2>Ценные бумаги</h2>
          <ul class="subcategory-list">
            <li>Ценные бумаги</li>
            <li>ИИС</li>
          </ul>
        </li>
        <li class="category-card">
          <h2>Крипта</h2>
        </li>
        <li class="category-card">
          <h2>Наличные / накопления</h2>
        </li>
      </ul>

      <RouterLink class="back-link" :to="{ name: 'welcome' }">К посвящению</RouterLink>
    </section>
  </main>
</template>
