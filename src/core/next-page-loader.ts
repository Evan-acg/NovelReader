import type { SiteRule } from '../rules/rule-types';
import type { TextRule } from '../text-rules/text-rule-types';
import type { ParsedChapter } from './reader-state';
import type { CleanOptions } from './content-cleaner';
import { parseChapter } from './parser';
import { gmFetch } from '../shared/gm';
import { logger } from '../shared/logger';

const loadedUrls = new Set<string>();

export function isUrlLoaded(url: string): boolean {
  return loadedUrls.has(url);
}

export function markUrlLoaded(url: string): void {
  loadedUrls.add(url);
}

export function clearLoadedUrls(): void {
  loadedUrls.clear();
}

export async function loadNextChapter(
  url: string,
  rule: SiteRule,
  textRules: TextRule[],
  cleanOptions: CleanOptions,
): Promise<ParsedChapter | null> {
  if (isUrlLoaded(url)) {
    logger.info(`跳过已加载 URL: ${url}`);
    return null;
  }

  try {
    logger.info(`加载下一页: ${url}`);
    const html = await gmFetch(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const chapter = parseChapter(doc, url, rule, textRules, cleanOptions);
    markUrlLoaded(url);
    return chapter;
  } catch (e) {
    logger.warn(`加载下一页失败: ${url}`, e);
    return null;
  }
}
