import type { SiteRule } from '../rules/rule-types';
import type { TextRule } from '../text-rules/text-rule-types';
import type { ParsedChapter, LoadResult } from './reader-state';
import type { CleanOptions } from './content-cleaner';
import { parseChapter } from './parser';
import { gmFetch } from '../shared/gm';
import { logger } from '../shared/logger';

const loadedUrls = new Set<string>();
const failedUrls = new Set<string>();
const loadingUrls = new Set<string>();

export function isUrlLoaded(url: string): boolean {
  return loadedUrls.has(url);
}

export function markUrlLoaded(url: string): void {
  loadedUrls.add(url);
}

export function clearLoadedUrls(): void {
  loadedUrls.clear();
}

export function isUrlFailed(url: string): boolean {
  return failedUrls.has(url);
}

export function markUrlFailed(url: string): void {
  failedUrls.add(url);
}

export function clearFailedUrls(): void {
  failedUrls.clear();
}

export function isUrlLoading(url: string): boolean {
  return loadingUrls.has(url);
}

export function markUrlLoading(url: string): void {
  loadingUrls.add(url);
}

export function clearLoadingUrls(): void {
  loadingUrls.clear();
}

export async function loadNextChapter(
  url: string,
  rule: SiteRule,
  textRules: TextRule[],
  cleanOptions: CleanOptions,
  maxRetries = 2,
  retryDelay = 2000,
): Promise<LoadResult> {
  if (isUrlLoaded(url)) {
    logger.info(`跳过已加载 URL: ${url}`);
    return { status: 'skipped', chapter: null, url };
  }

  if (isUrlFailed(url)) {
    logger.info(`跳过已失败 URL: ${url}`);
    return { status: 'skipped', chapter: null, url };
  }

  if (isUrlLoading(url)) {
    logger.info(`跳过正在加载中的 URL: ${url}`);
    return { status: 'skipped', chapter: null, url };
  }

  markUrlLoading(url);
  try {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`加载下一页${attempt > 0 ? ` (重试 ${attempt}/${maxRetries})` : ''}: ${url}`);
        const html = await gmFetch(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const chapter = parseChapter(doc, url, rule, textRules, cleanOptions);
        markUrlLoaded(url);
        return { status: 'loaded', chapter, url };
      } catch (e) {
        lastError = e;
        logger.warn(`加载下一页失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${url}`, e);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    markUrlFailed(url);
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    logger.warn(`加载下一页最终失败: ${url}`, lastError);
    return { status: 'failed', chapter: null, url, error: errorMessage };
  } finally {
    loadingUrls.delete(url);
  }
}

export function preloadImages(contentHtml: string, baseUrl: string): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml, 'text/html');
  const imgs = doc.querySelectorAll('img[src]');
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (src) {
      try {
        new Image().src = new URL(src, baseUrl).href;
      } catch {
        new Image().src = src;
      }
    }
  }
}
