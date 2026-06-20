import type { SiteRule } from './rule-types';
import { validateSiteRule } from './rule-validator';
import { getJsonSetting } from '../settings/storage';
import { KEYS } from '../settings/schema';
import { logger } from '../shared/logger';

export function loadCustomSiteRules(): SiteRule[] {
  const raw = getJsonSetting<unknown[]>(KEYS.customSiteRules, []);
  if (!Array.isArray(raw)) return [];

  const valid: SiteRule[] = [];
  for (const item of raw) {
    const result = validateSiteRule(item);
    if (result.success) {
      valid.push(result.value);
    } else {
      logger.warn('自定义站点规则校验失败:', result.error.message);
    }
  }
  return valid;
}
