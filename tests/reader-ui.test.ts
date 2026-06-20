import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ParsedChapter } from '../src/core/reader-state';
import type { SiteRule } from '../src/rules/rule-types';
import type { CleanOptions } from '../src/core/content-cleaner';
import {
  renderReaderView,
  appendChapter,
  scrollToChapter,
  toggleQuietMode,
  isQuietMode,
  destroyReaderView,
  getReaderState,
  navigateToChapter,
} from '../src/ui/reader-view';

vi.mock('../src/shared/gm', () => ({
  gmAddStyle: vi.fn(),
  gmGetValue: () => '',
  gmSetValue: vi.fn(),
  gmFetch: vi.fn(),
}));

import { gmFetch } from '../src/shared/gm';

const baseRule: SiteRule = {
  id: 'test-site',
  name: '测试站',
  url: '.*',
  contentSelector: '#content',
};

function makeChapter(overrides: Partial<ParsedChapter> = {}): ParsedChapter {
  return {
    bookTitle: '测试书',
    chapterTitle: '第一章 开端',
    documentTitle: '第一章 开端 - 测试书',
    contentHtml: '<p>这是第一段正文内容。</p><p>这是第二段正文内容。</p>',
    contentText: '这是第一段正文内容。这是第二段正文内容。',
    prevUrl: 'https://example.com/novel/1',
    nextUrl: 'https://example.com/novel/3',
    indexUrl: 'https://example.com/novel/index',
    ...overrides,
  };
}

describe('阅读容器渲染', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '<title>原始标题</title>';
  });

  it('原页面主体被替换为阅读容器', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const container = document.querySelector('.nr-reader-container');
    expect(container).not.toBeNull();
    expect(document.querySelector('#original')).toBeNull();
    expect(document.body.contains(container)).toBe(true);
  });

  it('应包含内容区域', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const contentArea = document.querySelector('.nr-content-area');
    expect(contentArea).not.toBeNull();
  });

  it('应渲染章节标题和内容', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const title = document.querySelector('.nr-chapter-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toContain('第一章 开端');

    const body = document.querySelector('.nr-chapter-body');
    expect(body).not.toBeNull();
    expect(body!.innerHTML).toContain('<p>这是第一段正文内容。</p>');
  });

  it('应渲染设置按钮', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const btn = document.querySelector('.nr-settings-btn');
    expect(btn).not.toBeNull();
  });

  it('应渲染侧栏章节列表', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const sidebar = document.querySelector('.nr-sidebar');
    expect(sidebar).not.toBeNull();

    const items = document.querySelectorAll('.nr-sidebar-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('第一章 开端');
    expect(items[0].classList.contains('active')).toBe(true);
  });

  it('应渲染底部导航', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const nav = document.querySelector('.nr-bottom-nav');
    expect(nav).not.toBeNull();

    const links = nav!.querySelectorAll('a');
    expect(links.length).toBe(3);
    expect(links[0].textContent).toBe('上一章');
    expect(links[1].textContent).toBe('目录');
    expect(links[2].textContent).toBe('下一章');
  });
});

