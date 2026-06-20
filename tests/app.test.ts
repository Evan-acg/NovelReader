import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { initApp } from '../src/core/app';
import { matchRule, resetRegistry } from '../src/rules/rule-registry';
import { resetTextRuleRegistry, getCombinedTextRules } from '../src/text-rules/text-rule-registry';
import { KEYS } from '../src/settings/schema';

const mockStorage: Record<string, string> = {};

vi.mock('../src/shared/gm', () => ({
  gmGetValue: (key: string, defaultValue = '') => mockStorage[key] ?? defaultValue,
  gmSetValue: (key: string, value: string) => { mockStorage[key] = value; },
  gmFetch: vi.fn(),
  gmAddStyle: vi.fn(),
}));

import { gmFetch } from '../src/shared/gm';

const mockSiteRules = {
  version: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
  rules: [
    {
      id: 'test-site',
      name: '测试站',
      url: '^https://www\\.example\\.com/novel/\\d+/\\d+\\.html',
      bookTitleSelector: '.book',
      chapterTitleSelector: '.title',
      contentSelector: '#content',
      prevSelector: '.prev',
      nextSelector: '.next',
    },
  ],
};

const mockTextRules = {
  version: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
  groups: [
    {
      id: 'ads',
      name: '广告清理',
      enabledByDefault: true,
      rules: [{ pattern: '广告', replacement: '' }],
    },
  ],
};

describe('initApp 集成流程', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
    resetRegistry();
    resetTextRuleRegistry();
  });

  it('应加载站点规则和文本规则、匹配 URL 并解析章节', async () => {
    vi.mocked(gmFetch)
      .mockResolvedValueOnce(JSON.stringify(mockSiteRules))
      .mockResolvedValueOnce(JSON.stringify(mockTextRules))
      .mockResolvedValueOnce(JSON.stringify({}));

    const dom = new JSDOM(`
      <html><body>
        <span class="book">测试书</span>
        <h1 class="title">第一章 开端</h1>
        <div id="content">
          <p>这是正文内容，足够长到不会被判定为VIP章节的测试文本，需要填充更多字符来确保超过阈值。</p>
          <p>第二段内容，继续填充确保超过最小文本长度阈值，这样才能验证VIP检测正常工作。</p>
        </div>
        <a class="prev" href="/novel/1/1.html">上一章</a>
        <a class="next" href="/novel/1/3.html">下一章</a>
      </body></html>
    `, { url: 'https://www.example.com/novel/1/2.html' });

    await initApp({
      doc: dom.window.document,
      url: 'https://www.example.com/novel/1/2.html',
      autoLoadNext: false,
    });

    expect(gmFetch).toHaveBeenCalledTimes(3);

    const rule = matchRule('https://www.example.com/novel/1/2.html');
    expect(rule).not.toBeNull();
    expect(rule?.id).toBe('test-site');

    expect(mockStorage['siteRulesCache']).toBeDefined();
    expect(mockStorage['textRulesCache']).toBeDefined();

    const textRules = getCombinedTextRules();
    expect(textRules.length).toBeGreaterThan(0);
  });

  it('无匹配规则时应优雅退出，但仍完成规则加载', async () => {
    vi.mocked(gmFetch)
      .mockResolvedValueOnce(JSON.stringify(mockSiteRules))
      .mockResolvedValueOnce(JSON.stringify(mockTextRules));

    const dom = new JSDOM('<html><body><p>普通页面</p></body></html>', {
      url: 'https://www.unknown.com/page',
    });

    await initApp({
      doc: dom.window.document,
      url: 'https://www.unknown.com/page',
    });

    expect(gmFetch).toHaveBeenCalledTimes(2);

    const rule = matchRule('https://www.unknown.com/page');
    expect(rule).toBeNull();
  });

  it('远程规则失败时应回退缓存并继续', async () => {
    mockStorage['siteRulesCache'] = JSON.stringify(mockSiteRules);
    mockStorage['textRulesCache'] = JSON.stringify(mockTextRules);

    vi.mocked(gmFetch)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockRejectedValueOnce(new Error('网络错误'));

    const dom = new JSDOM(`
      <html><body>
        <span class="book">测试书</span>
        <h1 class="title">第一章</h1>
        <div id="content">
          <p>正文内容正文内容正文内容正文内容正文内容正文内容正文内容正文内容正文内容。</p>
        </div>
      </body></html>
    `, { url: 'https://www.example.com/novel/1/2.html' });

    await initApp({
      doc: dom.window.document,
      url: 'https://www.example.com/novel/1/2.html',
      autoLoadNext: false,
    });

    expect(gmFetch).toHaveBeenCalledTimes(3);

    const rule = matchRule('https://www.example.com/novel/1/2.html');
    expect(rule).not.toBeNull();
    expect(rule?.id).toBe('test-site');
  });

  it('应加载简繁映射并缓存，convertToTraditional 开启时传递给解析器', async () => {
    mockStorage[KEYS.convertToTraditional] = 'true';

    const s2tMapping = { '国': '國', '学': '學', '文': '文' };

    vi.mocked(gmFetch)
      .mockResolvedValueOnce(JSON.stringify(mockSiteRules))
      .mockResolvedValueOnce(JSON.stringify(mockTextRules))
      .mockResolvedValueOnce(JSON.stringify(s2tMapping));

    const dom = new JSDOM(`
      <html><body>
        <span class="book">测试书</span>
        <h1 class="title">第一章 中国文学</h1>
        <div id="content">
          <p>正文内容测试中国文学，需要足够长的文字来确保通过阈值检测，这里继续填充内容。</p>
          <p>第二段内容继续填充，确保超过最小文本长度阈值，以便VIP检测正常工作。</p>
        </div>
        <a class="next" href="/novel/1/3.html">下一章</a>
      </body></html>
    `, { url: 'https://www.example.com/novel/1/2.html' });

    await initApp({
      doc: dom.window.document,
      url: 'https://www.example.com/novel/1/2.html',
      autoLoadNext: false,
    });

    expect(gmFetch).toHaveBeenCalledTimes(3);
    expect(mockStorage[KEYS.s2tRulesCache]).toBeDefined();
    expect(JSON.parse(mockStorage[KEYS.s2tRulesCache])).toEqual(s2tMapping);
  });
});
