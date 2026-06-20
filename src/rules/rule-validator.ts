import type { SiteRule, SiteRuleSet } from './rule-types';
import { failure, success, type Result } from '../shared/result';

const MAX_RULES = 500;

const SAFE_SELECTOR_REGEX = /^[a-zA-Z0-9\-_.#,:\[\]="'()\s*~+>|^$]+$/;
const SAFE_URL_REGEX = /^[\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+$/;

function hasSafeChars(value: string | undefined, regex: RegExp): boolean {
  if (!value) return true;
  return regex.test(value);
}

export function validateSiteRule(rule: unknown): Result<SiteRule> {
  if (!rule || typeof rule !== 'object') {
    return failure(new Error('规则必须是对象'));
  }

  const r = rule as Record<string, unknown>;

  if (typeof r.id !== 'string' || !r.id.trim()) {
    return failure(new Error('缺少 id'));
  }
  if (typeof r.url !== 'string' || !r.url.trim()) {
    return failure(new Error(`规则 "${String(r.id)}" 缺少 url`));
  }

  const url = r.url as string;
  if (!hasSafeChars(url, SAFE_URL_REGEX)) {
    return failure(new Error(`规则 "${url}" 的 url 包含不安全字符`));
  }

  if (/^(javascript|data|vbscript):/i.test(url)) {
    return failure(new Error(`规则 "${url}" 的 url 不允许使用脚本协议`));
  }

  try {
    new RegExp(url);
  } catch {
    return failure(new Error(`规则 "${url}" 的 url 不是合法的正则表达式`));
  }

  const selectors = ['titleSelector', 'bookTitleSelector', 'chapterTitleSelector', 'contentSelector', 'prevSelector', 'nextSelector', 'indexSelector'];
  for (const key of selectors) {
    const value = r[key];
    if (value !== undefined && (typeof value !== 'string' || !hasSafeChars(value, SAFE_SELECTOR_REGEX))) {
      return failure(new Error(`规则 "${url}" 的 ${key} 包含不安全字符`));
    }
  }

  return success(r as unknown as SiteRule);
}

export function validateSiteRuleSet(json: unknown): Result<SiteRuleSet> {
  if (!json || typeof json !== 'object') {
    return failure(new Error('规则集必须是一个对象'));
  }

  const data = json as Record<string, unknown>;

  if (typeof data.version !== 'number' || data.version < 1) {
    return failure(new Error('缺少或无效的 version'));
  }

  if (!Array.isArray(data.rules)) {
    return failure(new Error('rules 必须是数组'));
  }

  const rules = data.rules as unknown[];
  
  if (rules.length > MAX_RULES) {
    return failure(new Error(`规则数量超过上限 ${MAX_RULES}`));
  }

  const validRules: SiteRule[] = [];

  for (let i = 0; i < rules.length; i++) {
    const result = validateSiteRule(rules[i]);
    if (!result.success) {
      return failure(new Error(`规则索引 ${i}: ${result.error.message}`));
    }
    validRules.push(result.value);
  }

  return success({
    version: data.version as number,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    rules: validRules,
  });
}
