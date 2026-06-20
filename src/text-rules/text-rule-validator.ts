import type { TextRule, TextRuleGroup, TextRuleSet } from './text-rule-types';
import { failure, success, type Result } from '../shared/result';

const MAX_GROUPS = 50;
const MAX_RULES_PER_GROUP = 500;
const ALLOWED_FLAGS = /^[gimsuy]*$/;

export function validateTextRule(rule: unknown): Result<TextRule> {
  if (!rule || typeof rule !== 'object') {
    return failure(new Error('文本规则必须是对象'));
  }

  const r = rule as Record<string, unknown>;

  if (typeof r.pattern !== 'string' || !r.pattern.trim()) {
    return failure(new Error('缺少 pattern'));
  }

  if (typeof r.replacement !== 'string') {
    return failure(new Error('缺少 replacement'));
  }

  if (r.flags !== undefined) {
    if (typeof r.flags !== 'string' || !ALLOWED_FLAGS.test(r.flags)) {
      return failure(new Error(`不安全的 flags: ${String(r.flags)}`));
    }
  }

  try {
    new RegExp(r.pattern, (r.flags as string) || '');
  } catch {
    return failure(new Error(`无效的正则 pattern: ${String(r.pattern)}`));
  }

  return success({
    pattern: r.pattern,
    replacement: r.replacement,
    flags: r.flags as string | undefined,
  });
}

export function validateTextRuleGroup(group: unknown): Result<TextRuleGroup> {
  if (!group || typeof group !== 'object') {
    return failure(new Error('规则组必须是对象'));
  }

  const g = group as Record<string, unknown>;

  if (typeof g.id !== 'string' || !g.id.trim()) {
    return failure(new Error('规则组缺少 id'));
  }

  if (!Array.isArray(g.rules)) {
    return failure(new Error('规则组的 rules 必须是数组'));
  }

  const rules = g.rules as unknown[];

  if (rules.length > MAX_RULES_PER_GROUP) {
    return failure(new Error(`规则组 "${String(g.id)}" 规则数量超过上限 ${MAX_RULES_PER_GROUP}`));
  }

  const validRules: TextRule[] = [];
  for (let i = 0; i < rules.length; i++) {
    const result = validateTextRule(rules[i]);
    if (!result.success) {
      return failure(new Error(`规则组 "${String(g.id)}" 规则 ${i}: ${result.error.message}`));
    }
    validRules.push(result.value);
  }

  return success({
    id: g.id,
    name: typeof g.name === 'string' ? g.name : g.id,
    enabledByDefault: g.enabledByDefault === true,
    rules: validRules,
  });
}

export function validateTextRuleSet(json: unknown): Result<TextRuleSet> {
  if (!json || typeof json !== 'object') {
    return failure(new Error('文本规则集必须是对象'));
  }

  const data = json as Record<string, unknown>;

  if (typeof data.version !== 'number' || data.version < 1) {
    return failure(new Error('缺少或无效的 version'));
  }

  if (!Array.isArray(data.groups)) {
    return failure(new Error('groups 必须是数组'));
  }

  const groups = data.groups as unknown[];

  if (groups.length > MAX_GROUPS) {
    return failure(new Error(`规则组数量超过上限 ${MAX_GROUPS}`));
  }

  const validGroups: TextRuleGroup[] = [];
  for (let i = 0; i < groups.length; i++) {
    const result = validateTextRuleGroup(groups[i]);
    if (!result.success) {
      return failure(new Error(`规则组 ${i}: ${result.error.message}`));
    }
    validGroups.push(result.value);
  }

  return success({
    version: data.version as number,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    groups: validGroups,
  });
}
