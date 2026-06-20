import type { SiteRule, SiteRuleSet } from './rule-types';
import { loadSiteRulesWithFallback } from './remote-rule-source';
import { loadCustomSiteRules } from './local-rule-source';
import { logger } from '../shared/logger';

let compiledRules: CompiledRule[] = [];
let initialized = false;

interface CompiledRule {
  rule: SiteRule;
  regex: RegExp;
  priority: number;
  source: 'custom' | 'remote' | 'cache';
}

export async function initRuleRegistry(url?: string): Promise<void> {
  if (initialized) return;

  const ruleSet = await loadSiteRulesWithFallback(url);
  const customRules = loadCustomSiteRules();

  const items: CompiledRule[] = [];

  for (const rule of customRules) {
    try {
      items.push({
        rule,
        regex: new RegExp(rule.url, 'i'),
        priority: rule.priority ?? 900,
        source: 'custom',
      });
    } catch {
      logger.warn(`自定义规则正则无效: ${rule.url}`);
    }
  }

  for (const rule of ruleSet.rules) {
    if (customRules.some((cr) => cr.id === rule.id)) continue;
    try {
      items.push({
        rule,
        regex: new RegExp(rule.url, 'i'),
        priority: rule.priority ?? 500,
        source: 'remote',
      });
    } catch {
      logger.warn(`规则正则无效: ${rule.url}`);
    }
  }

  items.sort((a, b) => b.priority - a.priority);
  compiledRules = items;
  initialized = true;

  logger.info(`规则注册完成，共 ${items.length} 条`);
}

export function matchRule(url: string): SiteRule | null {
  const target = url;

  for (const item of compiledRules) {
    if (item.regex.test(target)) {
      if (item.rule.excludeUrl) {
        try {
          if (new RegExp(item.rule.excludeUrl, 'i').test(target)) {
            continue;
          }
        } catch { /* skip invalid exclude */ }
      }

      logger.info(`规则匹配: ${item.rule.name} (${item.rule.id}) [${item.source}]`);
      return item.rule;
    }
  }

  return null;
}

export function getCompiledRules(): CompiledRule[] {
  return compiledRules;
}

export function resetRegistry(): void {
  compiledRules = [];
  initialized = false;
}
