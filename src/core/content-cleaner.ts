import type { TextRule } from '../text-rules/text-rule-types';
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
    while (result.includes(placeholder)) {
      result = result.replace(placeholder, original);
    }
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

export function convertS2T(text: string, mapping: Record<string, string>): string {
  let result = '';
  for (const char of text) {
    result += mapping[char] || char;
  }
  return result;
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
