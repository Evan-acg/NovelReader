import { gmAddStyle } from '../shared/gm';
import type { Settings } from '../settings/schema';

const READER_CSS = `
.nr-reader-container {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: #f5f5f5;
  color: #333;
  font-family: var(--nr-font-family);
  font-size: var(--nr-font-size);
  line-height: var(--nr-line-height);
  display: flex;
  overflow: hidden;
}
.nr-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: margin-left 0.25s ease, width 0.25s ease;
}
.nr-sidebar-hidden .nr-sidebar {
  margin-left: -220px;
}
.nr-sidebar-header {
  padding: 12px 14px;
  font-weight: 700;
  font-size: 15px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.nr-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}
.nr-sidebar-item {
  display: block;
  padding: 7px 14px;
  font-size: 14px;
  color: #555;
  text-decoration: none;
  border-left: 3px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.nr-sidebar-item:hover {
  background: #f0f0f0;
  color: #222;
}
.nr-sidebar-item.active {
  border-left-color: #4a90d9;
  background: #e8f0fe;
  color: #1a73e8;
  font-weight: 600;
}
.nr-sidebar-toggle {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2147483648;
  width: 24px;
  height: 60px;
  background: #ddd;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  padding: 0;
  transition: left 0.25s ease;
}
.nr-sidebar-hidden .nr-sidebar-toggle {
  left: 0;
}
.nr-sidebar-toggle:hover {
  background: #ccc;
}
.nr-content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 40px 80px 80px;
  max-width: var(--nr-content-max-width);
  margin: 0 auto;
  scroll-behavior: smooth;
}
.nr-chapter {
  margin-bottom: 48px;
}
.nr-chapter-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #4a90d9;
  color: #222;
}
.nr-chapter-body {
  word-break: break-word;
}
.nr-chapter-body p {
  margin: 0 0 1em;
  text-indent: 2em;
}
.nr-chapter-body img {
  max-width: 100%;
  height: auto;
}
.nr-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: #fff;
  border-top: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  z-index: 2147483647;
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.nr-nav-hidden .nr-bottom-nav {
  transform: translateY(100%);
  opacity: 0;
}
.nr-bottom-nav a {
  font-size: 15px;
  color: #4a90d9;
  text-decoration: none;
  padding: 6px 16px;
}
.nr-bottom-nav a:hover {
  background: #f0f0f0;
  border-radius: 4px;
}
.nr-settings-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483648;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 32px;
  text-align: center;
  color: #666;
  transition: opacity 0.25s ease;
}
.nr-settings-btn:hover {
  background: rgba(0,0,0,0.12);
}
.nr-quiet .nr-sidebar,
.nr-quiet .nr-settings-btn,
.nr-quiet .nr-sidebar-toggle {
  opacity: 0;
  pointer-events: none;
}
.nr-quiet .nr-bottom-nav {
  transform: translateY(100%);
  opacity: 0;
}
.nr-loading-indicator {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}
.nr-error-indicator {
  text-align: center;
  padding: 20px;
  color: #c00;
  font-size: 14px;
}
.nr-error-indicator a {
  color: #4a90d9;
  cursor: pointer;
}
@media (max-width: 768px) {
  .nr-sidebar {
    width: 100%;
    position: fixed;
    inset: 0;
    z-index: 2147483648;
  }
  .nr-sidebar-hidden .nr-sidebar {
    margin-left: -100%;
  }
  .nr-content-area {
    padding: 20px 16px 60px;
  }
  .nr-chapter-body p {
    text-indent: 2em;
  }
  .nr-bottom-nav {
    gap: 12px;
  }
}
`;

let extraCssEl: HTMLStyleElement | null = null;

export function injectReaderStyles(): void {
  gmAddStyle(READER_CSS);
}

export function updateReaderStyleVars(settings: Settings): void {
  const container = document.querySelector('.nr-reader-container') as HTMLElement | null;
  if (!container) return;
  container.style.setProperty('--nr-font-family', settings.fontFamily);
  container.style.setProperty('--nr-font-size', settings.fontSize + 'px');
  container.style.setProperty('--nr-line-height', String(settings.lineHeight));
  container.style.setProperty('--nr-content-max-width', settings.contentWidth + 'px');
}

export function updateExtraCss(css: string): void {
  if (!extraCssEl) {
    extraCssEl = document.createElement('style');
    extraCssEl.id = 'nr-extra-css';
    document.head.appendChild(extraCssEl);
  }
  extraCssEl.textContent = css;
}

export function removeExtraCss(): void {
  if (extraCssEl) {
    extraCssEl.remove();
    extraCssEl = null;
  }
}
