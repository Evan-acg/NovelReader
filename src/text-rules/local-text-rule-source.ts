import type { TextRule } from './text-rule-types';
import { validateTextRule } from './text-rule-validator';
import { getJsonSetting } from '../settings/storage';
import { KEYS } from '../settings/schema';
import { logger } from '../shared/logger';

export function loadCustomReplaceRules(): TextRule[] {
  const raw = getJsonSetting<unknown[]>(KEYS.customReplaceRules, []);
  if (!Array.isArray(raw)) return [];

  const valid: TextRule[] = [];
  for (const item of raw) {
    const result = validateTextRule(item);
    if (result.success) {
      valid.push(result.value);
    } else {
      logger.warn('自定义文本规则校验失败:', result.error.message);
    }
  }
  return valid;
}
