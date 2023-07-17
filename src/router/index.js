import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'cesium',
      component: () => import('@/views/OpenCesium.vue'),
      children: [
        {
          path: '',
          name: 're',
          redirect: 'rebuild'
        },
        {
          path: 'rebuild',
          name: 'rebuild',
          component: () => import('@/views/AddScheme.vue')
        },
        {
          path: 'scheme',
          name: 'scheme',
          component: () => import('@/views/SchemeList.vue')
        }
      ]
    },
  ]
})

export default router
