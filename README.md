# Our Capital

Небольшое приложение на Vue 3 и Vite с публикацией в GitHub Pages.

## Локальный запуск

Нужен Node.js 24 (версия указана в `.nvmrc`).

```sh
npm ci
npm run dev
```

## Сборка

```sh
npm run build
npm run preview
```

Готовый сайт находится в `dist/`. Приложение использует базовый путь `/our-capital/`,
поэтому локальная версия также открывается по этому пути.

## GitHub Pages

Workflow `.github/workflows/deploy.yml` собирает приложение при каждом push в
`main`. Если GitHub Pages включён, workflow также публикует сайт. Пока Pages
выключен, сборка выполняется, а публикация пропускается. Workflow также можно
запустить вручную через вкладку Actions.

В настройках репозитория **Settings → Pages → Build and deployment → Source**
должен быть выбран **GitHub Actions**. Для Pages из приватного репозитория нужен
подходящий платный план GitHub; на GitHub Free репозиторий должен быть публичным.

Ожидаемый адрес после успешного деплоя:
<https://andrey-hauryk.github.io/our-capital/>.

При переименовании репозитория обновите `base` в `vite.config.js`, ссылку на GitHub
в `src/App.vue` и адрес сайта в этом файле.

Документация: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages),
[GitHub: custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