describe('章节追加', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
  });

  it('当前章和下一章按顺序渲染', () => {
    const ch1 = makeChapter({ chapterTitle: '第一章 开端' });
    const ch2 = makeChapter({ chapterTitle: '第二章 发展' });

    renderReaderView(ch1, baseRule, [], {});
    appendChapter(ch2);

    const chapters = document.querySelectorAll('.nr-chapter');
    expect(chapters.length).toBe(2);

    const title1 = chapters[0].querySelector('.nr-chapter-title');
    const title2 = chapters[1].querySelector('.nr-chapter-title');
    expect(title1!.textContent).toContain('第一章 开端');
    expect(title2!.textContent).toContain('第二章 发展');

    const state = getReaderState();
    expect(state).not.toBeNull();
    expect(state!.chapters.length).toBe(2);
  });

  it('每章追加后新增侧栏项', () => {
    const ch1 = makeChapter({ chapterTitle: '第一章' });
    const ch2 = makeChapter({ chapterTitle: '第二章' });
    const ch3 = makeChapter({ chapterTitle: '第三章' });

    renderReaderView(ch1, baseRule, [], {});
    appendChapter(ch2);

    let items = document.querySelectorAll('.nr-sidebar-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('第一章');
    expect(items[1].textContent).toContain('第二章');

    appendChapter(ch3);
    items = document.querySelectorAll('.nr-sidebar-item');
    expect(items.length).toBe(3);
    expect(items[2].textContent).toContain('第三章');
  });

  it('追加后更新底部导航链接', () => {
    const ch1 = makeChapter({
      chapterTitle: '第一章',
      nextUrl: 'https://example.com/novel/3',
    });
    const ch2 = makeChapter({
      chapterTitle: '第二章',
      prevUrl: 'https://example.com/novel/2',
      nextUrl: 'https://example.com/novel/4',
    });

    renderReaderView(ch1, baseRule, [], {});
    appendChapter(ch2);

    const nav = document.querySelector('.nr-bottom-nav');
    const links = nav!.querySelectorAll('a');
    expect(links[0].textContent).toBe('上一章');
    expect(links[2].textContent).toBe('下一章');
  });
});

describe('滚动高亮当前章节', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
  });

  it('滚动到不同章节时 active 状态变化', () => {
    const ch1 = makeChapter({ chapterTitle: '第一章' });
    const ch2 = makeChapter({ chapterTitle: '第二章' });

    renderReaderView(ch1, baseRule, [], {});
    appendChapter(ch2);

    let items = document.querySelectorAll('.nr-sidebar-item');
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[1].classList.contains('active')).toBe(false);

    const state = getReaderState();
    expect(state!.activeIndex).toBe(0);

    scrollToChapter(1);

    items = document.querySelectorAll('.nr-sidebar-item');
    expect(items[0].classList.contains('active')).toBe(false);
    expect(items[1].classList.contains('active')).toBe(true);
  });
});

describe('底部导航', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
  });

  it('上一页、目录、下一页链接正确', () => {
    const chapter = makeChapter({
      prevUrl: 'https://example.com/novel/1',
      indexUrl: 'https://example.com/novel/index',
      nextUrl: 'https://example.com/novel/3',
    });

    renderReaderView(chapter, baseRule, [], {});

    const nav = document.querySelector('.nr-bottom-nav');
    const links = nav!.querySelectorAll('a');

    expect(links[0].getAttribute('href')).toBe('https://example.com/novel/1');
    expect(links[1].getAttribute('href')).toBe('https://example.com/novel/index');
    expect(links[2].getAttribute('href')).toBe('https://example.com/novel/3');
  });

  it('无上一页时上一章链接应隐藏', () => {
    const chapter = makeChapter({ prevUrl: undefined, nextUrl: '/novel/3' });
    renderReaderView(chapter, baseRule, [], {});

    const links = document.querySelectorAll('.nr-bottom-nav a');
    expect(links[0].style.visibility).toBe('hidden');
    expect(links[2].style.visibility).toBe('');
  });

  it('无下一页时下一章链接应隐藏', () => {
    const chapter = makeChapter({ prevUrl: '/novel/1', nextUrl: undefined });
    renderReaderView(chapter, baseRule, [], {});

    const links = document.querySelectorAll('.nr-bottom-nav a');
    expect(links[0].style.visibility).toBe('');
    expect(links[2].style.visibility).toBe('hidden');
  });

  it('无目录时目录链接应隐藏', () => {
    const chapter = makeChapter({ indexUrl: undefined });
    renderReaderView(chapter, baseRule, [], {});

    const links = document.querySelectorAll('.nr-bottom-nav a');
    expect(links[1].style.visibility).toBe('hidden');
  });
});

