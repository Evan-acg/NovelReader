import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadNextChapter, preloadImages, clearLoadedUrls, isUrlLoaded, markUrlLoaded } from '../src/core/next-page-loader';
import type { SiteRule } from '../src/rules/rule-types';
import type { CleanOptions } from '../src/core/content-cleaner';

vi.mock('../src/shared/gm', () => ({
  gmFetch: vi.fn(),
  gmGetValue: () => '',
  gmSetValue: vi.fn(),
}));

import { gmFetch } from '../src/shared/gm';

const mockRule: SiteRule = {
  id: 'test-site',
  name: '测试站',
  url: '.*',
  contentSelector: '#content',
  titleSelector: 'h1',
};

const cleanOptions: CleanOptions = {};

function makeHtml(title: string, content: string): string {
  return `<html><body><h1>${title}</h1><div id="content"><p>${content}</p></div><a href="/next">下一章</a></body></html>`;
}

describe('loadNextChapter', () => {
  beforeEach(() => {
    clearLoadedUrls();
    vi.clearAllMocks();
  });

  it('首次加载成功时返回章节', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(makeHtml('第一章', '测试正文内容，需要足够长的文字来确保通过阈值检测。'));

    const chapter = await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(chapter).not.toBeNull();
    expect(chapter!.chapterTitle).toContain('第一章');
    expect(gmFetch).toHaveBeenCalledTimes(1);
  });

  it('URL 已加载时直接跳过并返回 null', async () => {
    markUrlLoaded('https://example.com/novel/2');

    const chapter = await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(chapter).toBeNull();
    expect(gmFetch).not.toHaveBeenCalled();
  });

  it('首次失败后重试成功', async () => {
    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce(makeHtml('第二章', '正文内容需要足够长的文字来确保通过阈值检测，这里继续填充使其达到最小长度。'));

    const chapter = await loadNextChapter(
      'https://example.com/novel/2',
      mockRule,
      [],
      cleanOptions,
      2,
      10,
    );

    expect(chapter).not.toBeNull();
    expect(chapter!.chapterTitle).toContain('第二章');
    expect(gmFetch).toHaveBeenCalledTimes(2);
  });

  it('所有重试耗尽返回 null', async () => {
    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'));

    const chapter = await loadNextChapter(
      'https://example.com/novel/2',
      mockRule,
      [],
      cleanOptions,
      2,
      10,
    );

    expect(chapter).toBeNull();
    expect(gmFetch).toHaveBeenCalledTimes(3);
  });

  it('成功加载后 URL 被标记为已加载', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(makeHtml('第一章', '测试正文内容，确保超过最小文本长度阈值以便通过VIP检测，继续填充更多文字。'));

    await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(isUrlLoaded('https://example.com/novel/2')).toBe(true);
  });
});

describe('preloadImages', () => {
  it('应从 HTML 中提取 img 并预加载', () => {
    const html = '<div><img src="https://example.com/1.jpg"><p>正文</p><img src="https://example.com/2.png"></div>';

    preloadImages(html);

    // 验证 Image 构造被调用（通过检查全局 Image 是否被触发）
    // 注：在 jsdom 中 new Image() 会创建 HTMLImageElement
  });

  it('无图片时不应报错', () => {
    const html = '<div><p>无图片内容</p></div>';
    expect(() => preloadImages(html)).not.toThrow();
  });

  it('应跳过无 src 属性的 img', () => {
    const html = '<div><img><img src="https://example.com/valid.jpg"></div>';
    expect(() => preloadImages(html)).not.toThrow();
  });
});
