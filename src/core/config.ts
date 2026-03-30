import { createConfigManager } from '@magicpro97/forge-core';
import type { MonForgeConfig, ProviderConfig } from '../types/index.js';

const DEFAULT_PROVIDER: ProviderConfig = {
  enabled: false,
};

const DEFAULT_CONFIG: MonForgeConfig = {
  providers: {
    sentry: { ...DEFAULT_PROVIDER },
    crashlytics: { ...DEFAULT_PROVIDER },
    appstore: { ...DEFAULT_PROVIDER },
    playstore: { ...DEFAULT_PROVIDER },
  },
  defaults: {
    errorLimit: 10,
    reviewLimit: 20,
    reportFormat: 'md',
  },
  alerts: [],
};

const configManager = createConfigManager({
  toolName: 'monforge',
  defaultConfig: DEFAULT_CONFIG as MonForgeConfig & Record<string, unknown>,
});

export const loadConfig = configManager.loadConfig as () => MonForgeConfig;
export const saveConfig = configManager.saveConfig as (config: MonForgeConfig) => void;
export const getConfigValue = configManager.getConfigValue;
export const setConfigValue = configManager.setConfigValue;
export const getConfigFilePath = configManager.getConfigFilePath;
export const getConfigDir = configManager.getConfigDir;

export function normalizeKey(key: string): string {
  // Shorthand: "sentry.authToken" → "providers.sentry.authToken"
  const providerNames = ['sentry', 'crashlytics', 'appstore', 'playstore'];
  const first = key.split('.')[0];
  if (providerNames.includes(first)) {
    return `providers.${key}`;
  }
  return key;
}
