import { describe, it, expect } from 'vitest';
import { validateTextRule, validateTextRuleGroup, validateTextRuleSet } from '../src/text-rules/text-rule-validator';

describe('文本规则校验', () => {
  const validRule = {
    pattern: '广告.*',
    replacement: '',
    flags: 'g',
  };

  it('合法的 TextRule 应通过校验', () => {
    const result = validateTextRule(validRule);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.pattern).toBe('广告.*');
      expect(result.value.replacement).toBe('');
    }
  });

  it('缺少 pattern 应失败', () => {
    const result = validateTextRule({ replacement: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('pattern');
    }
  });

  it('缺少 replacement 应失败', () => {
    const result = validateTextRule({ pattern: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('replacement');
    }
  });

  it('不安全的 flags 应失败', () => {
    const result = validateTextRule({ pattern: 'abc', replacement: '', flags: 'd' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('flags');
    }
  });

  it('无效的正则 pattern 应失败', () => {
    const result = validateTextRule({ pattern: '[invalid', replacement: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('正则');
    }
  });

  it('无 flags 也应通过', () => {
    const result = validateTextRule({ pattern: 'test', replacement: 'ok' });
    expect(result.success).toBe(true);
  });
});

describe('文本规则组校验', () => {
  const validGroup = {
    id: 'ads',
    name: '广告清理',
    enabledByDefault: true,
    rules: [
      { pattern: '广告1', replacement: '' },
      { pattern: '广告2', replacement: '已清理' },
    ],
  };

  it('合法的 TextRuleGroup 应通过', () => {
    const result = validateTextRuleGroup(validGroup);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe('ads');
      expect(result.value.rules).toHaveLength(2);
    }
  });

  it('缺少 id 应失败', () => {
    const { id, ...noId } = validGroup;
    const result = validateTextRuleGroup(noId);
    expect(result.success).toBe(false);
  });

  it('rules 不是数组应失败', () => {
    const result = validateTextRuleGroup({ id: 'test', rules: 'not-array' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('数组');
    }
  });

  it('其中一条规则无效应报告', () => {
    const badGroup = {
      id: 'mixed',
      rules: [
        { pattern: 'ok', replacement: '' },
        { pattern: '[bad', replacement: '' },
      ],
    };
    const result = validateTextRuleGroup(badGroup);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('规则 1');
    }
  });
});

describe('文本规则集校验', () => {
  const validSet = {
    version: 1,
    updatedAt: '2026-01-01',
    groups: [
      {
        id: 'ads',
        name: '广告',
        enabledByDefault: true,
        rules: [{ pattern: 'ad', replacement: '' }],
      },
    ],
  };

  it('合法的 TextRuleSet 应通过', () => {
    const result = validateTextRuleSet(validSet);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.groups).toHaveLength(1);
    }
  });

  it('缺少 version 应失败', () => {
    const { version, ...noVersion } = validSet;
    const result = validateTextRuleSet(noVersion);
    expect(result.success).toBe(false);
  });

  it('groups 不是数组应失败', () => {
    const result = validateTextRuleSet({ version: 1, groups: 'bad' });
    expect(result.success).toBe(false);
  });
});
