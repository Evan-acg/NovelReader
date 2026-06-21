import { logger } from '../shared/logger';
import { initApp } from '../core/app';
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
    if (settings.disableAutoLaunch) {
      logger.info('自动启动已禁用，渲染手动启动按钮');
      const btn = document.createElement('button');
      btn.className = 'nr-manual-start';
      btn.textContent = '📖 阅读模式';
      Object.assign(btn.style, {
        position: 'fixed',
        top: '12px',
        left: '12px',
        zIndex: '2147483648',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        background: '#4a90d9',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
      });
      btn.addEventListener('click', () => {
        btn.remove();
        initApp();
      });
      document.body.appendChild(btn);
      if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.startNovelReader = () => {
          btn.remove();
          return initApp();
        };
      }
      return;
    }

    initApp();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
