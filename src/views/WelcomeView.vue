<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="welcome-page" tabindex="-1">
    <section aria-labelledby="page-title">
      <h1 id="page-title">Для моей любимой кошки</h1>
      <p>Тут будет учёт наших финансов.</p>
      <RouterLink class="paw-button" :to="{ name: 'finances' }">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <ellipse cx="5" cy="9" rx="2.1" ry="2.8" transform="rotate(-25 5 9)" />
          <ellipse cx="9.5" cy="5.5" rx="2" ry="2.7" transform="rotate(-8 9.5 5.5)" />
          <ellipse cx="14.5" cy="5.5" rx="2" ry="2.7" transform="rotate(8 14.5 5.5)" />
          <ellipse cx="19" cy="9" rx="2.1" ry="2.8" transform="rotate(25 19 9)" />
          <path d="M6 17.5c0-2 2-3 3-5a3.5 3.5 0 0 1 6 0c1 2 3 3 3 5 0 2.5-2.5 3.5-6 2-3.5 1.5-6 .5-6-2Z" />
        </svg>
        нажми лапкой
      </RouterLink>
    </section>
  </main>
</template>
