import type { SiteRule, SiteRuleSet } from './rule-types';
import { validateSiteRuleSet } from './rule-validator';
import { success, failure, type Result } from '../shared/result';
import { gmFetch } from '../shared/gm';
import { getJsonSetting, setJsonSetting } from '../settings/storage';
import { KEYS, SITE_RULES_URL } from '../settings/schema';
import { logger } from '../shared/logger';

export async function fetchRemoteSiteRules(url?: string): Promise<Result<SiteRuleSet>> {
  const targetUrl = url || SITE_RULES_URL;

  try {
    logger.info(`正在加载远程站点规则: ${targetUrl}`);
    const text = await gmFetch(targetUrl);

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return failure(new Error('远程站点规则 JSON 解析失败'));
    }

    const result = validateSiteRuleSet(json);
    if (!result.success) {
      return failure(new Error(`远程站点规则校验失败: ${result.error.message}`));
    }

    setJsonSetting(KEYS.siteRulesCache, result.value);
    setJsonSetting(KEYS.siteRulesCacheUpdatedAt, Date.now());
    logger.info(`站点规则加载成功，共 ${result.value.rules.length} 条`);

    return result;
  } catch (e) {
    logger.warn('远程站点规则拉取失败:', e);
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}

export function loadCachedSiteRules(): Result<SiteRuleSet> {
  const cached = getJsonSetting<SiteRuleSet | null>(KEYS.siteRulesCache, null);
  if (!cached || !cached.version || !Array.isArray(cached.rules)) {
    return failure(new Error('无可用缓存'));
  }
  logger.info(`使用缓存的站点规则，共 ${cached.rules.length} 条`);
  return success(cached);
}

const CACHE_TTL = 60 * 60 * 1000;

function isCacheFresh(key: string): boolean {
  const updatedAt = getJsonSetting<number | null>(key, null);
  return updatedAt !== null && (Date.now() - updatedAt) < CACHE_TTL;
}

export async function loadSiteRulesWithFallback(url?: string): Promise<SiteRuleSet> {
  if (isCacheFresh(KEYS.siteRulesCacheUpdatedAt)) {
    const cachedResult = loadCachedSiteRules();
    if (cachedResult.success) {
      return cachedResult.value;
    }
  }

  const remoteResult = await fetchRemoteSiteRules(url);
  if (remoteResult.success) {
    return remoteResult.value;
  }

  const cachedResult = loadCachedSiteRules();
  if (cachedResult.success) {
    return cachedResult.value;
  }

  return { version: 1, updatedAt: '', rules: [] };
}
