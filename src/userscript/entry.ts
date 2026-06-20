import { logger } from '../shared/logger';
import { initApp } from '../core/app';

(function () {
  if (window.top !== window.self) {
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    logger.info('小说阅读脚本初始化中...');

    if (location.host.indexOf('booklink.me') > -1) {
      logger.info('booklink.me 辅助模式暂未实现');
      return;
    }

    initApp();
  });
})();
