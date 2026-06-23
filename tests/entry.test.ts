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

vi.mock('../src/ui/reader-view', () => ({
  destroyReaderView: vi.fn(),
}));

import { initApp } from '../src/core/app';

function setReadyState(value: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value,
  });
}

describe('disableAutoLaunch 入口行为', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    document.body.innerHTML = '<div id="content">正文内容</div>';
    vi.clearAllMocks();
  });

  it('默认（disableAutoLaunch=true）应渲染切换按钮，不自动进入', () => {
    mockStorage['disableAutoLaunch'] = 'true';
    const btn = document.createElement('button');
    btn.className = 'nr-toggle-btn';
    btn.textContent = '📖 阅读模式';
    document.body.appendChild(btn);

    expect(document.querySelector('.nr-toggle-btn')).not.toBeNull();
    expect(initApp).not.toHaveBeenCalled();
  });

  it('disableAutoLaunch=false 应自动进入', () => {
    mockStorage['disableAutoLaunch'] = 'false';

    const btn = document.createElement('button');
    btn.className = 'nr-toggle-btn';
    btn.textContent = '📖 阅读模式';
    document.body.appendChild(btn);

    const isAutoLaunch = !(mockStorage['disableAutoLaunch'] === 'true');
    if (isAutoLaunch) {
      document.querySelector('.nr-toggle-btn')?.remove();
      initApp();
    }

    expect(initApp).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.nr-toggle-btn')).toBeNull();
  });
});

describe('userscript 入口启动时机', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    document.body.innerHTML = '<div id="content">正文内容</div>';
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('document 已完成加载时应渲染按钮（默认非阅读模式）', async () => {
    setReadyState('complete');

    await import('../src/userscript/entry');

    expect(document.querySelector('.nr-toggle-btn')).not.toBeNull();
    expect(initApp).not.toHaveBeenCalled();
  });

  it('document 仍在 loading 时应等待 DOMContentLoaded 后渲染按钮', async () => {
    setReadyState('loading');

    await import('../src/userscript/entry');
    expect(document.querySelector('.nr-toggle-btn')).toBeNull();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(document.querySelector('.nr-toggle-btn')).not.toBeNull();
    expect(initApp).not.toHaveBeenCalled();
  });
});
