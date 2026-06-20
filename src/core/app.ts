import { logger } from '../shared/logger';
import { getSetting } from '../settings/storage';
import { KEYS, SITE_RULES_URL, TEXT_RULES_URL } from '../settings/schema';
import { initRuleRegistry, matchRule } from '../rules/rule-registry';
import { initTextRuleRegistry, getCombinedTextRules } from '../text-rules/text-rule-registry';
import { parseChapter } from './parser';
import type { CleanOptions } from './content-cleaner';

export async function initApp(options?: { doc?: Document; url?: string }): Promise<void> {
  const doc = options?.doc ?? document;
  const url = options?.url ?? location.href;

  logger.info('ReaderApp 启动');

  const siteRulesUrl = getSetting(KEYS.siteRulesUrl, SITE_RULES_URL);
  const textRulesUrl = getSetting(KEYS.textRulesUrl, TEXT_RULES_URL);

  await initRuleRegistry(siteRulesUrl);
  await initTextRuleRegistry(textRulesUrl);

  const rule = matchRule(url);
  if (!rule) {
    logger.info('当前页面未匹配任何站点规则，跳过');
    return;
  }

  const textRules = getCombinedTextRules();
  const cleanOptions: CleanOptions = {
    convertToTraditional: false,
    splitContent: false,
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
}
