import type { AppsFlyerConfig } from './appsflyer'
import type { AppConfig } from './app'
import type { ApplovinConfig } from './applovin'
import type { RouterConfig } from './router'
import type { ServerConfig } from './server'
import type { Component } from 'vue'

export interface ProjectConfigData {
  app: AppConfig
  defaultScreen: {
    home: Component
  }
  navbar: {
    enable: boolean
    component?: Component
    height?: number
  }
  appsflyer?: AppsFlyerConfig
  applovin?: ApplovinConfig
  server?: ServerConfig
  additionalRouter?: RouterConfig[]
}
