import type { SiteRule } from '../rules/rule-types';
import type { ParsedChapter } from './reader-state';
import type { TextRule } from '../text-rules/text-rule-types';
import { querySelector, querySelectorAll, removeElements, getAbsoluteUrl, getTextContent } from '../shared/dom';
import { logger } from '../shared/logger';
import { cleanContent, convertS2T, type CleanOptions } from './content-cleaner';

const VIP_MIN_TEXT_LENGTH = 50;

const CANDIDATE_CONTENT_SELECTORS = [
  '#content', '.content', '#article', '.article',
  '#chapter-content', '.chapter-content', '#read-content',
  '#booktxt', '#BookText', '#novel-content', '#htmlContent',
  '.text', '#text', '.chapter', '#chapter',
  '.book-content', '#book-content', '.main-text',
  '.read-content', '.section-content', '#chaptercontent',
  '.showtxt', '#contents', '.article-content',
  '#main-content', '.post-content', '.entry-content',
];

const TITLE_SEPARATORS = /[_\-\|–—·]\s*/;

function extractBookTitleAuto(doc: Document, rule: SiteRule): string {
  for (const selector of ['h1', 'h2', 'h3', '.title', '#title', '.book-title']) {
    const el = querySelector(doc, selector);
    if (el) {
      const text = getTextContent(el);
      if (text && !text.includes('章') && !text.includes('节') && text.length < 50) {
        return text;
      }
    }
  }

  return parseDocTitle(doc).bookTitle;
}

function extractChapterTitleAuto(doc: Document, rule: SiteRule): string {
  for (const selector of ['h1', 'h2', 'h3', '.title', '#title', '.chapter-title', '.chapterTitle']) {
    const el = querySelector(doc, selector);
    if (el) {
      const text = getTextContent(el);
      if (text && (text.includes('章') || text.includes('节') || text.includes('第'))) {
        return text;
      }
    }
  }

  return parseDocTitle(doc).chapterTitle;
}

function parseDocTitle(doc: Document): { bookTitle: string; chapterTitle: string } {
  const title = doc.title.trim();
  if (!title) return { bookTitle: '', chapterTitle: '' };

  const parts = title.split(TITLE_SEPARATORS).map((s) => s.trim()).filter(Boolean);

  if (parts.length === 1) {
    return { bookTitle: parts[0], chapterTitle: parts[0] };
  }

  let bookPart = '';
  let chapterPart = '';

  for (const part of parts) {
    if (/[第序]/.test(part) && /[章节回篇]/.test(part)) {
      chapterPart = chapterPart || part;
    } else if (chapterPart) {
      break;
    }
  }

  if (!chapterPart) {
    bookPart = parts[0];
    chapterPart = parts[parts.length - 1];
  } else {
    bookPart = parts.find((p) => p !== chapterPart && p.length > 1) || parts[0];
  }

  return { bookTitle: bookPart, chapterTitle: chapterPart };
}

export function extractTitle(doc: Document, rule: SiteRule): { bookTitle: string; chapterTitle: string } {
  let bookTitle = '';
  let chapterTitle = '';

  if (rule.bookTitleSelector) {
    const el = querySelector(doc, rule.bookTitleSelector);
    bookTitle = getTextContent(el);
  }
  if (rule.chapterTitleSelector) {
    const el = querySelector(doc, rule.chapterTitleSelector);
    chapterTitle = getTextContent(el);
  }
  if (bookTitle && chapterTitle) {
    return { bookTitle, chapterTitle };
  }

  if (rule.titleSelector) {
    const el = querySelector(doc, rule.titleSelector);
    const text = getTextContent(el);
    if (text) {
      const parts = text.split(TITLE_SEPARATORS).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { bookTitle: bookTitle || parts[0], chapterTitle: chapterTitle || parts[1] };
      }
      if (!bookTitle) bookTitle = text;
      if (!chapterTitle) chapterTitle = text;
    }
  }

  if (rule.bookTitleRegex || rule.chapterTitleRegex) {
    const docTitle = doc.title.trim();
    if (rule.bookTitleRegex) {
      try {
        const m = docTitle.match(new RegExp(rule.bookTitleRegex, 'i'));
        if (m && m[1]) bookTitle = bookTitle || m[1].trim();
      } catch { /* skip */ }
    }
    if (rule.chapterTitleRegex) {
      try {
        const m = docTitle.match(new RegExp(rule.chapterTitleRegex, 'i'));
        if (m && m[1]) chapterTitle = chapterTitle || m[1].trim();
      } catch { /* skip */ }
    }
    if (bookTitle && chapterTitle) {
      return { bookTitle, chapterTitle };
    }
  }

  if (!bookTitle) bookTitle = extractBookTitleAuto(doc, rule);
  if (!chapterTitle) chapterTitle = extractChapterTitleAuto(doc, rule);

  return { bookTitle, chapterTitle };
}

