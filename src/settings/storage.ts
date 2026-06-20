import { gmGetValue, gmSetValue } from '../shared/gm';
import { logger } from '../shared/logger';

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
}
