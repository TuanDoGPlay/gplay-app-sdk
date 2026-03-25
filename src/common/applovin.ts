import { Capacitor } from '@capacitor/core'
import { requireProjectConfig } from '@/state'

// ==========================================
// 1. TYPE DEFINITIONS
// ==========================================

export interface AppLovinConfiguration {
  hasUserConsent: boolean
  isAgeRestrictedUser: boolean
  isDoNotSell: boolean
  isTablet: boolean
}

export interface AdViewPosition {
  TOP_CENTER: 'top_center'
  TOP_RIGHT: 'top_right'
  CENTERED: 'centered'
  CENTER_LEFT: 'center_left'
  CENTER_RIGHT: 'center_right'
  BOTTOM_LEFT: 'bottom_left'
  BOTTOM_CENTER: 'bottom_center'
  BOTTOM_RIGHT: 'bottom_right'
}

export interface AdFormat {
  BANNER: 'banner'
  MREC: 'mrec'
}

export interface applovinPlugin {
  VERSION: string
  AdFormat: AdFormat
  AdViewPosition: AdViewPosition

  initialized: boolean
  isTabletValue: boolean | null

  // Initialization
  initialize(sdkKey: string, callback?: (config: AppLovinConfiguration) => void): void

  isInitialized(): boolean

  // General
  isTablet(): boolean | null

  setUserId(userId: string): void

  // Banners
  createBanner(adUnitId: string, bannerPosition: string): void

  setBannerBackgroundColor(adUnitId: string, hexColorCode: string): void

  showBanner(adUnitId: string): void

  hideBanner(adUnitId: string): void

  destroyBanner(adUnitId: string): void

  // MRECs
  createMRec(adUnitId: string, mrecPosition: string): void

  setMRecBackgroundColor(adUnitId: string, hexColorCode: string): void

  showMRec(adUnitId: string): void

  hideMRec(adUnitId: string): void

  destroyMRec(adUnitId: string): void

  // Interstitials
  loadInterstitial(adUnitId: string): void

  isInterstitialReady(adUnitId: string): boolean

  showInterstitial(adUnitId: string, placement?: string | null): void

  // Rewarded
  loadRewardedAd(adUnitId: string): void

  isRewardedAdReady(adUnitId: string): boolean

  showRewardedAd(adUnitId: string, placement?: string | null): void
}

// Khai báo global để TypeScript hiểu window.applovin
declare global {
  interface Window {
    applovin?: applovinPlugin
  }
}

// ==========================================
// 2. CONSTANTS & HELPER
// ==========================================

// Helper: Chờ sự kiện deviceready và trả về object applovin an toàn
const getAppLovin = async (): Promise<applovinPlugin | undefined> => {
  if (window.applovin) return window.applovin

  // Nếu đang chạy trên Web (không phải Native), return undefined ngay
  if (Capacitor.getPlatform() === 'web') {
    console.warn('AppLovin Cordova Plugin không hoạt động trên Web Browser.')
    return undefined
  }

  // Chờ Cordova load xong plugin
  await new Promise<void>((resolve) => {
    document.addEventListener('deviceready', () => resolve(), { once: true })
  })

  return window.applovin
}

function getIds() {
  const cfg = requireProjectConfig()
  const isAndroid = (Capacitor.getPlatform() || '').toUpperCase() === 'ANDROID'
  const applovin = cfg.applovin

  return {
    banner: isAndroid ? applovin?.android?.banner : applovin?.ios?.banner,
    mrec: isAndroid ? applovin?.android?.mrec : applovin?.ios?.mrec,
    rewarded: isAndroid ? applovin?.android?.rewarded : applovin?.ios?.rewarded,
    sdkKey: isAndroid ? applovin?.android?.sdkKey : applovin?.ios?.sdkKey,
  }
}
// ==========================================
// 3. EXPORTED FUNCTIONS
// ==========================================

