import './assets/styles/main.css'
import './assets/styles/index.css'
import { createApp } from 'vue'
import App from './App.vue'
import router, { addRoutes, assignHome } from './router'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import type { RouteRecordRaw } from 'vue-router'
import { initMax } from './common/applovin'
import { initAppsFlyer } from './common/appsflyer'
import type { RouterConfig } from '@/types/router'
import { requireProjectConfig } from '@/state'

const checkAndInstallUpdate = async () => {
  const config = requireProjectConfig()

  const REMOTE_BASE_URL = config.server?.remoteBaseUrl ?? 'http://192.168.10.10:8080/'
  const REMOTE_VERSION_URL = REMOTE_BASE_URL + 'version.json'
  try {
    // 1. Local Check
    const localRes = await fetch(`/version.json?t=${Date.now()}`)
    const localData = localRes.ok ? await localRes.json() : { version: '0.0.0' }
    const currentVersion = localData.version
    console.log('Current:', currentVersion)

    // 2. Remote Check
    const remoteRes = await fetch(REMOTE_VERSION_URL)
    if (!remoteRes.ok) return
    const remoteData = await remoteRes.json()
    const latestVersion = remoteData.version
    console.log('fetch latest version:', latestVersion)

    // 3. Compare
    if (latestVersion !== currentVersion) {
      const lastAttempt = localStorage.getItem('last_update_attempt')
      if (lastAttempt === latestVersion) {
        console.warn('Phát hiện vòng lặp update! Version trong gói ZIP chưa được cập nhật file json.')
        return
      }

      console.log(`Downloading ${latestVersion}...`)

      const downloadUrl = REMOTE_BASE_URL + latestVersion + '.zip'

      const versionData = await CapacitorUpdater.download({
        url: downloadUrl,
        version: latestVersion,
      })

      // Đánh dấu là đã thử update lên bản này
      localStorage.setItem('last_update_attempt', latestVersion)

      console.log('Reloading app...')
      await CapacitorUpdater.set(versionData)
    } else {
      // Update thành công hoặc không có update -> Xóa cờ check vòng lặp
      localStorage.removeItem('last_update_attempt')
      console.log('App is up to date.')
    }
  } catch (error) {
    console.error('Update check failed: ', error)
  }
}

export async function runApp() {
  const app = createApp(App)
  initMax().then()
  initAppsFlyer().then()
  CapacitorUpdater.notifyAppReady().then()

  checkAndInstallUpdate().then()
  const config = requireProjectConfig()

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
