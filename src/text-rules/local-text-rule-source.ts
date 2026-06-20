import type { TextRule } from './text-rule-types';
import { getJsonSetting } from '../settings/storage';
import { KEYS } from '../settings/schema';

export function loadCustomReplaceRules(): TextRule[] {
  return getJsonSetting<TextRule[]>(KEYS.customReplaceRules, []);
}
