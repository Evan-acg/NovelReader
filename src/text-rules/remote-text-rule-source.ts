import type { TextRuleSet } from './text-rule-types';
import { validateTextRuleSet } from './text-rule-validator';
import { success, failure, type Result } from '../shared/result';
import { gmFetch } from '../shared/gm';
import { getJsonSetting, setJsonSetting } from '../settings/storage';
import { KEYS, TEXT_RULES_URL } from '../settings/schema';
import { logger } from '../shared/logger';

export async function fetchRemoteTextRules(url?: string): Promise<Result<TextRuleSet>> {
  const targetUrl = url || TEXT_RULES_URL;

  try {
    logger.info(`正在加载远程文本规则: ${targetUrl}`);
    const text = await gmFetch(targetUrl);

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return failure(new Error('远程文本规则 JSON 解析失败'));
    }

    const result = validateTextRuleSet(json);
    if (!result.success) {
      return failure(new Error(`远程文本规则校验失败: ${result.error.message}`));
    }

    setJsonSetting(KEYS.textRulesCache, result.value);
    setJsonSetting(KEYS.textRulesCacheUpdatedAt, Date.now());
    logger.info(`文本规则加载成功，共 ${result.value.groups.length} 组`);

    return result;
  } catch (e) {
    logger.warn('远程文本规则拉取失败:', e);
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}

export function loadCachedTextRules(): Result<TextRuleSet> {
  const cached = getJsonSetting<TextRuleSet | null>(KEYS.textRulesCache, null);
  if (!cached || !cached.version || !Array.isArray(cached.groups)) {
    return failure(new Error('无可用缓存'));
  }
  logger.info(`使用缓存的文本规则，共 ${cached.groups.length} 组`);
  return success(cached);
}

const CACHE_TTL = 60 * 60 * 1000;

function isCacheFresh(key: string): boolean {
  const updatedAt = getJsonSetting<number | null>(key, null);
  return updatedAt !== null && (Date.now() - updatedAt) < CACHE_TTL;
}

export async function loadTextRulesWithFallback(url?: string): Promise<TextRuleSet> {
  if (isCacheFresh(KEYS.textRulesCacheUpdatedAt)) {
    const cachedResult = loadCachedTextRules();
    if (cachedResult.success) {
      return cachedResult.value;
    }
  }

  const remoteResult = await fetchRemoteTextRules(url);
  if (remoteResult.success) {
    return remoteResult.value;
  }

  const cachedResult = loadCachedTextRules();
  if (cachedResult.success) {
    return cachedResult.value;
  }

  return { version: 1, updatedAt: '', groups: [] };
}
