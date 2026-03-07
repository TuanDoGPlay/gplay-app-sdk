import type { AppsFlyerConfig } from './appsflyer'
import type { AppConfig } from './app'
import type { ApplovinConfig } from './applovin'
import type { RouterConfig } from './router'
import type { ServerConfig } from './server'
import type { Component } from 'vue'

export type CaptureAndShareOptions = {
  elementId?: string
  filePrefix?: string
  pixelRatio?: number
  shouldIgnoreAttr?: string // default: data-html2canvas-ignore
}


export type SlideshowVideoOptions = {
  // slideshow
  totalSlides: number
  fps?: number
  secondsPerSlide?: number
  fadeMs?: number

  // capture
  quality?: number
  pixelRatio?: number
  captureSelector?: string // default '#capture-area'
  ignoreAttr?: string // default 'data-html2canvas-ignore'

  // output size (nếu không set sẽ lấy theo frame đầu)
  width?: number
  height?: number

  // canvas background (tránh transparent/đen không kiểm soát)
  background?: string // default '#000'

  // timeouts
  captureTimeoutMs?: number // default 20000
}

export type SlideshowVideoDeps = {
  // ref tới component render offscreen (VD PostShareRenderer)
  captureRef: { value: any | null }

  // callback để app set nội dung slide thứ i (VD set postForShare)
  setSlide: (i: number) => Promise<void> | void

  // progress optional
  onProgress?: (i: number, total: number) => void
}


export interface ProjectConfigData {
  app: AppConfig
  defaultScreen: {
    home: Component
  }
  layout: {
    component?: Component
  }
  appsflyer?: AppsFlyerConfig
  applovin?: ApplovinConfig
  server?: ServerConfig
  additionalRouter?: RouterConfig[]
  color: {
    background: string
    primaryText: string
  }
}
