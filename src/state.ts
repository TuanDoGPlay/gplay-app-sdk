import type { ProjectConfigData } from '@/types'

let _config: ProjectConfigData | null = null;

export function setProjectConfig(config: ProjectConfigData) {
  _config = config ?? {};
  console.log("Project config set:", _config);
}

export function getProjectConfig(): ProjectConfigData | null {
  console.log("Project config get:")
  return _config;
}

export function requireProjectConfig(): ProjectConfigData {
  console.log("Project config require:",_config)
  if (!_config) {
    throw new Error("Config not set. Call init() first.");
  }
  return _config;
}

export function clearProjectConfig() {
  _config = null;
}
