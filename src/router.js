import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import WelcomeView from './views/WelcomeView.vue'
import FinancesView from './views/FinancesView.vue'
import OverviewView from './views/OverviewView.vue'
import CategoryView from './views/CategoryView.vue'

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
      component: FinancesView,
      children: [
        { path: '', name: 'finances', component: OverviewView, meta: { title: 'Обзор · Наш капитал', section: 'overview' } },
        { path: 'securities', name: 'securities', component: CategoryView, props: { category: 'securities' }, meta: { title: 'Ценные бумаги · Наш капитал', section: 'securities', category: 'securities' } },
        { path: 'securities/iis', name: 'iis', component: CategoryView, props: { category: 'iis' }, meta: { title: 'ИИС · Наш капитал', section: 'securities', category: 'iis' } },
        { path: 'crypto', name: 'crypto', component: CategoryView, props: { category: 'crypto' }, meta: { title: 'Крипта · Наш капитал', section: 'crypto', category: 'crypto' } },
        { path: 'savings', name: 'savings', component: CategoryView, props: { category: 'cash' }, meta: { title: 'Наличные / накопления · Наш капитал', section: 'cash', category: 'cash' } },
      ],
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
