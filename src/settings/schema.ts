export const SITE_RULES_URL = '__SITE_RULES_RAW_URL__';
export const TEXT_RULES_URL = '__TEXT_RULES_RAW_URL__';
export const S2T_RULES_URL = '__S2T_RULES_RAW_URL__';

export const KEYS = {
  siteRulesUrl: 'siteRulesUrl',
  siteRulesCache: 'siteRulesCache',
  siteRulesCacheUpdatedAt: 'siteRulesCacheUpdatedAt',
  textRulesUrl: 'textRulesUrl',
  textRulesCache: 'textRulesCache',
  textRulesCacheUpdatedAt: 'textRulesCacheUpdatedAt',
  s2tRulesUrl: 's2tRulesUrl',
  s2tRulesCache: 's2tRulesCache',
  s2tRulesCacheUpdatedAt: 's2tRulesCacheUpdatedAt',
  customSiteRules: 'customSiteRules',
  customReplaceRules: 'customReplaceRules',
  enabledTextRuleGroups: 'enabledTextRuleGroups',
  convertToTraditional: 'convertToTraditional',
  splitContent: 'splitContent',
  hideSidebar: 'hideSidebar',
  hideFooterNav: 'hideFooterNav',
  hidePreferencesButton: 'hidePreferencesButton',
  remainHeight: 'remainHeight',
  maxRetries: 'maxRetries',
  retryDelay: 'retryDelay',
  imagePreload: 'imagePreload',
  fontFamily: 'fontFamily',
  fontSize: 'fontSize',
  lineHeight: 'lineHeight',
  contentWidth: 'contentWidth',
  skinName: 'skinName',
  extraCss: 'extraCss',
  keybindings: 'keybindings',
  disableAutoLaunch: 'disableAutoLaunch',
  booklinkEnable: 'booklinkEnable',
  debug: 'debug',
  language: 'language',
  copyCurrentTitle: 'copyCurrentTitle',
  addNextPageToHistory: 'addNextPageToHistory',
  doubleClickPause: 'doubleClickPause',
} as const;

export interface Settings {
  siteRulesUrl: string;
  siteRulesCache: string;
  siteRulesCacheUpdatedAt: string;
  textRulesUrl: string;
  textRulesCache: string;
  textRulesCacheUpdatedAt: string;
  s2tRulesUrl: string;
  s2tRulesCache: string;
  s2tRulesCacheUpdatedAt: string;
  customSiteRules: string;
  customReplaceRules: string;
  enabledTextRuleGroups: string[];
  convertToTraditional: boolean;
  splitContent: boolean;
  hideSidebar: boolean;
  hideFooterNav: boolean;
  hidePreferencesButton: boolean;
  remainHeight: number;
  maxRetries: number;
  retryDelay: number;
  imagePreload: boolean;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  skinName: string;
  extraCss: string;
  keybindings: Record<string, string>;
  disableAutoLaunch: boolean;
  booklinkEnable: boolean;
  debug: boolean;
  language: string;
  copyCurrentTitle: boolean;
  addNextPageToHistory: boolean;
  doubleClickPause: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  siteRulesUrl: SITE_RULES_URL,
  siteRulesCache: '',
  siteRulesCacheUpdatedAt: '',
  textRulesUrl: TEXT_RULES_URL,
  textRulesCache: '',
  textRulesCacheUpdatedAt: '',
  s2tRulesUrl: S2T_RULES_URL,
  s2tRulesCache: '',
  s2tRulesCacheUpdatedAt: '',
  customSiteRules: '[]',
  customReplaceRules: '[]',
  enabledTextRuleGroups: [],
  convertToTraditional: false,
  splitContent: false,
  hideSidebar: false,
  hideFooterNav: false,
  hidePreferencesButton: false,
  remainHeight: 300,
  maxRetries: 2,
  retryDelay: 2000,
  imagePreload: true,
  fontFamily: '-apple-system, "Microsoft YaHei", "PingFang SC", sans-serif',
  fontSize: 18,
  lineHeight: 1.8,
  contentWidth: 800,
  skinName: 'default',
  extraCss: '',
  keybindings: {},
  disableAutoLaunch: false,
  booklinkEnable: true,
  debug: false,
  language: 'zh-CN',
  copyCurrentTitle: false,
  addNextPageToHistory: true,
  doubleClickPause: true,
};
