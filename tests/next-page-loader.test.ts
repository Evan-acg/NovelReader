import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadNextChapter, preloadImages, clearLoadedUrls, clearFailedUrls, isUrlLoaded, isUrlFailed, markUrlLoaded, isUrlLoading, clearLoadingUrls, markUrlLoading } from '../src/core/next-page-loader';
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
    clearFailedUrls();
    clearLoadingUrls();
    vi.clearAllMocks();
  });

  it('首次加载成功时返回 status=loaded', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(makeHtml('第一章', '测试正文内容，需要足够长的文字来确保通过阈值检测。'));

    const result = await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(result.status).toBe('loaded');
    expect(result.chapter).not.toBeNull();
    expect(result.chapter!.chapterTitle).toContain('第一章');
    expect(gmFetch).toHaveBeenCalledTimes(1);
  });

  it('URL 已加载时返回 status=skipped', async () => {
    markUrlLoaded('https://example.com/novel/2');

    const result = await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(result.status).toBe('skipped');
    expect(result.chapter).toBeNull();
    expect(gmFetch).not.toHaveBeenCalled();
  });

  it('URL 已失败时返回 status=skipped', async () => {
    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'));

    await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions, 2, 10);

    vi.clearAllMocks();

    const result = await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(result.status).toBe('skipped');
    expect(gmFetch).not.toHaveBeenCalled();
  });

  it('首次失败后重试成功', async () => {
    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce(makeHtml('第二章', '正文内容需要足够长的文字来确保通过阈值检测，这里继续填充使其达到最小长度。'));

    const result = await loadNextChapter(
      'https://example.com/novel/2',
      mockRule,
      [],
      cleanOptions,
      2,
      10,
    );

    expect(result.status).toBe('loaded');
    expect(result.chapter).not.toBeNull();
    expect(result.chapter!.chapterTitle).toContain('第二章');
    expect(gmFetch).toHaveBeenCalledTimes(2);
  });

  it('所有重试耗尽返回 status=failed 并标记 URL', async () => {
    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'));

    const result = await loadNextChapter(
      'https://example.com/novel/2',
      mockRule,
      [],
      cleanOptions,
      2,
      10,
    );

    expect(result.status).toBe('failed');
    expect(result.chapter).toBeNull();
    expect(result.error).toBeDefined();
    expect(gmFetch).toHaveBeenCalledTimes(3);
    expect(isUrlFailed('https://example.com/novel/2')).toBe(true);
  });

  it('成功加载后 URL 被标记为已加载', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(makeHtml('第一章', '测试正文内容，确保超过最小文本长度阈值以便通过VIP检测，继续填充更多文字。'));

    await loadNextChapter('https://example.com/novel/2', mockRule, [], cleanOptions);

    expect(isUrlLoaded('https://example.com/novel/2')).toBe(true);
  });

  it('正在加载中的 URL 再次请求应返回 skipped', async () => {
    let resolveFetch: (_: string) => void;
    const fetchPromise = new Promise<string>((resolve) => {
      resolveFetch = resolve;
    });
    vi.mocked(gmFetch).mockReturnValue(fetchPromise);

    const url = 'https://example.com/novel/2';
    markUrlLoading(url);

    const result = await loadNextChapter(url, mockRule, [], cleanOptions);

    expect(result.status).toBe('skipped');
    expect(result.chapter).toBeNull();
    expect(gmFetch).not.toHaveBeenCalled();
  });

  it('加载完成后 URL 从 loading 集合中移除', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(makeHtml('第一章', '测试正文内容确保超过最小文本长度阈值以便通过VIP检测继续填充更多文字。'));

    const url = 'https://example.com/novel/2';
    expect(isUrlLoading(url)).toBe(false);

    await loadNextChapter(url, mockRule, [], cleanOptions);

    expect(isUrlLoading(url)).toBe(false);
    expect(isUrlLoaded(url)).toBe(true);
  });
});

describe('preloadImages', () => {
  it('应将绝对 URL 图片预加载', () => {
    const capturedUrls: string[] = [];
    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      set src(value: string) { capturedUrls.push(value); }
    } as typeof Image;

    const html = '<div><img src="https://example.com/1.jpg"><img src="https://example.com/2.png"></div>';
    preloadImages(html, 'https://example.com/chapter/3');

    expect(capturedUrls).toContain('https://example.com/1.jpg');
    expect(capturedUrls).toContain('https://example.com/2.png');

    globalThis.Image = OriginalImage;
  });

  it('应将相对路径图片转为绝对 URL 预加载', () => {
    const capturedUrls: string[] = [];
    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      set src(value: string) { capturedUrls.push(value); }
    } as typeof Image;

    const html = '<div><img src="/images/1.jpg"><img src="./2.png"></div>';
    preloadImages(html, 'https://example.com/novel/2');

    expect(capturedUrls).toContain('https://example.com/images/1.jpg');
    expect(capturedUrls).toContain('https://example.com/novel/2.png');

    globalThis.Image = OriginalImage;
  });

  it('无图片时不应报错', () => {
    expect(() => preloadImages('<div><p>无图片内容</p></div>', 'https://example.com')).not.toThrow();
  });

  it('应跳过无 src 属性的 img', () => {
    const capturedUrls: string[] = [];
    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      set src(value: string) { capturedUrls.push(value); }
    } as typeof Image;

    preloadImages('<div><img><img src="https://example.com/valid.jpg"></div>', 'https://example.com');

    expect(capturedUrls.length).toBe(1);
    expect(capturedUrls[0]).toBe('https://example.com/valid.jpg');

    globalThis.Image = OriginalImage;
  });
});
