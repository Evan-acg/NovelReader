import { logger } from '../shared/logger';
import { loadAllSettings } from '../settings/storage';
import { initRuleRegistry, matchRule } from '../rules/rule-registry';
import { initTextRuleRegistry, getCombinedTextRules } from '../text-rules/text-rule-registry';
import { parseChapter } from './parser';
import { loadS2TMapping, type CleanOptions } from './content-cleaner';
import { renderReaderView } from '../ui/reader-view';
import { clearLoadedUrls } from './next-page-loader';

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
