import { Capacitor } from '@capacitor/core'
import { type AFInit, AppsFlyer } from 'appsflyer-capacitor-plugin'
import { requireProjectConfig } from '@/state'

export const initAppsFlyer = async () => {
  // 1) Không chạy trên web
  if (!Capacitor.isNativePlatform()) {
    console.log('[AppsFlyer] Skip init on web.')
    return
  }

  const PROJECT_CONFIG = requireProjectConfig()

  // 2) Validate config tối thiểu
  const devKey = PROJECT_CONFIG.appsflyer?.devKey?.trim() ?? ''
  const iosAppId = PROJECT_CONFIG.appsflyer?.iosAppId?.trim() ?? ''

  // devKey là bắt buộc (iOS/Android). appID chỉ bắt buộc cho iOS.
  if (!devKey) {
    console.warn('[AppsFlyer] Missing devKey, skip init.')
    return
  }
  if (Capacitor.getPlatform() === 'ios' && !iosAppId) {
    console.warn('[AppsFlyer] Missing iosAppId on iOS, skip init.')
    return
  }

  const afConfig: AFInit = {
    appID: iosAppId, // iOS only
    devKey,
    isDebug: true,
    waitForATTUserAuthorization: 10, // iOS
    minTimeBetweenSessions: 6,
    registerOnDeepLink: true,
    registerConversionListener: true,
    registerOnAppOpenAttribution: false,
    deepLinkTimeout: 4000,
    useReceiptValidationSandbox: true, // iOS
    useUninstallSandbox: true, // iOS
  }

  try {
    const res = await AppsFlyer.initSDK(afConfig)
    console.log('[AppsFlyer] initSDK OK:', res)
  } catch (e) {
    console.error('[AppsFlyer] initSDK FAILED:', e)
  }
}
