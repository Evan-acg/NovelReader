import { isPanelOpen, closePreferencesPanel, openPreferencesPanel } from './preferences-panel';

export interface KeyboardHandlers {
  onOpenIndex?: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  onToggleSidebar?: () => void;
  onToggleQuietMode?: () => void;
  onOpenSettings?: () => void;
}

const DEFAULT_KEYBINDINGS: Record<string, string> = {
  openSettings: 'ctrl+,',
  toggleSidebar: 'ctrl+b',
  toggleQuietMode: 'ctrl+q',
};

let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let customBindings: Record<string, string> = {};

function shouldIgnore(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.getAttribute?.('contenteditable') === 'true') return true;
  return false;
}

function matchesBinding(e: KeyboardEvent, binding: string): boolean {
  const parts = binding.toLowerCase().split('+');
  const modifiers = parts.filter((p) => p !== parts[parts.length - 1]);
  const key = parts[parts.length - 1];

  const ctrlRequired = modifiers.includes('ctrl');
  const shiftRequired = modifiers.includes('shift');
  const altRequired = modifiers.includes('alt');

  if (e.ctrlKey !== ctrlRequired) return false;
  if (e.shiftKey !== shiftRequired) return false;
  if (e.altKey !== altRequired) return false;

  return e.key.toLowerCase() === key;
}

function getScrollContainer(): HTMLElement | null {
  return document.querySelector('.nr-content-area') as HTMLElement | null;
}

export function initKeyboard(handlers: KeyboardHandlers, keybindings?: Record<string, string>): () => void {
  customBindings = { ...DEFAULT_KEYBINDINGS, ...keybindings };

  keydownHandler = (e: KeyboardEvent) => {
    if (shouldIgnore()) return;

    if (e.key === 'Escape') {
      if (isPanelOpen()) {
        e.preventDefault();
        closePreferencesPanel();
        return;
      }
      return;
    }

    if (isPanelOpen()) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handlers.onOpenIndex?.();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlers.onPrevChapter?.();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handlers.onNextChapter?.();
      return;
    }

    if (e.key === ',' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const container = getScrollContainer();
      if (container) {
        container.scrollTop -= container.clientHeight * 0.8;
      }
      return;
    }

    if (e.key === '.' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const container = getScrollContainer();
      if (container) {
        container.scrollTop += container.clientHeight * 0.8;
      }
      return;
    }

    if (matchesBinding(e, customBindings.openSettings)) {
      e.preventDefault();
      if (handlers.onOpenSettings) {
        handlers.onOpenSettings();
      } else {
        openPreferencesPanel();
      }
      return;
    }

    if (matchesBinding(e, customBindings.toggleSidebar)) {
      e.preventDefault();
      handlers.onToggleSidebar?.();
      return;
    }

    if (matchesBinding(e, customBindings.toggleQuietMode)) {
      e.preventDefault();
      handlers.onToggleQuietMode?.();
      return;
    }
  };

  document.addEventListener('keydown', keydownHandler);

  return () => {
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  };
}

export function destroyKeyboard(): void {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
}
