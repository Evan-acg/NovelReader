import { logger } from '../shared/logger';
import { loadAllSettings } from '../settings/storage';
import { initRuleRegistry, matchRule } from '../rules/rule-registry';
import { initTextRuleRegistry, getCombinedTextRules } from '../text-rules/text-rule-registry';
import { parseChapter } from './parser';
import { loadS2TMapping, type CleanOptions } from './content-cleaner';
import { renderReaderView } from '../ui/reader-view';
import { clearLoadedUrls } from './next-page-loader';

function waitForSelector(selector: string, doc: Document, timeout = 10000): Promise<void> {
  return new Promise((resolve) => {
    if (doc.querySelector(selector)) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (doc.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });
    const root = doc.body || doc.documentElement;
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
  });
}

export async function initApp(options?: { doc?: Document; url?: string }): Promise<void> {
  const doc = options?.doc ?? document;
  const url = options?.url ?? location.href;

  const settings = loadAllSettings();
  logger.setDebug(settings.debug);
  logger.info('ReaderApp 启动');

  clearLoadedUrls();

  await initRuleRegistry(settings.siteRulesUrl);
  await initTextRuleRegistry(settings.textRulesUrl);

  const rule = matchRule(url);
  if (!rule) {
    logger.info('当前页面未匹配任何站点规则，跳过');
    return;
  }

  if (rule.disableAuto) {
    logger.info('站点规则设置 disableAuto，跳过自动启动');
    return;
  }

  if (rule.waitDelay && rule.waitDelay > 0) {
    logger.info(`等待 ${rule.waitDelay}ms 后启动...`);
    await new Promise((resolve) => setTimeout(resolve, rule.waitDelay));
  }

  if (rule.waitSelector) {
    logger.info(`等待选择器 "${rule.waitSelector}" 出现...`);
    await waitForSelector(rule.waitSelector, doc);
  }

  const textRules = getCombinedTextRules();
  const s2tMapping = await loadS2TMapping();
  const cleanOptions: CleanOptions = {
    convertToTraditional: settings.convertToTraditional,
    splitContent: settings.splitContent,
    s2tMapping,
  };

  const chapter = parseChapter(doc, url, rule, textRules, cleanOptions);
  logger.info('章节解析完成', {
    bookTitle: chapter.bookTitle,
    chapterTitle: chapter.chapterTitle,
    contentLength: chapter.contentText.length,
    isVip: chapter.isVip,
    hasNext: !!chapter.nextUrl,
    hasPrev: !!chapter.prevUrl,
  });

  renderReaderView(chapter, rule, textRules, cleanOptions);
}
