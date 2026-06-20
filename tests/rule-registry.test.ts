import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRuleRegistry, matchRule, resetRegistry } from '../src/rules/rule-registry';

const mockStorage: Record<string, string> = {};

vi.mock('../src/shared/gm', () => ({
  gmGetValue: (key: string, defaultValue = '') => mockStorage[key] ?? defaultValue,
  gmSetValue: (key: string, value: string) => { mockStorage[key] = value; },
  gmFetch: vi.fn(),
}));

import { gmFetch } from '../src/shared/gm';

const mockRemoteRuleSet = {
  version: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
  rules: [
    {
      id: 'qidian',
      name: '起点中文网',
      url: '^https://www\\.qidian\\.com/chapter/\\d+/\\d+/',
      titleSelector: 'h1',
      contentSelector: '.content',
    },
    {
      id: 'biquge',
      name: '笔趣阁',
      url: '^https://www\\.biquge\\.com/\\d+/\\d+\\.html',
      contentSelector: '#content',
    },
    {
      id: 'excluded-site',
      name: '排除站点',
      url: '^https://www\\.example\\.com/',
      excludeUrl: '^https://www\\.example\\.com/excluded/',
    },
  ],
};

describe('规则注册与匹配', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
    resetRegistry();
  });

  it('initRuleRegistry 应成功加载远程规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initRuleRegistry('https://example.com/rules.json');

    expect(gmFetch).toHaveBeenCalledWith('https://example.com/rules.json');
  });

  it('initRuleRegistry 应缓存远程规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initRuleRegistry('https://example.com/rules.json');

    const cached = mockStorage['siteRulesCache'];
    expect(cached).toBeDefined();
    const parsed = JSON.parse(cached);
    expect(parsed.rules).toHaveLength(3);
  });

  it('matchRule 应根据 URL 匹配规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initRuleRegistry('https://example.com/rules.json');

    const rule = matchRule('https://www.qidian.com/chapter/123/456/');
    expect(rule).not.toBeNull();
    expect(rule?.id).toBe('qidian');
  });

  it('matchRule 应跳过 excludeUrl 匹配的规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initRuleRegistry('https://example.com/rules.json');

    const rule = matchRule('https://www.example.com/excluded/page');
    expect(rule).toBeNull();
  });

  it('matchRule 对未注册 URL 应返回 null', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initRuleRegistry('https://example.com/rules.json');

    const rule = matchRule('https://www.unknown.com/page');
    expect(rule).toBeNull();
  });

  it('自定义规则应优先于远程规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    mockStorage['customSiteRules'] = JSON.stringify([
      {
        id: 'custom-qidian',
        name: '自定义起点',
        url: '^https://www\\.qidian\\.com/chapter/\\d+/\\d+/',
        titleSelector: 'h2',
      },
    ]);

    await initRuleRegistry('https://example.com/rules.json');

    const rule = matchRule('https://www.qidian.com/chapter/123/456/');
    expect(rule).not.toBeNull();
    expect(rule?.id).toBe('custom-qidian');
    expect(rule?.titleSelector).toBe('h2');
  });

  it('远程规则失败时应回退到缓存', async () => {
    vi.mocked(gmFetch).mockRejectedValueOnce(new Error('Network error'));

    mockStorage['siteRulesCache'] = JSON.stringify({
      version: 1,
      updatedAt: '2026-01-01',
      rules: [
        {
          id: 'cached-site',
          name: '缓存站点',
          url: '^https://cached\\.example\\.com/',
        },
      ],
    });

    await initRuleRegistry('https://example.com/rules.json');

    const rule = matchRule('https://cached.example.com/page');
    expect(rule).not.toBeNull();
    expect(rule?.id).toBe('cached-site');
  });

  it('远程失败且无缓存时应返回空规则集', async () => {
    vi.mocked(gmFetch).mockRejectedValueOnce(new Error('Network error'));

    await initRuleRegistry('https://example.com/rules.json');

    const rule = matchRule('https://www.qidian.com/chapter/123/456/');
    expect(rule).toBeNull();
  });

  it('重复调用 initRuleRegistry 不应重复初始化', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initRuleRegistry('https://example.com/rules.json');
    await initRuleRegistry('https://example.com/rules.json');

    expect(gmFetch).toHaveBeenCalledTimes(1);
  });
});