export async function initMax() {
  const applovin = await getAppLovin()

  if (!applovin) {
    console.error('Không tìm thấy plugin AppLovin. Hãy chắc chắn bạn đang chạy trên thiết bị thật.')
    return
  }
  const { sdkKey } = getIds()
  if (!sdkKey) {
    console.error('SDK_KEY is not defined. Please check your PROJECT_CONFIG.')
    return
  }

  // Check nếu đã init rồi thì thôi
  if (applovin.isInitialized && applovin.isInitialized()) {
    console.log('MAX đã được init trước đó.')
    return
  }

  applovin.initialize(sdkKey, (configuration: any) => {
    console.log('MAX initialized thành công:', configuration)
  })
}

export async function showBanner() {
  const applovin = await getAppLovin()
  if (!applovin) return
  const { banner: BANNER_AD_UNIT_ID } = getIds()
  if (!BANNER_AD_UNIT_ID) {
    console.error('BANNER_AD_UNIT_ID is not defined. Please check your PROJECT_CONFIG.')
    return
  }

  try {
    applovin.createBanner(BANNER_AD_UNIT_ID, applovin.AdViewPosition.BOTTOM_CENTER)
    applovin.setBannerBackgroundColor(BANNER_AD_UNIT_ID, '#000000')
    applovin.showBanner(BANNER_AD_UNIT_ID)
  } catch (e) {
    console.error('Lỗi showBanner:', e)
  }
}

export async function hideBanner() {
  const applovin = await getAppLovin()
  if (!applovin) return
  const { banner: BANNER_AD_UNIT_ID } = getIds()
  if (!BANNER_AD_UNIT_ID) {
    console.error('BANNER_AD_UNIT_ID is not defined. Please check your PROJECT_CONFIG.')
    return
  }

  applovin.hideBanner(BANNER_AD_UNIT_ID)
}

export function getMaxAdHeight(kind: 'banner' | 'mrec'): number {
  if (kind === 'mrec') return 250
  const isTablet = window.applovin?.isTablet() ?? false
  const res = isTablet ? 90 : 50
  console.log('banner ads height:', res)
  return res
}

export async function showMREC() {
  const applovin = await getAppLovin()
  if (!applovin) return
  const { mrec: MREC_AD_UNIT_ID } = getIds()
  if (!MREC_AD_UNIT_ID) {
    console.error('MREC_AD_UNIT_ID is not defined. Please check your PROJECT_CONFIG.')
    return
  }
  console.log('show MREC')
  console.log('MREC đã được hiển thị')
  applovin.createMRec(MREC_AD_UNIT_ID, applovin.AdViewPosition.TOP_CENTER)
  applovin.showMRec(MREC_AD_UNIT_ID)
}

export async function hideMREC() {
  const applovin = await getAppLovin()
  if (!applovin) return
  const { mrec: MREC_AD_UNIT_ID } = getIds()
  if (!MREC_AD_UNIT_ID) {
    console.error('MREC_AD_UNIT_ID is not defined. Please check your PROJECT_CONFIG.')
    return
  }

  // Lưu ý: Dùng hideMRec
  applovin.hideMRec(MREC_AD_UNIT_ID)
}

export async function loadRewardedVideo() {
  const applovin = await getAppLovin()
  if (!applovin) return
  const { rewarded: REWARDED_AD_UNIT_ID } = getIds()
  if (!REWARDED_AD_UNIT_ID) {
    console.error('REWARDED_AD_UNIT_ID is not defined. Please check your PROJECT_CONFIG.')
    return
  }

  applovin.loadRewardedAd(REWARDED_AD_UNIT_ID)
}

export async function showRewardedVideo(onClose: () => void) {
  const applovin = await getAppLovin()
  if (!applovin) return
  const { rewarded: REWARDED_AD_UNIT_ID } = getIds()
  if (!REWARDED_AD_UNIT_ID) {
    console.error('REWARDED_AD_UNIT_ID is not defined. Please check your PROJECT_CONFIG.')
    return
  }

  // Kiểm tra xem đã sẵn sàng chưa để tránh lỗi
  if (applovin.isRewardedAdReady(REWARDED_AD_UNIT_ID)) {
    window.addEventListener('OnRewardedAdReceivedRewardEvent', onClose)
    applovin.showRewardedAd(REWARDED_AD_UNIT_ID)
  } else {
    console.log('Rewarded Video chưa load xong, đang thử load lại...')
    await loadRewardedVideo()
  }
}
