import type { ProjectConfigData } from '@/types'
import { setProjectConfig } from '@/state.ts'
import { runApp } from '@/main.ts'

export function init(config: ProjectConfigData) {
  setProjectConfig(config)
  runApp().then()
}

export type { ProjectConfigData } from './types/index'
