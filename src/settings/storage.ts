import { gmGetValue, gmSetValue } from '../shared/gm';
import { logger } from '../shared/logger';
import { type Settings, DEFAULT_SETTINGS } from './schema';

let settingsCache: Settings | null = null;

export function getSetting(key: string, defaultValue = ''): string {
  try {
    return gmGetValue(key, defaultValue);
  } catch (e) {
    logger.warn(`读取设置 ${key} 失败:`, e);
    return defaultValue;
  }
}

export function setSetting(key: string, value: string): void {
  try {
    gmSetValue(key, value);
  } catch (e) {
    logger.warn(`保存设置 ${key} 失败:`, e);
  }
  invalidateSettingsCache();
}

export function getJsonSetting<T>(key: string, defaultValue: T): T {
  try {
    const raw = gmGetValue(key, '');
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setJsonSetting<T>(key: string, value: T): void {
  try {
    gmSetValue(key, JSON.stringify(value));
  } catch (e) {
    logger.warn(`保存 JSON 设置 ${key} 失败:`, e);
  }
  invalidateSettingsCache();
}

function loadSettingsFromStorage(): Settings {
  const result: Record<string, unknown> = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    const raw = getSetting(key, '');
    if (raw === '') {
      result[key] = defaultValue;
      continue;
    }
    const type = typeof defaultValue;
    if (type === 'boolean') {
      result[key] = raw === 'true';
    } else if (type === 'number') {
      const n = Number(raw);
      result[key] = Number.isFinite(n) ? n : (defaultValue as number);
    } else if (type === 'object') {
      try {
        result[key] = JSON.parse(raw);
      } catch {
        result[key] = defaultValue;
      }
    } else {
      result[key] = raw;
    }
  }
  return result as unknown as Settings;
}

export function loadAllSettings(): Settings {
  if (!settingsCache) {
    settingsCache = loadSettingsFromStorage();
  }
  return settingsCache;
}

export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const dv = DEFAULT_SETTINGS[key];
  const type = typeof dv;
  let stored: string;
  if (type === 'boolean') {
    stored = value ? 'true' : 'false';
  } else if (type === 'number') {
    stored = String(value);
  } else if (type === 'object') {
    stored = JSON.stringify(value);
  } else {
    stored = value as string;
  }
  try {
    gmSetValue(key as string, stored);
  } catch (e) {
    logger.warn(`保存设置 ${key} 失败:`, e);
  }
  if (!settingsCache) {
    settingsCache = loadSettingsFromStorage();
  }
  settingsCache[key] = value;
}

export function invalidateSettingsCache(): void {
  settingsCache = null;
}
