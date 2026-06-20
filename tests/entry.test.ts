import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStorage: Record<string, string> = {};

vi.mock('../src/shared/gm', () => ({
  gmGetValue: (key: string, defaultValue = '') => mockStorage[key] ?? defaultValue,
  gmSetValue: vi.fn(),
  gmFetch: vi.fn(),
  gmAddStyle: vi.fn(),
  gmOpenInTab: vi.fn(),
}));

vi.mock('../src/core/app', () => ({
  initApp: vi.fn(),
}));

import { initApp } from '../src/core/app';
import { loadAllSettings } from '../src/settings/storage';

describe('disableAutoLaunch 入口行为', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  function createManualStartButton(): HTMLElement | null {
    const settings = loadAllSettings();
    if (settings.disableAutoLaunch) {
      const btn = document.createElement('button');
      btn.className = 'nr-manual-start';
      btn.textContent = '📖 阅读模式';
      btn.addEventListener('click', () => {
        btn.remove();
        initApp();
      });
      document.body.appendChild(btn);
      return btn;
    }
    return null;
  }

  it('disableAutoLaunch=true 时应渲染手动启动按钮', () => {
    mockStorage['disableAutoLaunch'] = 'true';

    const btn = createManualStartButton();
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('阅读模式');
    expect(initApp).not.toHaveBeenCalled();
  });

  it('点击手动启动按钮应调用 initApp 并移除按钮', () => {
    mockStorage['disableAutoLaunch'] = 'true';

    const btn = createManualStartButton()!;
    btn.click();
    expect(initApp).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.nr-manual-start')).toBeNull();
  });

  it('disableAutoLaunch=false 时不渲染按钮', () => {
    mockStorage['disableAutoLaunch'] = 'false';

    const btn = createManualStartButton();
    expect(btn).toBeNull();
    expect(document.querySelector('.nr-manual-start')).toBeNull();
  });
});
