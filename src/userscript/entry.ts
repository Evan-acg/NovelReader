import { logger } from '../shared/logger';
import { initApp } from '../core/app';
import { init as initBooklink } from '../integrations/booklink';

(function () {
  if (window.top !== window.self) {
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    logger.info('小说阅读脚本初始化中...');

    if (location.host.indexOf('booklink.me') > -1) {
      initBooklink();
      return;
    }

    initApp();
  });
})();
