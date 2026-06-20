import type { TextRule } from '../text-rules/text-rule-types';

export interface SiteRule {
  id: string;
  name: string;
  url: string;
  titleSelector?: string;
  bookTitleSelector?: string;
  chapterTitleSelector?: string;
  contentSelector?: string;
  prevSelector?: string;
  nextSelector?: string;
  indexSelector?: string;
  removeSelectors?: string[];
  contentReplaceRules?: TextRule[];
  insertBefore?: string;
  excludeUrl?: string;
  bookTitleRegex?: string;
  chapterTitleRegex?: string;
  waitDelay?: number;
  waitSelector?: string;
  loadWithIframe?: boolean;
  isVip?: boolean;
  disableAuto?: boolean;
  priority?: number;
}

export interface SiteRuleSet {
  version: number;
  updatedAt: string;
  rules: SiteRule[];
}
