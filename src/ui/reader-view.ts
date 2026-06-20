import type { ParsedChapter, ReaderState } from '../core/reader-state';
import type { SiteRule } from '../rules/rule-types';
import type { TextRule } from '../text-rules/text-rule-types';
import type { CleanOptions } from '../core/content-cleaner';
import type { Settings } from '../settings/schema';
import { injectReaderStyles, updateReaderStyleVars, updateExtraCss, removeExtraCss } from './styles';
import { createSidebar, addSidebarItem, setActiveSidebarItem, removeSidebar, toggleSidebarVisibility } from './sidebar';
import { createBottomNav, updateBottomNav, removeBottomNav } from '../core/navigation';
import { loadNextChapter, clearLoadedUrls, clearFailedUrls, preloadImages, isUrlFailed } from '../core/next-page-loader';
import { loadAllSettings } from '../settings/storage';
import { logger } from '../shared/logger';
import { openPreferencesPanel } from './preferences-panel';
import { initKeyboard, destroyKeyboard, type KeyboardHandlers } from './keyboard';

let state: ReaderState | null = null;
let rule: SiteRule | null = null;
let textRules: TextRule[] = [];
let cleanOptions: CleanOptions = {};
let containerEl: HTMLElement | null = null;
let contentAreaEl: HTMLElement | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let isLoadingNext = false;
let loadingIndicatorEl: HTMLElement | null = null;
let errorIndicatorEl: HTMLElement | null = null;
let scrollHandler: (() => void) | null = null;
let keyboardCleanup: (() => void) | null = null;

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
            updateHistory(index);
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

function updateHistory(index: number): void {
  if (!state || !state.chapters[index]) return;
  const settings = loadAllSettings();
  if (!settings.addNextPageToHistory) return;
  const chapter = state.chapters[index];
  const title = chapter.bookTitle
    ? `${chapter.chapterTitle || ''} - ${chapter.bookTitle}`
    : chapter.chapterTitle || '';
  let url: string | undefined;
  try {
    url = chapter.url && new URL(chapter.url).origin === location.origin ? chapter.url : undefined;
  } catch {
    url = undefined;
  }
  history.pushState(
    { chapterIndex: index, chapterTitle: chapter.chapterTitle, bookTitle: chapter.bookTitle },
    title,
    url,
  );
}

function showLoadingIndicator(): void {
  if (!contentAreaEl || loadingIndicatorEl) return;
  loadingIndicatorEl = document.createElement('div');
  loadingIndicatorEl.className = 'nr-loading-indicator';
  loadingIndicatorEl.textContent = '正在加载下一章...';
  contentAreaEl.appendChild(loadingIndicatorEl);
}

function hideLoadingIndicator(): void {
  if (loadingIndicatorEl) {
    loadingIndicatorEl.remove();
    loadingIndicatorEl = null;
  }
}

function showErrorIndicator(url: string): void {
  if (!contentAreaEl || errorIndicatorEl) return;
  errorIndicatorEl = document.createElement('div');
  errorIndicatorEl.className = 'nr-error-indicator';
  const link = document.createElement('a');
  link.textContent = '加载失败，点击手动打开下一页';
  link.href = url;
  link.target = '_blank';
  errorIndicatorEl.appendChild(link);
  contentAreaEl.appendChild(errorIndicatorEl);
}

function removeErrorIndicator(): void {
  if (errorIndicatorEl) {
    errorIndicatorEl.remove();
    errorIndicatorEl = null;
  }
}

async function triggerAutoLoad(url: string): Promise<void> {
  if (isLoadingNext || !rule) return;
  if (isUrlFailed(url)) return;

  isLoadingNext = true;
  removeErrorIndicator();
  showLoadingIndicator();

  const st = loadAllSettings();
  const maxRetries = st.maxRetries;
  const retryDelay = st.retryDelay;

  const result = await loadNextChapter(url, rule, textRules, cleanOptions, maxRetries, retryDelay);

  hideLoadingIndicator();

  if (result.status === 'loaded' && result.chapter) {
    if (st.imagePreload) {
      preloadImages(result.chapter.contentHtml, url);
    }
    appendChapter(result.chapter);
  } else if (result.status === 'failed') {
    showErrorIndicator(url);
  }

  isLoadingNext = false;
}

function setupScrollLoad(): void {
  if (!contentAreaEl) return;

  const st = loadAllSettings();

  scrollHandler = () => {
    if (!contentAreaEl || isLoadingNext || !state) return;
    if (state.autoLoadPaused) return;
    const lastChapter = state.chapters[state.chapters.length - 1];
    if (!lastChapter?.nextUrl) return;

    const { scrollTop, scrollHeight, clientHeight } = contentAreaEl;
    if (scrollHeight - scrollTop - clientHeight < st.remainHeight) {
      triggerAutoLoad(lastChapter.nextUrl);
    }
  };

  contentAreaEl.addEventListener('scroll', scrollHandler, { passive: true });
}