describe('安静模式', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
  });

  it('侧栏、设置按钮可隐藏和恢复', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    expect(isQuietMode()).toBe(false);

    toggleQuietMode();

    expect(isQuietMode()).toBe(true);
    const container = document.querySelector('.nr-reader-container');
    expect(container!.classList.contains('nr-quiet')).toBe(true);

    toggleQuietMode();

    expect(isQuietMode()).toBe(false);
    expect(container!.classList.contains('nr-quiet')).toBe(false);
  });
});

describe('移动端 viewport 修正', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
  });

  it('无 viewport meta 时应自动注入', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute('content')).toContain('width=device-width');
  });

  it('已有 viewport meta 时不重复注入', () => {
    const existingMeta = document.createElement('meta');
    existingMeta.name = 'viewport';
    existingMeta.content = 'width=1024';
    document.head.appendChild(existingMeta);

    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    const metas = document.querySelectorAll('meta[name="viewport"]');
    expect(metas.length).toBe(1);
    expect(metas[0].getAttribute('content')).toBe('width=1024');
  });
});

describe('连续加载', () => {
  beforeEach(() => {
    destroyReaderView();
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
    vi.clearAllMocks();
  });

  it('navigateToChapter 成功后章节追加且无错误指示器', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(
      `<html><body><h1>第二章 发展</h1><div id="content"><p>正文内容需要足够长的文字来确保通过阈值检测，这里继续填充文字使得文本长度超过VIP检测的最小阈值。添加更多内容。</p></div><a href="/novel/3">下一章</a></body></html>`,
    );

    const ch1 = makeChapter({ chapterTitle: '第一章', nextUrl: 'https://example.com/novel/2' });
    renderReaderView(ch1, baseRule, [], {});

    await navigateToChapter('https://example.com/novel/2');

    const chapters = document.querySelectorAll('.nr-chapter');
    expect(chapters.length).toBe(2);
    expect(document.querySelector('.nr-loading-indicator')).toBeNull();
    expect(document.querySelector('.nr-error-indicator')).toBeNull();
  });

  it('navigateToChapter 失败后显示错误指示器含手动打开链接', async () => {
    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'));

    const ch1 = makeChapter({ chapterTitle: '第一章', nextUrl: 'https://example.com/novel/2' });
    renderReaderView(ch1, baseRule, [], {});

    await navigateToChapter('https://example.com/novel/2');

    const errorEl = document.querySelector('.nr-error-indicator');
    expect(errorEl).not.toBeNull();
    const link = errorEl!.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://example.com/novel/2');
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.textContent).toContain('手动打开下一页');
  });

  it('加载成功后再加载同一 URL 应跳过', async () => {
    vi.mocked(gmFetch)
      .mockResolvedValueOnce(
        `<html><body><h1>第二章</h1><div id="content"><p>正文内容需要足够长的文字来确保通过阈值检测，这里继续填充使得文本长度超过VIP检测的最小阈值。添加更多内容以通过校验。</p></div></body></html>`,
      );

    const ch1 = makeChapter({ chapterTitle: '第一章', nextUrl: 'https://example.com/novel/2' });
    renderReaderView(ch1, baseRule, [], {});

    await navigateToChapter('https://example.com/novel/2');
    await navigateToChapter('https://example.com/novel/2');

    expect(gmFetch).toHaveBeenCalledTimes(1);
  });
});

describe('销毁视图清理', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="original">原始页面内容</div>';
    document.head.innerHTML = '';
  });

  it('destroyReaderView 应移除所有阅读器元素', () => {
    const chapter = makeChapter();
    renderReaderView(chapter, baseRule, [], {});

    destroyReaderView();

    expect(document.querySelector('.nr-reader-container')).toBeNull();
    expect(document.querySelector('.nr-bottom-nav')).toBeNull();
    expect(document.querySelector('.nr-settings-btn')).toBeNull();
    expect(document.querySelector('.nr-sidebar')).toBeNull();
    expect(document.querySelector('.nr-loading-indicator')).toBeNull();
    expect(document.querySelector('.nr-error-indicator')).toBeNull();
  });
});
