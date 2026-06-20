import type { ParsedChapter, ReaderState } from '../core/reader-state';
import type { SiteRule } from '../rules/rule-types';
import type { TextRule } from '../text-rules/text-rule-types';
import type { CleanOptions } from '../core/content-cleaner';
import { injectReaderStyles } from './styles';
import { createSidebar, addSidebarItem, setActiveSidebarItem, removeSidebar, toggleSidebarVisibility } from './sidebar';
import { createBottomNav, updateBottomNav, removeBottomNav } from '../core/navigation';
import { loadNextChapter, clearLoadedUrls } from '../core/next-page-loader';
import { getSetting } from '../settings/storage';
import { KEYS } from '../settings/schema';
import { logger } from '../shared/logger';

let state: ReaderState | null = null;
let rule: SiteRule | null = null;
let textRules: TextRule[] = [];
let cleanOptions: CleanOptions = {};
let containerEl: HTMLElement | null = null;
let contentAreaEl: HTMLElement | null = null;
let intersectionObserver: IntersectionObserver | null = null;

export function getReaderState(): ReaderState | null {
  return state;
}

function ensureViewport(): void {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);
  }
}

function renderChapterElement(chapter: ParsedChapter, index: number): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'nr-chapter';
  wrapper.setAttribute('data-chapter-index', String(index));

  const title = document.createElement('h2');
  title.className = 'nr-chapter-title';
  title.textContent = chapter.chapterTitle || chapter.bookTitle || `第 ${index + 1} 章`;

  const body = document.createElement('div');
  body.className = 'nr-chapter-body';
  body.innerHTML = chapter.contentHtml;

  wrapper.appendChild(title);
  wrapper.appendChild(body);
  return wrapper;
}

function setupIntersectionObserver(): void {
  if (!contentAreaEl) return;

  if (typeof IntersectionObserver === 'undefined') {
    return;
  }

  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-chapter-index'));
          if (!isNaN(index) && state && index !== state.activeIndex) {
            state.activeIndex = index;
            setActiveSidebarItem(index);
            applyTitleUpdate(index);
          }
        }
      }
    },
    {
      root: contentAreaEl,
      threshold: 0.3,
    },
  );

  const chapters = contentAreaEl.querySelectorAll('.nr-chapter');
  chapters.forEach((ch) => intersectionObserver!.observe(ch));
}

function applyTitleUpdate(index: number): void {
  if (!state || !state.chapters[index]) return;
  const chapter = state.chapters[index];
  const newTitle = chapter.bookTitle
    ? `${chapter.chapterTitle || ''} - ${chapter.bookTitle}`
    : chapter.chapterTitle;
  if (newTitle && document.title !== newTitle) {
    document.title = newTitle;
  }
}

export function renderReaderView(
  initialChapter: ParsedChapter,
  r: SiteRule,
  tr: TextRule[],
  co: CleanOptions,
): void {
  rule = r;
  textRules = tr;
  cleanOptions = co;

  injectReaderStyles();
  ensureViewport();

  document.body.innerHTML = '';

  containerEl = document.createElement('div');
  containerEl.className = 'nr-reader-container';

  if (getSetting(KEYS.hideSidebar) === 'true') {
    containerEl.classList.add('nr-sidebar-hidden');
  }
  if (getSetting(KEYS.hideFooterNav) === 'true') {
    containerEl.classList.add('nr-nav-hidden');
  }

  contentAreaEl = document.createElement('div');
  contentAreaEl.className = 'nr-content-area';

  const chapterEl = renderChapterElement(initialChapter, 0);
  contentAreaEl.appendChild(chapterEl);

  containerEl.appendChild(contentAreaEl);
  document.body.appendChild(containerEl);

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'nr-settings-btn';
  settingsBtn.textContent = '⚙';
  settingsBtn.title = '设置';
  if (getSetting(KEYS.hidePreferencesButton) === 'true') {
    settingsBtn.style.display = 'none';
  }
  document.body.appendChild(settingsBtn);

  state = {
    chapters: [initialChapter],
    activeIndex: 0,
    sidebarVisible: getSetting(KEYS.hideSidebar) !== 'true',
    quietMode: false,
  };

  createSidebar(containerEl, state.chapters, 0, (index) => {
    scrollToChapter(index);
  });

  createBottomNav(
    containerEl,
    {
      prevUrl: initialChapter.prevUrl,
      indexUrl: initialChapter.indexUrl,
      nextUrl: initialChapter.nextUrl,
    },
    async (url) => {
      await navigateToChapter(url);
    },
  );

  setupIntersectionObserver();
  applyTitleUpdate(0);

  logger.info('阅读视图渲染完成', {
    bookTitle: initialChapter.bookTitle,
    chapterTitle: initialChapter.chapterTitle,
  });
}

export function appendChapter(chapter: ParsedChapter): void {
  if (!state || !contentAreaEl) return;

  state.chapters.push(chapter);
  const index = state.chapters.length - 1;

  const chapterEl = renderChapterElement(chapter, index);
  contentAreaEl.appendChild(chapterEl);

  if (intersectionObserver) {
    intersectionObserver.observe(chapterEl);
  }

  addSidebarItem(chapter, (i) => {
    scrollToChapter(i);
  });

  updateBottomNav(
    {
      prevUrl: chapter.prevUrl,
      indexUrl: chapter.indexUrl,
      nextUrl: chapter.nextUrl,
    },
    async (url) => {
      await navigateToChapter(url);
    },
  );
}

export function scrollToChapter(index: number): void {
  if (!contentAreaEl) return;

  const target = contentAreaEl.querySelector(`[data-chapter-index="${index}"]`);
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (state) {
    state.activeIndex = index;
  }
  setActiveSidebarItem(index);
  applyTitleUpdate(index);
}

export async function navigateToChapter(url: string): Promise<void> {
  if (!rule) return;

  const chapter = await loadNextChapter(url, rule, textRules, cleanOptions);
  if (chapter) {
    appendChapter(chapter);
    scrollToChapter(state!.chapters.length - 1);
  } else {
    logger.warn(`无法加载章节: ${url}`);
  }
}

export function toggleQuietMode(): void {
  if (!containerEl) return;

  if (containerEl.classList.contains('nr-quiet')) {
    containerEl.classList.remove('nr-quiet');
    if (state) state.quietMode = false;
  } else {
    containerEl.classList.add('nr-quiet');
    if (state) state.quietMode = true;
  }
}

export function isQuietMode(): boolean {
  return containerEl?.classList.contains('nr-quiet') ?? false;
}

export function destroyReaderView(): void {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
  removeSidebar();
  removeBottomNav();
  clearLoadedUrls();
  containerEl = null;
  contentAreaEl = null;
  state = null;
  rule = null;
  textRules = [];
  cleanOptions = {};
}
