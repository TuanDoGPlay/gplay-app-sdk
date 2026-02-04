import { createRouter, createWebHistory, type RouteComponent, type RouteRecordRaw } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'home' },
    meta: {
      permissions: undefined,
    },
  },
  {
    name: 'root',
    path: '/',
    redirect: { name: 'home' },
    component: AppLayout,
    children: [],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
  linkExactActiveClass: 'active',
})

export function assignHome(component: RouteComponent) {
  router.addRoute('root', {
    name: 'home',
    path: '/',
    component: component,
  })
}

export function addRoutes(routes: Array<RouteRecordRaw>) {
  routes.forEach((route) => router.addRoute('root', route))
}

export default router
