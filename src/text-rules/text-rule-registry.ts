import type { TextRule, TextRuleGroup, TextRuleSet } from './text-rule-types';
import { loadTextRulesWithFallback } from './remote-text-rule-source';
import { loadCustomReplaceRules } from './local-text-rule-source';
import { getJsonSetting } from '../settings/storage';
import { KEYS } from '../settings/schema';
import { logger } from '../shared/logger';

let combinedRules: TextRule[] = [];
let groups: TextRuleGroup[] = [];
let initialized = false;

export async function initTextRuleRegistry(url?: string): Promise<void> {
  if (initialized) return;

  const ruleSet = await loadTextRulesWithFallback(url);
  const customRules = loadCustomReplaceRules();
  const enabledGroups = getJsonSetting<string[]>(KEYS.enabledTextRuleGroups, []);

  groups = ruleSet.groups;

  const merged: TextRule[] = [];

  for (const group of groups) {
    if (enabledGroups.length > 0 && !enabledGroups.includes(group.id)) {
      continue;
    }
    if (enabledGroups.length === 0 && !group.enabledByDefault) {
      continue;
    }
    merged.push(...group.rules);
  }

  merged.push(...customRules);

  combinedRules = merged;
  initialized = true;

  logger.info(`文本规则注册完成，共 ${merged.length} 条`);
}

export function getCombinedTextRules(): TextRule[] {
  return combinedRules;
}

export function getTextRuleGroups(): TextRuleGroup[] {
  return groups;
}

export function resetTextRuleRegistry(): void {
  combinedRules = [];
  groups = [];
  initialized = false;
}
