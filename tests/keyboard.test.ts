import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initKeyboard, destroyKeyboard, type KeyboardHandlers } from '../src/ui/keyboard';
import { closePreferencesPanel, isPanelOpen, openPreferencesPanel } from '../src/ui/preferences-panel';

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

function createReaderDOM(): void {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'nr-reader-container';
  const content = document.createElement('div');
  content.className = 'nr-content-area';
  content.style.height = '2000px';
  container.appendChild(content);
  document.body.appendChild(container);

  const ch1 = document.createElement('div');
  ch1.className = 'nr-chapter';
  ch1.setAttribute('data-chapter-index', '0');
  ch1.style.height = '900px';
  content.appendChild(ch1);

  const ch2 = document.createElement('div');
  ch2.className = 'nr-chapter';
  ch2.setAttribute('data-chapter-index', '1');
  ch2.style.height = '900px';
  content.appendChild(ch2);
}

function sendKey(key: string, options: Partial<KeyboardEventInit> = {}): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    }),
  );
}

describe('快捷键系统', () => {
  beforeEach(() => {
    destroyKeyboard();
    closePreferencesPanel();
    document.body.innerHTML = '';
  });

  it('Enter 应触发 onOpenIndex', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onOpenIndex: handler });

    sendKey('Enter');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ArrowLeft 应触发 onPrevChapter', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onPrevChapter: handler });

    sendKey('ArrowLeft');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ArrowRight 应触发 onNextChapter', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onNextChapter: handler });

    sendKey('ArrowRight');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Escape 在面板打开时应关闭面板', () => {
    createReaderDOM();
    initKeyboard({});
    openPreferencesPanel();
    expect(isPanelOpen()).toBe(true);

    sendKey('Escape');
    expect(isPanelOpen()).toBe(false);
  });

  it('Escape 在面板关闭时不应触发任何 handler', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onOpenIndex: handler });

    sendKey('Escape');
    expect(handler).not.toHaveBeenCalled();
  });

  it('逗号应向上滚动内容区', () => {
    createReaderDOM();
    initKeyboard({});
    const content = document.querySelector('.nr-content-area') as HTMLElement;
    content.scrollTop = 500;
    Object.defineProperty(content, 'clientHeight', { value: 400, configurable: true });

    sendKey(',');

    expect(content.scrollTop).toBeLessThan(500);
  });

  it('句号应向下滚动内容区', () => {
    createReaderDOM();
    initKeyboard({});
    const content = document.querySelector('.nr-content-area') as HTMLElement;
    content.scrollTop = 100;
    Object.defineProperty(content, 'clientHeight', { value: 400, configurable: true });

    sendKey('.');

    expect(content.scrollTop).toBeGreaterThan(100);
  });

  it('Ctrl+, 应打开设置面板', () => {
    createReaderDOM();
    initKeyboard({});

    sendKey(',', { ctrlKey: true });
    expect(isPanelOpen()).toBe(true);
  });

  it('Ctrl+B 应触发 onToggleSidebar', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onToggleSidebar: handler });

    sendKey('b', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Q 应触发 onToggleQuietMode', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onToggleQuietMode: handler });

    sendKey('q', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('面板打开时除 Escape 外的快捷键不应触发', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onOpenIndex: handler });
    openPreferencesPanel();

    sendKey('Enter');
    expect(handler).not.toHaveBeenCalled();
  });

  it('input 聚焦时快捷键不应触发', () => {
    createReaderDOM();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const handler = vi.fn();
    initKeyboard({ onOpenIndex: handler });

    sendKey('Enter');
    expect(handler).not.toHaveBeenCalled();
  });

  it('textarea 聚焦时快捷键不应触发', () => {
    createReaderDOM();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const handler = vi.fn();
    initKeyboard({ onNextChapter: handler });

    sendKey('ArrowRight');
    expect(handler).not.toHaveBeenCalled();
  });

  it('destroyKeyboard 应移除事件监听', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard({ onOpenIndex: handler });

    destroyKeyboard();

    sendKey('Enter');
    expect(handler).not.toHaveBeenCalled();
  });

  it('initKeyboard 返回的清理函数应移除事件监听', () => {
    createReaderDOM();
    const handler = vi.fn();
    const cleanup = initKeyboard({ onOpenIndex: handler });

    cleanup();

    sendKey('Enter');
    expect(handler).not.toHaveBeenCalled();
  });

  it('快捷键系统不注册朗读相关键位', () => {
    createReaderDOM();
    // Verify no speech API calls or speech-related bindings exist
    const handler = vi.fn();

    // Init keyboard with all handlers
    initKeyboard({
      onOpenIndex: handler,
      onPrevChapter: handler,
      onNextChapter: handler,
      onToggleSidebar: handler,
      onToggleQuietMode: handler,
      onOpenSettings: handler,
    });

    // No handler should be activated for unmapped keys
    sendKey('F10'); // arbitrary unmapped key
    expect(handler).not.toHaveBeenCalled();

    destroyKeyboard();
  });

  it('自定义快捷键绑定应生效', () => {
    createReaderDOM();
    const handler = vi.fn();
    initKeyboard(
      { onOpenIndex: handler },
      { openSettings: 'ctrl+shift+o' },
    );

    sendKey('o', { ctrlKey: true, shiftKey: true });
    expect(isPanelOpen()).toBe(true);
  });

  it('通过设置面板修改快捷键后应即时生效', () => {
    createReaderDOM();
    const handler = vi.fn();
    let cleanup = initKeyboard({ onOpenIndex: handler });

    // Original binding: Enter triggers
    sendKey('Enter');
    expect(handler).toHaveBeenCalledTimes(1);
    handler.mockClear();

    // Open panel with callback that re-inits keyboard on keybinding change
    openPreferencesPanel((key, value) => {
      if (key === 'keybindings') {
        if (cleanup) {
          cleanup();
        }
        const bindings = value as Record<string, string>;
        cleanup = initKeyboard({ onOpenIndex: handler }, bindings);
      }
    });

    // Modify keybinding: change openIndex from Enter to F5
    const textareas = document.querySelectorAll('.nr-panel textarea');
    const kbTextarea = Array.from(textareas).find(
      (ta) => (ta as HTMLTextAreaElement).previousElementSibling?.textContent?.includes('快捷键'),
    ) as HTMLTextAreaElement | undefined;

    if (kbTextarea) {
      const newBindings = { openIndex: 'f5' };
      kbTextarea.value = JSON.stringify(newBindings, null, 2);
      kbTextarea.dispatchEvent(new Event('change'));
    }

    // Close panel — keyboard should now use new bindings
    closePreferencesPanel();
    expect(isPanelOpen()).toBe(false);

    // Old key (Enter) should no longer trigger
    sendKey('Enter');
    expect(handler).not.toHaveBeenCalled();

    // New key (F5) should trigger
    sendKey('F5');
    expect(handler).toHaveBeenCalledTimes(1);

    if (cleanup) cleanup();
  });
});
