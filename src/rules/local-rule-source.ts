import type { SiteRule } from './rule-types';
import { getJsonSetting } from '../settings/storage';
import { KEYS } from '../settings/schema';

export function loadCustomSiteRules(): SiteRule[] {
  return getJsonSetting<SiteRule[]>(KEYS.customSiteRules, []);
}
