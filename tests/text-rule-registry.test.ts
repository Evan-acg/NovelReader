import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTextRuleRegistry, getCombinedTextRules, getTextRuleGroups, resetTextRuleRegistry } from '../src/text-rules/text-rule-registry';

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
  groups: [
    {
      id: 'ads',
      name: '广告清理',
      enabledByDefault: true,
      rules: [
        { pattern: '请记住本站.*', replacement: '', flags: 'g' },
        { pattern: '广告.*', replacement: '[广告已清理]', flags: 'g' },
      ],
    },
    {
      id: 'pinyin',
      name: '拼音字还原',
      enabledByDefault: true,
      rules: [
        { pattern: '\\bbā\\b', replacement: '巴', flags: 'g' },
      ],
    },
    {
      id: 'experimental',
      name: '实验性规则',
      enabledByDefault: false,
      rules: [
        { pattern: 'test', replacement: 'TEST' },
      ],
    },
  ],
};

describe('文本规则注册与加载', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
    resetTextRuleRegistry();
  });

  it('initTextRuleRegistry 应加载远程规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const rules = getCombinedTextRules();
    expect(rules.length).toBe(3);
    expect(rules[0].pattern).toBe('请记住本站.*');
  });

  it('应缓存远程文本规则', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const cached = mockStorage['textRulesCache'];
    expect(cached).toBeDefined();
    const parsed = JSON.parse(cached);
    expect(parsed.groups).toHaveLength(3);
  });

  it('默认不启用的规则组不应加载', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const rules = getCombinedTextRules();
    const experimental = rules.filter((r) => r.pattern === 'test');
    expect(experimental).toHaveLength(0);
  });

  it('远程失败时应回退到缓存', async () => {
    vi.mocked(gmFetch).mockRejectedValueOnce(new Error('Network error'));

    mockStorage['textRulesCache'] = JSON.stringify({
      version: 1,
      updatedAt: '2026-01-01',
      groups: [
        {
          id: 'cached-ads',
          name: '缓存广告',
          enabledByDefault: true,
          rules: [
            { pattern: 'cached-ad', replacement: '' },
          ],
        },
      ],
    });

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const rules = getCombinedTextRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].pattern).toBe('cached-ad');
  });

  it('远程失败且无缓存时应返回空规则', async () => {
    vi.mocked(gmFetch).mockRejectedValueOnce(new Error('Network error'));

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const rules = getCombinedTextRules();
    expect(rules).toHaveLength(0);
  });

  it('自定义替换规则应追加到末尾', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    mockStorage['customReplaceRules'] = JSON.stringify([
      { pattern: 'custom-pattern', replacement: 'CUSTOM' },
      { pattern: 'pattern2', replacement: 'REPLACED' },
    ]);

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const rules = getCombinedTextRules();
    expect(rules.length).toBe(5);

    expect(rules[rules.length - 2].pattern).toBe('custom-pattern');
    expect(rules[rules.length - 1].pattern).toBe('pattern2');
  });

  it('getTextRuleGroups 应返回所有规则组', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initTextRuleRegistry('https://example.com/text-rules.json');

    const groups = getTextRuleGroups();
    expect(groups).toHaveLength(3);
    expect(groups[0].id).toBe('ads');
    expect(groups[1].id).toBe('pinyin');
    expect(groups[2].id).toBe('experimental');
  });

  it('重复调用 initTextRuleRegistry 不应重复初始化', async () => {
    vi.mocked(gmFetch).mockResolvedValueOnce(JSON.stringify(mockRemoteRuleSet));

    await initTextRuleRegistry('https://example.com/text-rules.json');
    await initTextRuleRegistry('https://example.com/text-rules.json');

    expect(gmFetch).toHaveBeenCalledTimes(1);
  });
});
