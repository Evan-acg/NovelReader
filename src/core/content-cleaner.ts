import type { TextRule } from '../text-rules/text-rule-types';
import { gmFetch } from '../shared/gm';
import { getSetting, getJsonSetting, setJsonSetting } from '../settings/storage';
import { KEYS, S2T_RULES_URL } from '../settings/schema';
import { logger } from '../shared/logger';

export interface CleanOptions {
  convertToTraditional?: boolean;
  splitContent?: boolean;
  s2tMapping?: Record<string, string>;
}

export interface CleanedContent {
  html: string;
  text: string;
}

let placeholderId = 0;
const PLACEHOLDER_PREFIX = '\x00NOVEL_READER_PROTECT_';

function protectHtmlTags(html: string): { protectedHtml: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let result = html;

  result = result.replace(/<img\b[^>]*\/?>/gi, (match) => {
    const placeholder = `${PLACEHOLDER_PREFIX}${placeholderId++}_`;
    map.set(placeholder, match);
    return placeholder;
  });

  result = result.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    const placeholder = `${PLACEHOLDER_PREFIX}${placeholderId++}_`;
    map.set(placeholder, match);
    return placeholder;
  });

  return { protectedHtml: result, map };
}

function restoreHtmlTags(html: string, map: Map<string, string>): string {
  let result = html;
  for (const [placeholder, original] of map) {
    result = result.replaceAll(placeholder, original);
  }
  return result;
}

function removeUnwantedElements(html: string): string {
  let result = html;
  result = result.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '');
  result = result.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
  return result;
}

function applyTextRules(html: string, rules: TextRule[]): string {
  let result = html;
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, rule.flags || 'g');
      result = result.replace(regex, rule.replacement);
    } catch (e) {
      logger.warn(`文本规则执行失败: pattern="${rule.pattern}"`, e);
    }
  }
  return result;
}

function convertBrToParagraphs(html: string): string {
  let result = html.trim();

  result = result.replace(/^(<br\s*\/?>\s*)+/i, '');
  result = result.replace(/(<br\s*\/?>\s*)+$/i, '');
  result = result.replace(/(?:<br\s*\/?>\s*){2,}/gi, '</p><p>');

  if (!/^\s*<p\b/i.test(result)) {
    result = '<p>' + result;
  }
  if (!/<\/p>\s*$/i.test(result)) {
    result = result + '</p>';
  }

  return result;
}

function removeEmptyParagraphs(html: string): string {
  return html.replace(/<p\b[^>]*>\s*(<br\s*\/?>\s*)*\s*<\/p>/gi, '');
}

function forceSplitContent(html: string): string {
  if (!html || /<(p|br|div)\b/i.test(html)) {
    return html;
  }

  return html
    .replace(/([。！？；!?;])\s*/g, '$1</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

export type S2TMapping = Record<string, string>;

export async function loadS2TMapping(): Promise<S2TMapping> {
  const url = getSetting(KEYS.s2tRulesUrl, S2T_RULES_URL);

  try {
    logger.info(`正在加载简繁映射: ${url}`);
    const text = await gmFetch(url);
    const json = JSON.parse(text);
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
      setJsonSetting(KEYS.s2tRulesCache, json);
      setJsonSetting(KEYS.s2tRulesCacheUpdatedAt, Date.now());
      logger.info('简繁映射加载成功');
      return json as S2TMapping;
    }
  } catch (e) {
    logger.warn('远程简繁映射拉取失败:', e);
  }

  const cached = getJsonSetting<S2TMapping | null>(KEYS.s2tRulesCache, null);
  if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
    logger.info('使用缓存的简繁映射');
    return cached;
  }

  logger.warn('无可用简繁映射，简繁转换将不生效');
  return {};
}

export function convertS2T(text: string, mapping: Record<string, string>): string {
  return Array.from(text, (char) => mapping[char] || char).join('');
}

export function cleanContent(
  rawHtml: string,
  textRules: TextRule[],
  options: CleanOptions = {},
): CleanedContent {
  if (!rawHtml) {
    return { html: '', text: '' };
  }

  let html = rawHtml;

  html = removeUnwantedElements(html);

  const { protectedHtml, map } = protectHtmlTags(html);
  html = protectedHtml;

  html = applyTextRules(html, textRules);

  html = restoreHtmlTags(html, map);

  if (options.splitContent) {
    html = forceSplitContent(html);
  }

  html = convertBrToParagraphs(html);

  html = removeEmptyParagraphs(html);

  if (options.convertToTraditional && options.s2tMapping) {
    html = convertS2T(html, options.s2tMapping);
  }

  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  return { html, text };
}