export function extractContent(doc: Document, rule: SiteRule, removeSelectors?: string[]): { html: string; text: string } {
  let contentEl: Element | null = null;

  if (rule.contentSelector) {
    contentEl = querySelector(doc, rule.contentSelector);
  }

  if (!contentEl) {
    let bestEl: Element | null = null;
    let bestScore = 0;

    for (const selector of CANDIDATE_CONTENT_SELECTORS) {
      const el = querySelector(doc, selector);
      if (!el) continue;

      const text = el.textContent?.trim() ?? '';
      if (text.length < VIP_MIN_TEXT_LENGTH) continue;

      const pCount = el.querySelectorAll('p, div > br').length;
      const score = text.length + pCount * 200;

      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
      }
    }

    contentEl = bestEl;
  }

  if (!contentEl) {
    return { html: '', text: '' };
  }

  const clone = contentEl.cloneNode(true) as Element;

  if (removeSelectors) {
    for (const selector of removeSelectors) {
      removeElements(selector, clone);
    }
  }

  return {
    html: clone.innerHTML,
    text: (clone.textContent ?? '').trim(),
  };
}

interface NavLink {
  url: string;
  text: string;
}

const NEXT_PATTERNS = ['下一章', '下一页', '下一节', '后一章', '→', '&#8594;', 'next'];
const PREV_PATTERNS = ['上一章', '上一页', '上一节', '前一章', '←', '&#8592;', 'prev'];
const INDEX_PATTERNS = ['目录', '返回目录', '作品目录', '章节目录', '索引', 'index'];

function findNavLink(doc: Document, patterns: string[], relValue?: string): NavLink | null {
  const links = querySelectorAll<HTMLAnchorElement>(doc, 'a');
  for (const link of links) {
    if (relValue && (link.rel === relValue || link.getAttribute('rel') === relValue)) {
      return { url: link.href, text: getTextContent(link) };
    }
    const text = getTextContent(link);
    if (text && patterns.some((p) => text.includes(p))) {
      return { url: link.href, text: getTextContent(link) };
    }
  }
  return null;
}

export function extractNavigation(
  doc: Document,
  rule: SiteRule,
  currentUrl: string,
): { prevUrl?: string; nextUrl?: string; indexUrl?: string } {
  let prevUrl: string | undefined;
  let nextUrl: string | undefined;
  let indexUrl: string | undefined;

  if (rule.prevSelector) {
    const el = querySelector<HTMLAnchorElement>(doc, rule.prevSelector);
    prevUrl = el?.href || undefined;
  }
  if (rule.nextSelector) {
    const el = querySelector<HTMLAnchorElement>(doc, rule.nextSelector);
    nextUrl = el?.href || undefined;
  }
  if (rule.indexSelector) {
    const el = querySelector<HTMLAnchorElement>(doc, rule.indexSelector);
    indexUrl = el?.href || undefined;
  }

  if (!prevUrl) {
    const found = findNavLink(doc, PREV_PATTERNS, 'prev');
    prevUrl = found?.url || undefined;
  }
  if (!nextUrl) {
    const found = findNavLink(doc, NEXT_PATTERNS, 'next');
    nextUrl = found?.url || undefined;
  }
  if (!indexUrl) {
    const found = findNavLink(doc, INDEX_PATTERNS);
    indexUrl = found?.url || undefined;
  }

  const toAbs = (href: string | undefined): string | undefined => {
    if (!href) return undefined;
    const abs = getAbsoluteUrl(href, currentUrl);
    if (!abs || abs.startsWith('javascript:') || abs === currentUrl) return undefined;
    return abs;
  };

  return {
    prevUrl: toAbs(prevUrl),
    nextUrl: toAbs(nextUrl),
    indexUrl: toAbs(indexUrl),
  };
}

export function detectVip(contentText: string, rule: SiteRule): boolean {
  if (rule.isVip) return true;
  if (!contentText || contentText.length < VIP_MIN_TEXT_LENGTH) return true;
  return false;
}

export function parseChapter(
  doc: Document,
  currentUrl: string,
  rule: SiteRule,
  textRules?: TextRule[],
  cleanOptions?: CleanOptions,
): ParsedChapter {
  logger.info(`解析章节: ${currentUrl}`);

  let { bookTitle, chapterTitle } = extractTitle(doc, rule);
  const { html } = extractContent(doc, rule, rule.removeSelectors);
  const nav = extractNavigation(doc, rule, currentUrl);

  const allTextRules = [
    ...(rule.contentReplaceRules ?? []),
    ...(textRules ?? []),
  ];

  const cleaned = cleanContent(html, allTextRules, cleanOptions);

  if (cleanOptions?.convertToTraditional && cleanOptions?.s2tMapping) {
    bookTitle = convertS2T(bookTitle, cleanOptions.s2tMapping);
    chapterTitle = convertS2T(chapterTitle, cleanOptions.s2tMapping);
  }

  const isVip = detectVip(cleaned.text, rule);

  const result: ParsedChapter = {
    bookTitle: bookTitle || rule.name || '',
    chapterTitle: chapterTitle || '',
    documentTitle: doc.title,
    contentHtml: cleaned.html,
    contentText: cleaned.text,
    prevUrl: nav.prevUrl,
    nextUrl: nav.nextUrl,
    indexUrl: nav.indexUrl,
    isVip,
  };

  logger.info(`解析完成: ${result.bookTitle} - ${result.chapterTitle}`);
  return result;
}
