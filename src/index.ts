import type { ProjectConfigData } from '@/types'
import { setProjectConfig } from '@/state.ts'
import { runApp } from '@/main.ts'
import router from '@/router'
import { useRoute, type RouteLocationRaw } from 'vue-router'

import { loadRewardedVideo, showRewardedVideo } from '@/common/applovin.ts'
import { Database } from '@/common/database.ts'
import { type ShowOptions, Toast } from '@capacitor/toast'
import { Capacitor } from '@capacitor/core'

export function init(config: ProjectConfigData) {
  setProjectConfig(config)
  runApp().then()
}

export async function goToRouter(params: RouteLocationRaw) {
  await router.push(params)
}

export function goToHome() {
  router.push({ name: 'home' })
}

export async function showToast(options: ShowOptions) {
  // Kiểm tra nếu nền tảng đang chạy là web
  if (Capacitor.getPlatform() === 'web') {
    // Dùng alert mặc định của trình duyệt cho môi trường web
    alert(options.text)
  } else {
    // Dùng Toast native cho Android/iOS
    await Toast.show(options)
  }
}

export { Database }
export { captureImage } from '@/common/capture.ts'
export { loadRewardedVideo, showRewardedVideo }
export { useRoute }

export type { ProjectConfigData } from './types/index'
