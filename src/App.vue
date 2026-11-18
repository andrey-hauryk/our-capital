<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="page">
    <header class="header">
      <a class="brand" href="./" aria-label="Our Capital — главная">
        <span class="brand-mark" aria-hidden="true">oc.</span>
        <span>Our Capital</span>
      </a>
      <a
        class="source-link"
        href="https://github.com/andrey-hauryk/our-capital"
        target="_blank"
        rel="noopener noreferrer"
      >
        Код на GitHub
      </a>
    </header>

    <main>
      <section class="intro" aria-labelledby="page-title">
        <p class="eyebrow">МЕСТО ДЛЯ НОВЫХ ИДЕЙ</p>
        <h1 id="page-title">Всё начинается<br />с малого<span>.</span></h1>
        <p class="description">
          Это Our Capital. Пока здесь маленькое приложение на Vue —
          и пространство для того, что мы построим дальше.
        </p>

        <div class="demo">
          <div>
            <h2>Первый шаг уже сделан</h2>
            <p>Нажми на кнопку — Vue позаботится об остальном.</p>
          </div>
          <div class="counter">
            <output aria-live="polite" aria-label="Количество нажатий">{{ count }}</output>
            <button type="button" @click="count += 1">Добавить +1</button>
            <button class="reset" type="button" :disabled="count === 0" @click="count = 0">
              Сбросить
            </button>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <span>Our Capital</span>
      <span>Vue 3 <span class="separator">/</span> Vite <span class="separator">/</span> GitHub Pages</span>
    </footer>
  </div>
</template>
