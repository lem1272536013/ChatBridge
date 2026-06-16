import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/embedChatView',
    },
    {
      path: '/embedChatView',
      name: 'embedChatView',
      component: () => import('../views/embedChatView.vue'),
    },
  ],
})

export default router
