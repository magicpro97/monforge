import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { MonForgeConfig, ProviderConfig } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.monforge');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function loadConfig(): MonForgeConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const loaded = JSON.parse(raw);
    return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, loaded) as unknown as MonForgeConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: MonForgeConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function setConfigValue(key: string, value: string): void {
  const config = loadConfig();
  const keys = key.split('.');
  let obj: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!obj[k] || typeof obj[k] !== 'object') {
      obj[k] = {};
    }
    obj = obj[k] as Record<string, unknown>;
  }

  const finalKey = keys[keys.length - 1];

  // Handle boolean/number conversion
  if (value === 'true') obj[finalKey] = true;
  else if (value === 'false') obj[finalKey] = false;
  else if (!isNaN(Number(value)) && value.trim() !== '') obj[finalKey] = Number(value);
  else obj[finalKey] = value;

  saveConfig(config);
}

export function getConfigValue(key: string): unknown {
  const config = loadConfig();
  const keys = key.split('.');
  let obj: unknown = config;

  for (const k of keys) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return undefined;
    }
    obj = (obj as Record<string, unknown>)[k];
  }
  return obj;
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function normalizeKey(key: string): string {
  // Shorthand: "sentry.authToken" → "providers.sentry.authToken"
  const providerNames = ['sentry', 'crashlytics', 'appstore', 'playstore'];
  const first = key.split('.')[0];
  if (providerNames.includes(first)) {
    return `providers.${key}`;
  }
  return key;
}
