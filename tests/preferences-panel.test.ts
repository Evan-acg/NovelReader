import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openPreferencesPanel, closePreferencesPanel, togglePreferencesPanel, isPanelOpen } from '../src/ui/preferences-panel';
import { loadAllSettings, saveSetting } from '../src/settings/storage';

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

import { gmAddStyle } from '../src/shared/gm';

describe('设置面板打开/关闭', () => {
  beforeEach(() => {
    closePreferencesPanel();
    document.body.innerHTML = '';
  });

  it('openPreferencesPanel 应创建面板覆盖层', () => {
    openPreferencesPanel();

    const overlay = document.querySelector('.nr-panel-overlay');
    expect(overlay).not.toBeNull();
    expect(isPanelOpen()).toBe(true);

    const panel = document.querySelector('.nr-panel');
    expect(panel).not.toBeNull();
  });

  it('closePreferencesPanel 应移除面板覆盖层', () => {
    openPreferencesPanel();
    closePreferencesPanel();

    const overlay = document.querySelector('.nr-panel-overlay');
    expect(overlay).toBeNull();
    expect(isPanelOpen()).toBe(false);
  });

  it('togglePreferencesPanel 应切换面板', () => {
    expect(isPanelOpen()).toBe(false);

    togglePreferencesPanel();
    expect(isPanelOpen()).toBe(true);

    togglePreferencesPanel();
    expect(isPanelOpen()).toBe(false);
  });

  it('面板已打开时再次调用 open 不应创建第二个面板', () => {
    openPreferencesPanel();
    openPreferencesPanel();

    const overlays = document.querySelectorAll('.nr-panel-overlay');
    expect(overlays.length).toBe(1);
  });

  it('面板包含关闭按钮', () => {
    openPreferencesPanel();

    const closeBtn = document.querySelector('.nr-panel-close-btn');
    expect(closeBtn).not.toBeNull();
  });

  it('点击关闭按钮应关闭面板', () => {
    openPreferencesPanel();

    const closeBtn = document.querySelector('.nr-panel-close-btn') as HTMLElement;
    closeBtn.click();

    expect(isPanelOpen()).toBe(false);
  });

  it('点击遮罩层应关闭面板', () => {
    openPreferencesPanel();

    const overlay = document.querySelector('.nr-panel-overlay') as HTMLElement;
    overlay.click();

    expect(isPanelOpen()).toBe(false);
  });

  it('点击面板内部不应关闭面板', () => {
    openPreferencesPanel();

    const panel = document.querySelector('.nr-panel') as HTMLElement;
    panel.click();

    expect(isPanelOpen()).toBe(true);
  });
});

describe('设置面板内容', () => {
  beforeEach(() => {
    closePreferencesPanel();
    document.body.innerHTML = '';
  });

  it('面板应包含阅读样式设置区', () => {
    openPreferencesPanel();

    const titles = document.querySelectorAll('.nr-panel-section-title');
    const titleTexts = Array.from(titles).map((t) => t.textContent);
    expect(titleTexts).toContain('阅读样式');
  });

  it('面板应包含功能开关设置区', () => {
    openPreferencesPanel();

    const titles = document.querySelectorAll('.nr-panel-section-title');
    const titleTexts = Array.from(titles).map((t) => t.textContent);
    expect(titleTexts).toContain('功能开关');
  });

  it('面板应包含远程地址设置区', () => {
    openPreferencesPanel();

    const titles = document.querySelectorAll('.nr-panel-section-title');
    const titleTexts = Array.from(titles).map((t) => t.textContent);
    expect(titleTexts).toContain('远程地址');
  });

  it('面板应包含自定义规则设置区', () => {
    openPreferencesPanel();

    const titles = document.querySelectorAll('.nr-panel-section-title');
    const titleTexts = Array.from(titles).map((t) => t.textContent);
    expect(titleTexts).toContain('自定义规则');
  });

  it('面板应包含连续加载设置区', () => {
    openPreferencesPanel();

    const titles = document.querySelectorAll('.nr-panel-section-title');
    const titleTexts = Array.from(titles).map((t) => t.textContent);
    expect(titleTexts).toContain('连续加载');
  });

  it('面板应包含简繁转换复选框', () => {
    openPreferencesPanel();

    const labels = document.querySelectorAll('.nr-panel-row label');
    const labelTexts = Array.from(labels).map((l) => l.textContent);
    expect(labelTexts.some((t) => t?.includes('简繁转换'))).toBe(true);
  });

  it('修改样式设置应触发 onChange 回调', () => {
    const callback = vi.fn();
    openPreferencesPanel(callback);

    const inputs = document.querySelectorAll('input[type="number"]');
    const fontSizeInput = Array.from(inputs).find(
      (inp) => (inp as HTMLInputElement).previousElementSibling?.textContent?.includes('字号'),
    ) as HTMLInputElement | undefined;

    if (fontSizeInput) {
      fontSizeInput.value = '24';
      fontSizeInput.dispatchEvent(new Event('change'));

      expect(callback).toHaveBeenCalled();
    }
  });

  it('面板中不包含朗读相关控件', () => {
    openPreferencesPanel();

    const allText = document.querySelector('.nr-panel')?.textContent ?? '';
    expect(allText).not.toContain('朗读');
    expect(allText).not.toContain('语音');
    expect(allText).not.toContain('speech');
    expect(allText).not.toContain('Speech');
  });
});

describe('设置面板与持久化', () => {
  beforeEach(() => {
    closePreferencesPanel();
    document.body.innerHTML = '';
  });

  it('面板内容应反映当前设置值', () => {
    saveSetting('fontSize', 20);
    saveSetting('convertToTraditional', true);

    openPreferencesPanel();

    const inputs = document.querySelectorAll('input[type="number"]');
    const fontSizeInput = Array.from(inputs).find(
      (inp) => (inp as HTMLInputElement).previousElementSibling?.textContent?.includes('字号'),
    ) as HTMLInputElement | undefined;

    if (fontSizeInput) {
      expect(fontSizeInput.value).toBe('20');
    }
  });

  it('修改面板控件后 loadAllSettings 应反映更新', () => {
    openPreferencesPanel();

    const inputs = document.querySelectorAll('input[type="number"]');
    const fontSizeInput = Array.from(inputs).find(
      (inp) => (inp as HTMLInputElement).previousElementSibling?.textContent?.includes('字号'),
    ) as HTMLInputElement | undefined;

    if (fontSizeInput) {
      fontSizeInput.value = '26';
      fontSizeInput.dispatchEvent(new Event('change'));

      const settings = loadAllSettings();
      expect(settings.fontSize).toBe(26);
    }
  });
});
