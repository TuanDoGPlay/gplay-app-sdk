import './assets/styles/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router, { addRoutes, assignHome } from './router'
import type { RouteRecordRaw } from 'vue-router'
import { initMax } from './common/applovin'
import { initAppsFlyer } from './common/appsflyer'
import type { RouterConfig } from '@/types/router'
import { requireProjectConfig } from '@/state'
import { initFirebase } from './common/firebase'

export async function runApp() {
  const app = createApp(App)
  await initMax()
  await initAppsFlyer()
  await initFirebase()

  const config = requireProjectConfig()
  document.documentElement.style.setProperty('--background', config.color.background)
  document.documentElement.style.setProperty('--primary-text', config.color.primaryText)
  assignHome(config.defaultScreen.home)
  if (config.additionalRouter) {
    const routes: RouteRecordRaw[] = config.additionalRouter?.map((item: RouterConfig) => {
      return {
        name: item.name,
        path: item.path,
        component: item.component,
      }
    })
    addRoutes(routes)
  }

  app.use(router)
  app.mount('#app')
}
