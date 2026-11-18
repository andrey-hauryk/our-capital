import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import WelcomeView from './views/WelcomeView.vue'
import FinancesView from './views/FinancesView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: WelcomeView,
      meta: { title: 'Для моей любимой кошки' },
    },
    {
      path: '/finances',
      name: 'finances',
      component: FinancesView,
      meta: { title: 'Наши финансы' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to, from) => {
  document.title = to.meta.title

  if (to.path !== from.path) {
    nextTick(() => document.querySelector('main')?.focus({ preventScroll: true }))
  }
})

export default router
