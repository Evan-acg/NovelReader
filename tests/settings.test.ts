import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAllSettings, saveSetting, getSetting, setSetting } from '../src/settings/storage';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings/schema';

vi.mock('../src/shared/gm', () => {
  const store = new Map<string, string>();
  return {
    gmGetValue: vi.fn((key: string, def: string) => {
      return store.has(key) ? store.get(key)! : def;
    }),
    gmSetValue: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    gmAddStyle: vi.fn(),
    gmFetch: vi.fn(),
  };
});

import { gmGetValue, gmSetValue } from '../src/shared/gm';

describe('设置默认值', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('首次读取 loadAllSettings 应返回全部默认值', () => {
    const settings = loadAllSettings();
    expect(settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(settings.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
    expect(settings.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
    expect(settings.contentWidth).toBe(DEFAULT_SETTINGS.contentWidth);
    expect(settings.convertToTraditional).toBe(false);
    expect(settings.splitContent).toBe(false);
    expect(settings.hideSidebar).toBe(false);
    expect(settings.hideFooterNav).toBe(false);
    expect(settings.hidePreferencesButton).toBe(false);
    expect(settings.remainHeight).toBe(300);
    expect(settings.maxRetries).toBe(2);
    expect(settings.retryDelay).toBe(2000);
    expect(settings.imagePreload).toBe(true);
    expect(settings.debug).toBe(false);
    expect(settings.siteRulesUrl).toBe(DEFAULT_SETTINGS.siteRulesUrl);
    expect(settings.textRulesUrl).toBe(DEFAULT_SETTINGS.textRulesUrl);
    expect(settings.enabledTextRuleGroups).toEqual([]);
    expect(settings.keybindings).toEqual({});
    expect(settings.disableAutoLaunch).toBe(false);
    expect(settings.booklinkEnable).toBe(true);
    expect(settings.addNextPageToHistory).toBe(true);
    expect(settings.doubleClickPause).toBe(true);
    expect(settings.scrollAnimate).toBe(true);
  });
});

describe('设置保存', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveSetting 后 loadAllSettings 应返回保存的值', () => {
    saveSetting('fontSize', 22);
    saveSetting('convertToTraditional', true);
    saveSetting('hideSidebar', true);
    saveSetting('remainHeight', 500);
    saveSetting('disableAutoLaunch', true);

    const settings = loadAllSettings();
    expect(settings.fontSize).toBe(22);
    expect(settings.convertToTraditional).toBe(true);
    expect(settings.hideSidebar).toBe(true);
    expect(settings.remainHeight).toBe(500);
    expect(settings.disableAutoLaunch).toBe(true);
  });

  it('保存布尔值后应正确还原 true/false', () => {
    saveSetting('convertToTraditional', true);
    expect(loadAllSettings().convertToTraditional).toBe(true);

    saveSetting('convertToTraditional', false);
    expect(loadAllSettings().convertToTraditional).toBe(false);

    saveSetting('debug', true);
    expect(loadAllSettings().debug).toBe(true);

    saveSetting('debug', false);
    expect(loadAllSettings().debug).toBe(false);
  });

  it('保存数字值后应正确还原', () => {
    saveSetting('fontSize', 20);
    saveSetting('lineHeight', 2.0);
    saveSetting('contentWidth', 900);
    saveSetting('remainHeight', 400);
    saveSetting('maxRetries', 5);
    saveSetting('retryDelay', 5000);

    const s = loadAllSettings();
    expect(s.fontSize).toBe(20);
    expect(s.lineHeight).toBe(2.0);
    expect(s.contentWidth).toBe(900);
    expect(s.remainHeight).toBe(400);
    expect(s.maxRetries).toBe(5);
    expect(s.retryDelay).toBe(5000);
  });

  it('保存 JSON 数组和对象后应正确还原', () => {
    saveSetting('enabledTextRuleGroups', ['ads', 'pinyin']);
    saveSetting('keybindings', { openSettings: 'ctrl+,' });

    const s = loadAllSettings();
    expect(s.enabledTextRuleGroups).toEqual(['ads', 'pinyin']);
    expect(s.keybindings).toEqual({ openSettings: 'ctrl+,' });
  });

  it('旧版 getSetting/setSetting 仍正常工作', () => {
    setSetting('testKey', 'testValue');
    expect(getSetting('testKey', 'default')).toBe('testValue');
    expect(getSetting('nonexistent', 'fallback')).toBe('fallback');
  });

  it('存储值为空字符串时使用默认值', () => {
    saveSetting('fontSize', 20);
    let s = loadAllSettings();
    expect(s.fontSize).toBe(20);

    setSetting('fontSize', '');
    s = loadAllSettings();
    expect(s.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
  });

  it('非法数字字符串应回退默认值', () => {
    setSetting('fontSize', 'not-a-number');
    const s = loadAllSettings();
    expect(s.fontSize).toBe(DEFAULT_SETTINGS.fontSize);

    setSetting('lineHeight', 'NaN');
    const s2 = loadAllSettings();
    expect(s2.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
  });

  it('远程地址默认使用 GitHub raw 链接', () => {
    const s = loadAllSettings();
    expect(s.siteRulesUrl).toBe('https://raw.githubusercontent.com/Evan-acg/NovelReader/rules/site/site-rules.json');
    expect(s.textRulesUrl).toBe('https://raw.githubusercontent.com/Evan-acg/NovelReader/rules/replace/text-rules.json');
    expect(s.s2tRulesUrl).toBe('https://raw.githubusercontent.com/Evan-acg/NovelReader/rules/s2t/s2t-rules.json');
  });

  it('远程地址可通过 saveSetting 覆盖', () => {
    saveSetting('siteRulesUrl', 'https://example.com/rules.json');
    saveSetting('textRulesUrl', 'https://example.com/text.json');
    expect(loadAllSettings().siteRulesUrl).toBe('https://example.com/rules.json');
    expect(loadAllSettings().textRulesUrl).toBe('https://example.com/text.json');
  });

  it('样式设置即时生效', () => {
    saveSetting('fontFamily', 'serif');
    saveSetting('fontSize', 24);
    saveSetting('lineHeight', 2.2);
    saveSetting('contentWidth', 700);

    const s = loadAllSettings();
    expect(s.fontFamily).toBe('serif');
    expect(s.fontSize).toBe(24);
    expect(s.lineHeight).toBe(2.2);
    expect(s.contentWidth).toBe(700);
  });
});

describe('设置面板与快捷键中不存在朗读入口', () => {
  it('默认设置中不包含任何 speech 相关键', () => {
    const keys = Object.keys(DEFAULT_SETTINGS);
    const speechKeys = keys.filter((k) => k.toLowerCase().includes('speech'));
    expect(speechKeys).toEqual([]);
  });

  it('设置键名列表中不包含 openSpeechKey', () => {
    const keys = Object.keys(DEFAULT_SETTINGS);
    expect(keys).not.toContain('openSpeechKey');
    expect(keys).not.toContain('speechRate');
    expect(keys).not.toContain('speechVolume');
    expect(keys).not.toContain('speechVoice');
  });
});