function onSettingChange(key: keyof Settings, value: Settings[keyof Settings]): void {
  const all = loadAllSettings();
  switch (key) {
    case 'fontFamily':
    case 'fontSize':
    case 'lineHeight':
    case 'contentWidth':
      updateReaderStyleVars(all);
      break;
    case 'hideSidebar':
      if (value) {
        containerEl?.classList.add('nr-sidebar-hidden');
      } else {
        containerEl?.classList.remove('nr-sidebar-hidden');
      }
      if (state) state.sidebarVisible = !value;
      break;
    case 'hideFooterNav':
      if (value) {
        containerEl?.classList.add('nr-nav-hidden');
      } else {
        containerEl?.classList.remove('nr-nav-hidden');
      }
      break;
    case 'hidePreferencesButton': {
      const btn = document.querySelector('.nr-settings-btn') as HTMLElement | null;
      if (btn) btn.style.display = value ? 'none' : '';
      break;
    }
    case 'extraCss':
      updateExtraCss(value as string);
      break;
    case 'debug':
      logger.setDebug(value as boolean);
      break;
    case 'keybindings': {
      if (keyboardCleanup) {
        keyboardCleanup();
        keyboardCleanup = null;
      }
      setupKeyboard();
      break;
    }
    default:
      break;
  }
}

function setupKeyboard(): void {
  const handlers: KeyboardHandlers = {
    onOpenIndex: () => {
      const last = state?.chapters[state.chapters.length - 1];
      if (last?.indexUrl) {
        window.open(last.indexUrl, '_blank');
      }
    },
    onPrevChapter: () => {
      if (state && state.activeIndex > 0) {
        scrollToChapter(state.activeIndex - 1);
      } else if (state?.chapters[0]?.prevUrl) {
        navigateToChapter(state.chapters[0].prevUrl);
      }
    },
    onNextChapter: () => {
      if (state && state.activeIndex < state.chapters.length - 1) {
        scrollToChapter(state.activeIndex + 1);
      } else {
        const last = state?.chapters[state.chapters.length - 1];
        if (last?.nextUrl) {
          navigateToChapter(last.nextUrl);
        }
      }
    },
    onToggleSidebar: () => toggleSidebarVisibility(),
    onToggleQuietMode: () => toggleQuietMode(),
    onOpenSettings: () => openPreferencesPanel(onSettingChange),
  };

  keyboardCleanup = initKeyboard(handlers, loadAllSettings().keybindings);
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
  const settings = loadAllSettings();

  injectReaderStyles();
  updateReaderStyleVars(settings);
  if (settings.extraCss) {
    updateExtraCss(settings.extraCss);
  }
  ensureViewport();

  document.body.innerHTML = '';

  containerEl = document.createElement('div');
  containerEl.className = 'nr-reader-container';

  if (settings.hideSidebar) {
    containerEl.classList.add('nr-sidebar-hidden');
  }
  if (settings.hideFooterNav) {
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
  if (settings.hidePreferencesButton) {
    settingsBtn.style.display = 'none';
  }
  settingsBtn.addEventListener('click', () => {
    openPreferencesPanel(onSettingChange);
  });
  document.body.appendChild(settingsBtn);

  state = {
    chapters: [initialChapter],
    activeIndex: 0,
    sidebarVisible: !settings.hideSidebar,
    quietMode: false,
    autoLoadPaused: false,
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
  setupScrollLoad();
  setupKeyboard();

  if (settings.doubleClickPause && contentAreaEl) {
    contentAreaEl.addEventListener('dblclick', () => {
      if (!state) return;
      state.autoLoadPaused = !state.autoLoadPaused;
    });
  }

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

  const st = loadAllSettings();
  const target = contentAreaEl.querySelector(`[data-chapter-index="${index}"]`);
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: st.scrollAnimate ? 'smooth' : 'auto', block: 'start' });
  }

  if (state) {
    state.activeIndex = index;
  }
  setActiveSidebarItem(index);
  applyTitleUpdate(index);
  updateHistory(index);
}

export async function navigateToChapter(url: string): Promise<void> {
  if (!rule || isLoadingNext) return;

  isLoadingNext = true;
  removeErrorIndicator();
  showLoadingIndicator();

  const st = loadAllSettings();

  const result = await loadNextChapter(url, rule, textRules, cleanOptions, st.maxRetries, st.retryDelay);

  hideLoadingIndicator();

  if (result.status === 'loaded' && result.chapter) {
    appendChapter(result.chapter);
    scrollToChapter(state!.chapters.length - 1);
  } else if (result.status === 'failed') {
    showErrorIndicator(url);
    logger.warn(`无法加载章节: ${url}`);
  }

  isLoadingNext = false;
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
  if (scrollHandler && contentAreaEl) {
    contentAreaEl.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  if (keyboardCleanup) {
    keyboardCleanup();
    keyboardCleanup = null;
  }
  hideLoadingIndicator();
  removeErrorIndicator();
  removeExtraCss();
  isLoadingNext = false;
  if (containerEl) {
    containerEl.remove();
  }
  const settingsBtn = document.querySelector('.nr-settings-btn');
  if (settingsBtn) {
    settingsBtn.remove();
  }
  removeSidebar();
  removeBottomNav();
  clearLoadedUrls();
  clearFailedUrls();
  containerEl = null;
  contentAreaEl = null;
  state = null;
  rule = null;
  textRules = [];
  cleanOptions = {};
}
