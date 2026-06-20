import { describe, it, expect } from 'vitest';
import { validateSiteRule, validateSiteRuleSet } from '../src/rules/rule-validator';

describe('站点规则校验', () => {
  const validRule = {
    id: 'test-site',
    name: '测试站点',
    url: '^https://www\\.example\\.com/novel/\\d+/',
    titleSelector: 'h1',
    contentSelector: '.content',
    prevSelector: 'a.prev',
    nextSelector: 'a.next',
    indexSelector: 'a.index',
  };

  it('合法的 SiteRule 应通过校验', () => {
    const result = validateSiteRule(validRule);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe('test-site');
      expect(result.value.url).toBe(validRule.url);
    }
  });

  it('缺少 id 应失败', () => {
    const { id, ...noId } = validRule;
    const result = validateSiteRule(noId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('id');
    }
  });

  it('缺少 url 应失败', () => {
    const { url, ...noUrl } = validRule;
    const result = validateSiteRule(noUrl);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('url');
    }
  });

  it('url 不是合法的正则表达式应失败', () => {
    const result = validateSiteRule({ ...validRule, url: '[invalid(regex' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('正则');
    }
  });

  it('url 含不安全字符应失败', () => {
    const result = validateSiteRule({ ...validRule, url: 'javascript:alert(1)' });
    expect(result.success).toBe(false);
  });

  it('空规则对象应失败', () => {
    const result = validateSiteRule(null);
    expect(result.success).toBe(false);
  });

  it('非对象应失败', () => {
    const result = validateSiteRule('string');
    expect(result.success).toBe(false);
  });

  it('contentReplaceRules 为合法数组时应通过', () => {
    const result = validateSiteRule({
      ...validRule,
      contentReplaceRules: [
        { pattern: '广告', replacement: '' },
        { pattern: '请记住.*', replacement: '', flags: 'g' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('contentReplaceRules 为非法数组时应失败', () => {
    const result = validateSiteRule({
      ...validRule,
      contentReplaceRules: 'not-an-array',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('数组');
    }
  });

  it('contentReplaceRules 中缺少 pattern 应失败', () => {
    const result = validateSiteRule({
      ...validRule,
      contentReplaceRules: [
        { replacement: '' },
      ] as unknown[],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('pattern');
    }
  });

  it('contentReplaceRules 中含非法 flags 应失败', () => {
    const result = validateSiteRule({
      ...validRule,
      contentReplaceRules: [
        { pattern: 'test', replacement: '', flags: 'invalid!' },
      ] as unknown[],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('flags');
    }
  });
});

describe('站点规则集校验', () => {
  const validRuleSet = {
    version: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    rules: [
      {
        id: 'test-site',
        name: '测试站点',
        url: '^https://www\\.example\\.com/novel/\\d+/',
      },
      {
        id: 'test-site-2',
        name: '测试站点2',
        url: '^https://www\\.example2\\.com/',
        titleSelector: 'h2',
      },
    ],
  };

  it('合法的 SiteRuleSet 应通过校验', () => {
    const result = validateSiteRuleSet(validRuleSet);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.version).toBe(1);
      expect(result.value.rules).toHaveLength(2);
    }
  });

  it('缺少 version 应失败', () => {
    const { version, ...noVersion } = validRuleSet;
    const result = validateSiteRuleSet(noVersion);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('version');
    }
  });

  it('rules 不是数组应失败', () => {
    const result = validateSiteRuleSet({ version: 1, rules: 'not-array' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('数组');
    }
  });

  it('其中一条规则无效应指出索引', () => {
    const badSet = {
      version: 1,
      updatedAt: '',
      rules: [
        { id: 'ok', url: '^https://ok\\.com/' },
        { id: 'bad' },
      ],
    };
    const result = validateSiteRuleSet(badSet);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('索引 1');
    }
  });

  it('空 rules 数组应通过', () => {
    const result = validateSiteRuleSet({ version: 1, updatedAt: '', rules: [] });
    expect(result.success).toBe(true);
  });
});
