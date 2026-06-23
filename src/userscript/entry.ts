import { logger } from '../shared/logger';
import { initApp } from '../core/app';
import { destroyReaderView } from '../ui/reader-view';
import { loadAllSettings } from '../settings/storage';
import { isBooklinkHost, init as initBooklink } from '../integrations/booklink';

declare const unsafeWindow: Window & { startNovelReader?: () => Promise<void> };

(function () {
  if (window.top !== window.self) {
    return;
  }

  const start = () => {
    logger.info('小说阅读脚本初始化中...');

    if (isBooklinkHost()) {
      initBooklink();
      return;
    }

    const settings = loadAllSettings();

    const savedBodyHTML = document.body.innerHTML;
    const savedTitle = document.title;
    let isReadingMode = false;

    function createToggleBtn(): HTMLButtonElement {
      const btn = document.createElement('button');
      btn.className = 'nr-toggle-btn';
      btn.textContent = isReadingMode ? '✕ 退出阅读' : '📖 阅读模式';
      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483648',
        padding: '10px 18px',
        fontSize: '14px',
        cursor: 'pointer',
        background: isReadingMode ? '#e74c3c' : '#4a90d9',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        lineHeight: '1',
      });
      btn.addEventListener('click', toggleReadingMode);
      return btn;
    }

    async function toggleReadingMode() {
      if (isReadingMode) {
        destroyReaderView();
        document.body.innerHTML = savedBodyHTML;
        document.title = savedTitle;
        isReadingMode = false;
        document.body.appendChild(createToggleBtn());
      } else {
        document.querySelector('.nr-toggle-btn')?.remove();
        await initApp();
        const readerEl = document.querySelector('.nr-reader-container');
        isReadingMode = !!readerEl;
        document.body.appendChild(createToggleBtn());
      }
    }

    document.body.appendChild(createToggleBtn());

    if (!settings.disableAutoLaunch) {
      document.querySelector('.nr-toggle-btn')?.remove();
      initApp().then(() => {
        const readerEl = document.querySelector('.nr-reader-container');
        if (readerEl) {
          isReadingMode = true;
        }
        document.body.appendChild(createToggleBtn());
      });
    }

    if (typeof unsafeWindow !== 'undefined') {
      unsafeWindow.startNovelReader = () => {
        if (!isReadingMode) {
          return toggleReadingMode() as unknown as Promise<void>;
        }
        return Promise.resolve();
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
