// ==UserScript==
// @name               Universal Novel Reader
// @name:zh-CN         通用小说阅读
// @name:zh-TW         通用小說閱讀
// @namespace          https://github.com/Evan-acg/NovelReader
// @version            1.1.8
// @author             EvanstonLaw
// @description        小说阅读脚本，统一阅读样式，内容去广告、修正拼音字、段落整理，自动下一页
// @description:zh-CN  小说阅读脚本，统一阅读样式，内容去广告、修正拼音字、段落整理，自动下一页
// @description:zh-TW  小說閱讀腳本，統一閱讀樣式，內容去廣告、修正拼音字、段落整理，自動下一頁
// @license            GPL version 3
// @match              *://*/*
// @connect            github.com
// @connect            raw.githubusercontent.com
// @grant              GM_addStyle
// @grant              GM_getValue
// @grant              GM_info
// @grant              GM_openInTab
// @grant              GM_setValue
// @grant              GM_xmlhttpRequest
// @grant              unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  let debugEnabled = false;
  const logger = {
    info(...args) {
      console.log("[NovelReader]", ...args);
    },
    debug(...args) {
      if (debugEnabled) {
        console.log("[NovelReader DEBUG]", ...args);
      }
    },
    warn(...args) {
      console.warn("[NovelReader]", ...args);
    },
    error(...args) {
      console.error("[NovelReader]", ...args);
    },
    setDebug(enabled) {
      debugEnabled = enabled;
    }
  };
  function gmGetValue(key, defaultValue = "") {
    return (typeof GM_getValue === "function" ? GM_getValue(key, defaultValue) : defaultValue) ?? defaultValue;
  }
  function gmSetValue(key, value) {
    if (typeof GM_setValue === "function") {
      GM_setValue(key, value);
    }
  }
  async function gmFetch(url, timeout = 1e4) {
    if (typeof GM_xmlhttpRequest !== "function") {
      throw new Error("GM_xmlhttpRequest 不可用");
    }
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url,
        method: "GET",
        timeout,
        onload: (response) => {
          if (response.status === 200) {
            resolve(response.responseText);
          } else {
            reject(new Error(`HTTP ${response.status}: ${url}`));
          }
        },
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error(`请求超时: ${url}`))
      });
    });
  }
  function gmOpenInTab(url) {
    if (typeof GM_openInTab === "function") {
      GM_openInTab(url);
    } else {
      window.open(url, "_blank");
    }
  }
  function gmAddStyle(css) {
    if (typeof GM_addStyle === "function") {
      GM_addStyle(css);
    } else {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
  const RULE_URLS = {
    site: "https://raw.githubusercontent.com/Evan-acg/NovelReader/rules/site/site-rules.json",
    text: "https://raw.githubusercontent.com/Evan-acg/NovelReader/rules/replace/text-rules.json",
    s2t: "https://raw.githubusercontent.com/Evan-acg/NovelReader/rules/s2t/s2t-rules.json"
  };
  const SITE_RULES_URL = RULE_URLS.site;
  const TEXT_RULES_URL = RULE_URLS.text;
  const S2T_RULES_URL = RULE_URLS.s2t;
  const KEYS = {
    siteRulesUrl: "siteRulesUrl",
    siteRulesCache: "siteRulesCache",
    siteRulesCacheUpdatedAt: "siteRulesCacheUpdatedAt",
    textRulesUrl: "textRulesUrl",
    textRulesCache: "textRulesCache",
    textRulesCacheUpdatedAt: "textRulesCacheUpdatedAt",
    s2tRulesUrl: "s2tRulesUrl",
    s2tRulesCache: "s2tRulesCache",
    s2tRulesCacheUpdatedAt: "s2tRulesCacheUpdatedAt",
    customSiteRules: "customSiteRules",
    customReplaceRules: "customReplaceRules",
    enabledTextRuleGroups: "enabledTextRuleGroups",
    convertToTraditional: "convertToTraditional",
    splitContent: "splitContent",
    hideSidebar: "hideSidebar",
    hideHistoryMenu: "hideHistoryMenu",
    hideFooterNav: "hideFooterNav",
    hidePreferencesButton: "hidePreferencesButton",
    remainHeight: "remainHeight",
    maxRetries: "maxRetries",
    retryDelay: "retryDelay",
    imagePreload: "imagePreload",
    fontFamily: "fontFamily",
    fontSize: "fontSize",
    lineHeight: "lineHeight",
    contentWidth: "contentWidth",
    extraCss: "extraCss",
    keybindings: "keybindings",
    skinName: "skinName",
    disableAutoLaunch: "disableAutoLaunch",
    booklinkEnable: "booklinkEnable",
    language: "language",
    copyCurrentTitle: "copyCurrentTitle",
    addNextPageToHistory: "addNextPageToHistory",
    doubleClickPause: "doubleClickPause",
    scrollAnimate: "scrollAnimate",
    debug: "debug",
    contentAlign: "contentAlign",
    maxKeptChapters: "maxKeptChapters"
  };
  const DEFAULT_SETTINGS = {
    siteRulesUrl: SITE_RULES_URL,
    siteRulesCache: "",
    siteRulesCacheUpdatedAt: "",
    textRulesUrl: TEXT_RULES_URL,
    textRulesCache: "",
    textRulesCacheUpdatedAt: "",
    s2tRulesUrl: S2T_RULES_URL,
    s2tRulesCache: "",
    s2tRulesCacheUpdatedAt: "",
    customSiteRules: "[]",
    customReplaceRules: "[]",
    enabledTextRuleGroups: [],
    convertToTraditional: false,
    splitContent: false,
    hideSidebar: false,
    hideHistoryMenu: false,
    hideFooterNav: false,
    hidePreferencesButton: false,
    remainHeight: 300,
    maxRetries: 2,
    retryDelay: 2e3,
    imagePreload: true,
    fontFamily: '-apple-system, "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: 18,
    lineHeight: 1.8,
    contentWidth: 800,
    extraCss: "",
    keybindings: {},
    skinName: "default",
    disableAutoLaunch: true,
    booklinkEnable: true,
    language: "zh-CN",
    copyCurrentTitle: false,
    addNextPageToHistory: true,
    doubleClickPause: true,
    scrollAnimate: true,
    debug: false,
    contentAlign: "left",
    maxKeptChapters: 30
  };
  let settingsCache = null;
  function getSetting(key, defaultValue = "") {
    try {
      return gmGetValue(key, defaultValue);
    } catch (e) {
      logger.warn(`读取设置 ${key} 失败:`, e);
      return defaultValue;
    }
  }
  function getJsonSetting(key, defaultValue) {
    try {
      const raw = gmGetValue(key, "");
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }
  function setJsonSetting(key, value) {
    try {
      gmSetValue(key, JSON.stringify(value));
    } catch (e) {
      logger.warn(`保存 JSON 设置 ${key} 失败:`, e);
    }
    invalidateSettingsCache();
  }
  function loadSettingsFromStorage() {
    const result = {};
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
      const raw = getSetting(key, "");
      if (raw === "") {
        result[key] = defaultValue;
        continue;
      }
      const type = typeof defaultValue;
      if (type === "boolean") {
        result[key] = raw === "true";
      } else if (type === "number") {
        const n = Number(raw);
        result[key] = Number.isFinite(n) ? n : defaultValue;
      } else if (type === "object") {
        try {
          result[key] = JSON.parse(raw);
        } catch {
          result[key] = defaultValue;
        }
      } else {
        result[key] = raw;
      }
    }
    return result;
  }
  function loadAllSettings() {
    if (!settingsCache) {
      settingsCache = loadSettingsFromStorage();
    }
    return settingsCache;
  }
  function saveSetting(key, value) {
    const dv = DEFAULT_SETTINGS[key];
    const type = typeof dv;
    let stored;
    if (type === "boolean") {
      stored = value ? "true" : "false";
    } else if (type === "number") {
      stored = String(value);
    } else if (type === "object") {
      stored = JSON.stringify(value);
    } else {
      stored = value;
    }
    try {
      gmSetValue(key, stored);
    } catch (e) {
      logger.warn(`保存设置 ${key} 失败:`, e);
    }
    if (!settingsCache) {
      settingsCache = loadSettingsFromStorage();
    }
    settingsCache[key] = value;
  }
  function invalidateSettingsCache() {
    settingsCache = null;
  }
  function success(value) {
    return { success: true, value };
  }
  function failure(error) {
    return { success: false, error };
  }
  const MAX_GROUPS = 50;
  const MAX_RULES_PER_GROUP = 500;
  const ALLOWED_FLAGS = /^[gimsuy]*$/;
  function validateTextRule(rule2) {
    if (!rule2 || typeof rule2 !== "object") {
      return failure(new Error("文本规则必须是对象"));
    }
    const r = rule2;
    if (typeof r.pattern !== "string" || !r.pattern.trim()) {
      return failure(new Error("缺少 pattern"));
    }
    if (typeof r.replacement !== "string") {
      return failure(new Error("缺少 replacement"));
    }
    if (r.flags !== void 0) {
      if (typeof r.flags !== "string" || !ALLOWED_FLAGS.test(r.flags)) {
        return failure(new Error(`不安全的 flags: ${String(r.flags)}`));
      }
    }
    try {
      new RegExp(r.pattern, r.flags || "");
    } catch {
      return failure(new Error(`无效的正则 pattern: ${String(r.pattern)}`));
    }
    return success({
      pattern: r.pattern,
      replacement: r.replacement,
      flags: r.flags
    });
  }
  function validateTextRuleGroup(group) {
    if (!group || typeof group !== "object") {
      return failure(new Error("规则组必须是对象"));
    }
    const g = group;
    if (typeof g.id !== "string" || !g.id.trim()) {
      return failure(new Error("规则组缺少 id"));
    }
    if (!Array.isArray(g.rules)) {
      return failure(new Error("规则组的 rules 必须是数组"));
    }
    const rules = g.rules;
    if (rules.length > MAX_RULES_PER_GROUP) {
      return failure(new Error(`规则组 "${String(g.id)}" 规则数量超过上限 ${MAX_RULES_PER_GROUP}`));
    }
    const validRules = [];
    for (let i = 0; i < rules.length; i++) {
      const result = validateTextRule(rules[i]);
      if (!result.success) {
        return failure(new Error(`规则组 "${String(g.id)}" 规则 ${i}: ${result.error.message}`));
      }
      validRules.push(result.value);
    }
    return success({
      id: g.id,
      name: typeof g.name === "string" ? g.name : g.id,
      enabledByDefault: g.enabledByDefault === true,
      rules: validRules
    });
  }
  function validateTextRuleSet(json) {
    if (!json || typeof json !== "object") {
      return failure(new Error("文本规则集必须是对象"));
    }
    const data = json;
    if (typeof data.version !== "number" || data.version < 1) {
      return failure(new Error("缺少或无效的 version"));
    }
    if (!Array.isArray(data.groups)) {
      return failure(new Error("groups 必须是数组"));
    }
    const groups2 = data.groups;
    if (groups2.length > MAX_GROUPS) {
      return failure(new Error(`规则组数量超过上限 ${MAX_GROUPS}`));
    }
    const validGroups = [];
    for (let i = 0; i < groups2.length; i++) {
      const result = validateTextRuleGroup(groups2[i]);
      if (!result.success) {
        return failure(new Error(`规则组 ${i}: ${result.error.message}`));
      }
      validGroups.push(result.value);
    }
    return success({
      version: data.version,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
      groups: validGroups
    });
  }
  const MAX_RULES = 500;
  const SAFE_SELECTOR_REGEX = /^[a-zA-Z0-9\-_.#,:\[\]="'()\s*~+>|^$]+$/;
  const SAFE_URL_REGEX = /^[\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+$/;
  function hasSafeChars(value, regex) {
    if (!value) return true;
    return regex.test(value);
  }
  function validateSiteRule(rule2) {
    if (!rule2 || typeof rule2 !== "object") {
      return failure(new Error("规则必须是对象"));
    }
    const r = rule2;
    if (typeof r.id !== "string" || !r.id.trim()) {
      return failure(new Error("缺少 id"));
    }
    if (typeof r.url !== "string" || !r.url.trim()) {
      return failure(new Error(`规则 "${String(r.id)}" 缺少 url`));
    }
    const url = r.url;
    if (!hasSafeChars(url, SAFE_URL_REGEX)) {
      return failure(new Error(`规则 "${url}" 的 url 包含不安全字符`));
    }
    if (/^(javascript|data|vbscript):/i.test(url)) {
      return failure(new Error(`规则 "${url}" 的 url 不允许使用脚本协议`));
    }
    try {
      new RegExp(url);
    } catch {
      return failure(new Error(`规则 "${url}" 的 url 不是合法的正则表达式`));
    }
    const selectors = ["titleSelector", "bookTitleSelector", "chapterTitleSelector", "contentSelector", "prevSelector", "nextSelector", "indexSelector"];
    for (const key of selectors) {
      const value = r[key];
      if (value !== void 0 && (typeof value !== "string" || !hasSafeChars(value, SAFE_SELECTOR_REGEX))) {
        return failure(new Error(`规则 "${url}" 的 ${key} 包含不安全字符`));
      }
    }
    if (r.contentReplaceRules !== void 0) {
      if (!Array.isArray(r.contentReplaceRules)) {
        return failure(new Error(`规则 "${url}" 的 contentReplaceRules 必须是数组`));
      }
      const replaceRules = r.contentReplaceRules;
      for (let i = 0; i < replaceRules.length; i++) {
        const result = validateTextRule(replaceRules[i]);
        if (!result.success) {
          return failure(new Error(`规则 "${url}" 的 contentReplaceRules[${i}]: ${result.error.message}`));
        }
      }
    }
    return success(r);
  }
  function validateSiteRuleSet(json) {
    if (!json || typeof json !== "object") {
      return failure(new Error("规则集必须是一个对象"));
    }
    const data = json;
    if (typeof data.version !== "number" || data.version < 1) {
      return failure(new Error("缺少或无效的 version"));
    }
    if (!Array.isArray(data.rules)) {
      return failure(new Error("rules 必须是数组"));
    }
    const rules = data.rules;
    if (rules.length > MAX_RULES) {
      return failure(new Error(`规则数量超过上限 ${MAX_RULES}`));
    }
    const validRules = [];
    for (let i = 0; i < rules.length; i++) {
      const result = validateSiteRule(rules[i]);
      if (!result.success) {
        return failure(new Error(`规则索引 ${i}: ${result.error.message}`));
      }
      validRules.push(result.value);
    }
    return success({
      version: data.version,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
      rules: validRules
    });
  }
  async function fetchRemoteSiteRules(url) {
    const targetUrl = url || SITE_RULES_URL;
    try {
      logger.info(`正在加载远程站点规则: ${targetUrl}`);
      const text = await gmFetch(targetUrl);
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return failure(new Error("远程站点规则 JSON 解析失败"));
      }
      const result = validateSiteRuleSet(json);
      if (!result.success) {
        return failure(new Error(`远程站点规则校验失败: ${result.error.message}`));
      }
      setJsonSetting(KEYS.siteRulesCache, result.value);
      setJsonSetting(KEYS.siteRulesCacheUpdatedAt, Date.now());
      logger.info(`站点规则加载成功，共 ${result.value.rules.length} 条`);
      return result;
    } catch (e) {
      logger.warn("远程站点规则拉取失败:", e);
      return failure(e instanceof Error ? e : new Error(String(e)));
    }
  }
  function loadCachedSiteRules() {
    const cached = getJsonSetting(KEYS.siteRulesCache, null);
    if (!cached || !cached.version || !Array.isArray(cached.rules)) {
      return failure(new Error("无可用缓存"));
    }
    logger.info(`使用缓存的站点规则，共 ${cached.rules.length} 条`);
    return success(cached);
  }
  const CACHE_TTL$1 = 60 * 60 * 1e3;
  function isCacheFresh$1(key) {
    const updatedAt = getJsonSetting(key, null);
    return updatedAt !== null && Date.now() - updatedAt < CACHE_TTL$1;
  }
  async function loadSiteRulesWithFallback(url) {
    if (isCacheFresh$1(KEYS.siteRulesCacheUpdatedAt)) {
      const cachedResult2 = loadCachedSiteRules();
      if (cachedResult2.success) {
        return cachedResult2.value;
      }
    }
    const remoteResult = await fetchRemoteSiteRules(url);
    if (remoteResult.success) {
      return remoteResult.value;
    }
    const cachedResult = loadCachedSiteRules();
    if (cachedResult.success) {
      return cachedResult.value;
    }
    return { version: 1, updatedAt: "", rules: [] };
  }
  function loadCustomSiteRules() {
    const raw = getJsonSetting(KEYS.customSiteRules, []);
    if (!Array.isArray(raw)) return [];
    const valid = [];
    for (const item of raw) {
      const result = validateSiteRule(item);
      if (result.success) {
        valid.push(result.value);
      } else {
        logger.warn("自定义站点规则校验失败:", result.error.message);
      }
    }
    return valid;
  }
  let compiledRules = [];
  let initialized$1 = false;
  async function initRuleRegistry(url) {
    if (initialized$1) return;
    const ruleSet = await loadSiteRulesWithFallback(url);
    const customRules = loadCustomSiteRules();
    const items = [];
    for (const rule2 of customRules) {
      try {
        items.push({
          rule: rule2,
          regex: new RegExp(rule2.url, "i"),
          priority: rule2.priority ?? 900,
          source: "custom"
        });
      } catch {
        logger.warn(`自定义规则正则无效: ${rule2.url}`);
      }
    }
    for (const rule2 of ruleSet.rules) {
      if (customRules.some((cr) => cr.id === rule2.id)) continue;
      try {
        items.push({
          rule: rule2,
          regex: new RegExp(rule2.url, "i"),
          priority: rule2.priority ?? 500,
          source: "remote"
        });
      } catch {
        logger.warn(`规则正则无效: ${rule2.url}`);
      }
    }
    items.sort((a, b) => b.priority - a.priority);
    compiledRules = items;
    initialized$1 = true;
    logger.info(`规则注册完成，共 ${items.length} 条`);
  }
  function matchRule(url) {
    const target = url;
    for (const item of compiledRules) {
      if (item.regex.test(target)) {
        if (item.rule.excludeUrl) {
          try {
            if (new RegExp(item.rule.excludeUrl, "i").test(target)) {
              continue;
            }
          } catch {
          }
        }
        logger.info(`规则匹配: ${item.rule.name} (${item.rule.id}) [${item.source}]`);
        return item.rule;
      }
    }
    return null;
  }
  async function fetchRemoteTextRules(url) {
    const targetUrl = url || TEXT_RULES_URL;
    try {
      logger.info(`正在加载远程文本规则: ${targetUrl}`);
      const text = await gmFetch(targetUrl);
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return failure(new Error("远程文本规则 JSON 解析失败"));
      }
      const result = validateTextRuleSet(json);
      if (!result.success) {
        return failure(new Error(`远程文本规则校验失败: ${result.error.message}`));
      }
      setJsonSetting(KEYS.textRulesCache, result.value);
      setJsonSetting(KEYS.textRulesCacheUpdatedAt, Date.now());
      logger.info(`文本规则加载成功，共 ${result.value.groups.length} 组`);
      return result;
    } catch (e) {
      logger.warn("远程文本规则拉取失败:", e);
      return failure(e instanceof Error ? e : new Error(String(e)));
    }
  }
  function loadCachedTextRules() {
    const cached = getJsonSetting(KEYS.textRulesCache, null);
    if (!cached || !cached.version || !Array.isArray(cached.groups)) {
      return failure(new Error("无可用缓存"));
    }
    logger.info(`使用缓存的文本规则，共 ${cached.groups.length} 组`);
    return success(cached);
  }
  const CACHE_TTL = 60 * 60 * 1e3;
  function isCacheFresh(key) {
    const updatedAt = getJsonSetting(key, null);
    return updatedAt !== null && Date.now() - updatedAt < CACHE_TTL;
  }
  async function loadTextRulesWithFallback(url) {
    if (isCacheFresh(KEYS.textRulesCacheUpdatedAt)) {
      const cachedResult2 = loadCachedTextRules();
      if (cachedResult2.success) {
        return cachedResult2.value;
      }
    }
    const remoteResult = await fetchRemoteTextRules(url);
    if (remoteResult.success) {
      return remoteResult.value;
    }
    const cachedResult = loadCachedTextRules();
    if (cachedResult.success) {
      return cachedResult.value;
    }
    return { version: 1, updatedAt: "", groups: [] };
  }
  function loadCustomReplaceRules() {
    const raw = getJsonSetting(KEYS.customReplaceRules, []);
    if (!Array.isArray(raw)) return [];
    const valid = [];
    for (const item of raw) {
      const result = validateTextRule(item);
      if (result.success) {
        valid.push(result.value);
      } else {
        logger.warn("自定义文本规则校验失败:", result.error.message);
      }
    }
    return valid;
  }
  let combinedRules = [];
  let groups = [];
  let initialized = false;
  async function initTextRuleRegistry(url) {
    if (initialized) return;
    const ruleSet = await loadTextRulesWithFallback(url);
    const customRules = loadCustomReplaceRules();
    const enabledGroups = getJsonSetting(KEYS.enabledTextRuleGroups, []);
    groups = ruleSet.groups;
    const merged = [];
    for (const group of groups) {
      if (enabledGroups.length > 0 && !enabledGroups.includes(group.id)) {
        continue;
      }
      if (enabledGroups.length === 0 && !group.enabledByDefault) {
        continue;
      }
      merged.push(...group.rules);
    }
    merged.push(...customRules);
    combinedRules = merged;
    initialized = true;
    logger.info(`文本规则注册完成，共 ${merged.length} 条`);
  }
  function getCombinedTextRules() {
    return combinedRules;
  }
  function getTextContent(el) {
    var _a;
    return ((_a = el == null ? void 0 : el.textContent) == null ? void 0 : _a.trim()) ?? "";
  }
  function querySelector(parent, selector) {
    return parent.querySelector(selector);
  }
  function querySelectorAll(parent, selector) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function removeElements(selector, root = document) {
    querySelectorAll(root, selector).forEach((el) => el.remove());
  }
  function getAbsoluteUrl(href, baseUrl) {
    if (!href) return "";
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return "";
    }
  }
  let placeholderId = 0;
  const PLACEHOLDER_PREFIX = "\0NOVEL_READER_PROTECT_";
  function protectHtmlTags(html) {
    const map = /* @__PURE__ */ new Map();
    let result = html;
    result = result.replace(/<img\b[^>]*\/?>/gi, (match) => {
      const placeholder = `${PLACEHOLDER_PREFIX}${placeholderId++}_`;
      map.set(placeholder, match);
      return placeholder;
    });
    result = result.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (match) => {
      const placeholder = `${PLACEHOLDER_PREFIX}${placeholderId++}_`;
      map.set(placeholder, match);
      return placeholder;
    });
    return { protectedHtml: result, map };
  }
  function restoreHtmlTags(html, map) {
    let result = html;
    for (const [placeholder, original] of map) {
      result = result.replaceAll(placeholder, original);
    }
    return result;
  }
  function removeUnwantedElements(html) {
    let result = html;
    result = result.replace(/<script\b[\s\S]*?<\/script>/gi, "");
    result = result.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
    result = result.replace(/<style\b[\s\S]*?<\/style>/gi, "");
    result = result.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");
    return result;
  }
  function applyTextRules(html, rules) {
    let result = html;
    for (const rule2 of rules) {
      try {
        const regex = new RegExp(rule2.pattern, rule2.flags || "g");
        result = result.replace(regex, rule2.replacement);
      } catch (e) {
        logger.warn(`文本规则执行失败: pattern="${rule2.pattern}"`, e);
      }
    }
    return result;
  }
  function convertBrToParagraphs(html) {
    let result = html.trim();
    result = result.replace(/^(<br\s*\/?>\s*)+/i, "");
    result = result.replace(/(<br\s*\/?>\s*)+$/i, "");
    result = result.replace(/(?:<br\s*\/?>\s*){2,}/gi, "</p><p>");
    if (!/^\s*<p\b/i.test(result)) {
      result = "<p>" + result;
    }
    if (!/<\/p>\s*$/i.test(result)) {
      result = result + "</p>";
    }
    return result;
  }
  function removeEmptyParagraphs(html) {
    return html.replace(/<p\b[^>]*>\s*(<br\s*\/?>\s*)*\s*<\/p>/gi, "");
  }
  function forceSplitContent(html) {
    if (!html || /<(p|br|div)\b/i.test(html)) {
      return html;
    }
    return html.replace(/([。！？；!?;])\s*/g, "$1</p><p>").replace(/^/, "<p>").replace(/$/, "</p>");
  }
  async function loadS2TMapping() {
    const url = getSetting(KEYS.s2tRulesUrl, S2T_RULES_URL);
    try {
      logger.info(`正在加载简繁映射: ${url}`);
      const text = await gmFetch(url);
      const json = JSON.parse(text);
      if (typeof json === "object" && json !== null && !Array.isArray(json)) {
        setJsonSetting(KEYS.s2tRulesCache, json);
        setJsonSetting(KEYS.s2tRulesCacheUpdatedAt, Date.now());
        logger.info("简繁映射加载成功");
        return json;
      }
    } catch (e) {
      logger.warn("远程简繁映射拉取失败:", e);
    }
    const cached = getJsonSetting(KEYS.s2tRulesCache, null);
    if (cached && typeof cached === "object" && !Array.isArray(cached)) {
      logger.info("使用缓存的简繁映射");
      return cached;
    }
    logger.warn("无可用简繁映射，简繁转换将不生效");
    return {};
  }
  function convertS2T(text, mapping) {
    return Array.from(text, (char) => mapping[char] || char).join("");
  }
  function cleanContent(rawHtml, textRules2, options = {}) {
    if (!rawHtml) {
      return { html: "", text: "" };
    }
    let html = rawHtml;
    html = removeUnwantedElements(html);
    const { protectedHtml, map } = protectHtmlTags(html);
    html = protectedHtml;
    html = applyTextRules(html, textRules2);
    html = restoreHtmlTags(html, map);
    if (options.splitContent) {
      html = forceSplitContent(html);
    }
    html = convertBrToParagraphs(html);
    html = removeEmptyParagraphs(html);
    if (options.convertToTraditional && options.s2tMapping) {
      html = convertS2T(html, options.s2tMapping);
    }
    const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return { html, text };
  }
  const VIP_MIN_TEXT_LENGTH = 50;
  const CANDIDATE_CONTENT_SELECTORS = [
    "#content",
    ".content",
    "#article",
    ".article",
    "#chapter-content",
    ".chapter-content",
    "#read-content",
    "#booktxt",
    "#BookText",
    "#novel-content",
    "#htmlContent",
    ".text",
    "#text",
    ".chapter",
    "#chapter",
    ".book-content",
    "#book-content",
    ".main-text",
    ".read-content",
    ".section-content",
    "#chaptercontent",
    ".showtxt",
    "#contents",
    ".article-content",
    "#main-content",
    ".post-content",
    ".entry-content"
  ];
  const TITLE_SEPARATORS = /[_\-\|–—·]\s*/;
  function extractBookTitleAuto(doc, rule2) {
    for (const selector of ["h1", "h2", "h3", ".title", "#title", ".book-title"]) {
      const el = querySelector(doc, selector);
      if (el) {
        const text = getTextContent(el);
        if (text && !text.includes("章") && !text.includes("节") && text.length < 50) {
          return text;
        }
      }
    }
    return parseDocTitle(doc).bookTitle;
  }
  function extractChapterTitleAuto(doc, rule2) {
    for (const selector of ["h1", "h2", "h3", ".title", "#title", ".chapter-title", ".chapterTitle"]) {
      const el = querySelector(doc, selector);
      if (el) {
        const text = getTextContent(el);
        if (text && (text.includes("章") || text.includes("节") || text.includes("第"))) {
          return text;
        }
      }
    }
    return parseDocTitle(doc).chapterTitle;
  }
  function parseDocTitle(doc) {
    const title = doc.title.trim();
    if (!title) return { bookTitle: "", chapterTitle: "" };
    const parts = title.split(TITLE_SEPARATORS).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) {
      return { bookTitle: parts[0], chapterTitle: parts[0] };
    }
    let bookPart = "";
    let chapterPart = "";
    for (const part of parts) {
      if (/[第序]/.test(part) && /[章节回篇]/.test(part)) {
        chapterPart = chapterPart || part;
      } else if (chapterPart) {
        break;
      }
    }
    if (!chapterPart) {
      bookPart = parts[0];
      chapterPart = parts[parts.length - 1];
    } else {
      bookPart = parts.find((p) => p !== chapterPart && p.length > 1) || parts[0];
    }
    return { bookTitle: bookPart, chapterTitle: chapterPart };
  }
  function extractTitle(doc, rule2) {
    let bookTitle = "";
    let chapterTitle = "";
    if (rule2.bookTitleSelector) {
      const el = querySelector(doc, rule2.bookTitleSelector);
      bookTitle = getTextContent(el);
    }
    if (rule2.chapterTitleSelector) {
      const el = querySelector(doc, rule2.chapterTitleSelector);
      chapterTitle = getTextContent(el);
    }
    if (bookTitle && chapterTitle) {
      return { bookTitle, chapterTitle };
    }
    if (rule2.titleSelector) {
      const el = querySelector(doc, rule2.titleSelector);
      const text = getTextContent(el);
      if (text) {
        const parts = text.split(TITLE_SEPARATORS).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return { bookTitle: bookTitle || parts[0], chapterTitle: chapterTitle || parts[1] };
        }
        if (!bookTitle) bookTitle = text;
        if (!chapterTitle) chapterTitle = text;
      }
    }
    if (rule2.bookTitleRegex || rule2.chapterTitleRegex) {
      const docTitle = doc.title.trim();
      if (rule2.bookTitleRegex) {
        try {
          const m = docTitle.match(new RegExp(rule2.bookTitleRegex, "i"));
          if (m && m[1]) bookTitle = bookTitle || m[1].trim();
        } catch {
        }
      }
      if (rule2.chapterTitleRegex) {
        try {
          const m = docTitle.match(new RegExp(rule2.chapterTitleRegex, "i"));
          if (m && m[1]) chapterTitle = chapterTitle || m[1].trim();
        } catch {
        }
      }
      if (bookTitle && chapterTitle) {
        return { bookTitle, chapterTitle };
      }
    }
    if (!bookTitle) bookTitle = extractBookTitleAuto(doc);
    if (!chapterTitle) chapterTitle = extractChapterTitleAuto(doc);
    return { bookTitle, chapterTitle };
  }
  function extractContent(doc, rule2, removeSelectors) {
    var _a;
    let contentEl = null;
    if (rule2.contentSelector) {
      contentEl = querySelector(doc, rule2.contentSelector);
    }
    if (!contentEl) {
      let bestEl = null;
      let bestScore = 0;
      for (const selector of CANDIDATE_CONTENT_SELECTORS) {
        const el = querySelector(doc, selector);
        if (!el) continue;
        const text = ((_a = el.textContent) == null ? void 0 : _a.trim()) ?? "";
        if (text.length < VIP_MIN_TEXT_LENGTH) continue;
        const pCount = el.querySelectorAll("p, div > br").length;
        const score = text.length + pCount * 200;
        if (score > bestScore) {
          bestScore = score;
          bestEl = el;
        }
      }
      contentEl = bestEl;
    }
    if (!contentEl) {
      return { html: "", text: "" };
    }
    const clone = contentEl.cloneNode(true);
    if (removeSelectors) {
      for (const selector of removeSelectors) {
        removeElements(selector, clone);
      }
    }
    return {
      html: clone.innerHTML,
      text: (clone.textContent ?? "").trim()
    };
  }
  const NEXT_PATTERNS = ["下一章", "下一页", "下一节", "后一章", "→", "&#8594;", "next"];
  const PREV_PATTERNS = ["上一章", "上一页", "上一节", "前一章", "←", "&#8592;", "prev"];
  const INDEX_PATTERNS = ["目录", "返回目录", "作品目录", "章节目录", "索引", "index"];
  function findAllNavLinks(doc) {
    const links = querySelectorAll(doc, "a");
    const nav = {};
    for (const link of links) {
      const text = getTextContent(link);
      if (!nav.prevUrl && (link.rel === "prev" || text && PREV_PATTERNS.some((p) => text.includes(p)))) {
        nav.prevUrl = link.href;
      }
      if (!nav.nextUrl && (link.rel === "next" || text && NEXT_PATTERNS.some((p) => text.includes(p)))) {
        nav.nextUrl = link.href;
      }
      if (!nav.indexUrl && text && INDEX_PATTERNS.some((p) => text.includes(p))) {
        nav.indexUrl = link.href;
      }
      if (nav.prevUrl && nav.nextUrl && nav.indexUrl) break;
    }
    return nav;
  }
  function extractNavigation(doc, rule2, currentUrl) {
    let prevUrl;
    let nextUrl;
    let indexUrl;
    if (rule2.prevSelector) {
      const el = querySelector(doc, rule2.prevSelector);
      prevUrl = (el == null ? void 0 : el.href) || void 0;
    }
    if (rule2.nextSelector) {
      const el = querySelector(doc, rule2.nextSelector);
      nextUrl = (el == null ? void 0 : el.href) || void 0;
    }
    if (rule2.indexSelector) {
      const el = querySelector(doc, rule2.indexSelector);
      indexUrl = (el == null ? void 0 : el.href) || void 0;
    }
    if (!prevUrl || !nextUrl || !indexUrl) {
      const autoNav = findAllNavLinks(doc);
      prevUrl = prevUrl || autoNav.prevUrl;
      nextUrl = nextUrl || autoNav.nextUrl;
      indexUrl = indexUrl || autoNav.indexUrl;
    }
    const toAbs = (href) => {
      if (!href) return void 0;
      const abs = getAbsoluteUrl(href, currentUrl);
      if (!abs || abs.startsWith("javascript:") || abs === currentUrl) return void 0;
      return abs;
    };
    return {
      prevUrl: toAbs(prevUrl),
      nextUrl: toAbs(nextUrl),
      indexUrl: toAbs(indexUrl)
    };
  }
  function detectVip(contentText, rule2) {
    if (rule2.isVip) return true;
    if (!contentText || contentText.length < VIP_MIN_TEXT_LENGTH) return true;
    return false;
  }
  function parseChapter(doc, currentUrl, rule2, textRules2, cleanOptions2) {
    logger.info(`解析章节: ${currentUrl}`);
    let { bookTitle, chapterTitle } = extractTitle(doc, rule2);
    const { html } = extractContent(doc, rule2, rule2.removeSelectors);
    const nav = extractNavigation(doc, rule2, currentUrl);
    const allTextRules = [
      ...rule2.contentReplaceRules ?? [],
      ...textRules2 ?? []
    ];
    const cleaned = cleanContent(html, allTextRules, cleanOptions2);
    if ((cleanOptions2 == null ? void 0 : cleanOptions2.convertToTraditional) && (cleanOptions2 == null ? void 0 : cleanOptions2.s2tMapping)) {
      bookTitle = convertS2T(bookTitle, cleanOptions2.s2tMapping);
      chapterTitle = convertS2T(chapterTitle, cleanOptions2.s2tMapping);
    }
    const isVip = detectVip(cleaned.text, rule2);
    const isSection = cleaned.text.length < 20 || /^第[一二三四五六七八九十百零]+卷/.test(chapterTitle || "");
    const result = {
      url: currentUrl,
      bookTitle: bookTitle || rule2.name || "",
      chapterTitle: chapterTitle || "",
      documentTitle: doc.title,
      contentHtml: cleaned.html,
      contentText: cleaned.text,
      prevUrl: nav.prevUrl,
      nextUrl: nav.nextUrl,
      indexUrl: nav.indexUrl,
      isVip,
      isSection
    };
    logger.info(`解析完成: ${result.bookTitle} - ${result.chapterTitle}`);
    return result;
  }
  const SKIN_PRESETS = {
    default: {
      name: "缺省皮肤",
      css: ""
    },
    dark: {
      name: "暗色皮肤",
      css: `
.nr-reader-container { color: #666; background-color: rgba(0,0,0,.1); }
`
    },
    white: {
      name: "白底黑字",
      css: `
.nr-reader-container { color: black; background-color: white; }
.nr-chapter-title { font-weight: bold; border-bottom-color: currentColor; }
`
    },
    night: {
      name: "夜间模式",
      css: `
.nr-reader-container { color: #939392; background: #2d2d2d; }
.nr-settings-btn { background: white; }
.nr-chapter-body img { background-color: #c0c0c0; }
.nr-sidebar-item.active { color: #939392; }
`
    },
    "night-1": {
      name: "夜间模式1",
      css: `
.nr-reader-container { color: #679; background-color: black; }
.nr-settings-btn { background-color: white !important; }
.nr-chapter-title { color: #3399FF; background-color: #121212; }
`
    },
    "night-2": {
      name: "夜间模式2",
      css: `
.nr-reader-container { color: #AAAAAA; background-color: #121212; }
.nr-settings-btn { background-color: white; }
.nr-chapter-body img { background-color: #c0c0c0; }
.nr-chapter-title { color: #3399FF; background-color: #121212; }
.nr-reader-container a { color: #E0BC2D; }
.nr-reader-container a:visited { color: #AAAAAA; }
.nr-reader-container a:hover { color: #3399FF; }
.nr-reader-container a:active { color: #423F3F; }
`
    },
    "night-duokan": {
      name: "夜间模式（多看）",
      css: `
.nr-reader-container { color: #4A4A4A; background: #101819; }
.nr-settings-btn { background: white; }
.nr-chapter-body img { background-color: #c0c0c0; }
`
    },
    orange: {
      name: "橙色背景",
      css: `
.nr-reader-container { color: #24272c; background-color: #FEF0E1; }
`
    },
    green: {
      name: "绿色背景",
      css: `
.nr-reader-container { color: black; background-color: #d8e2c8; }
`
    },
    "green-2": {
      name: "绿色背景2",
      css: `
.nr-reader-container { color: black; background-color: #CCE8CF; }
`
    },
    blue: {
      name: "蓝色背景",
      css: `
.nr-reader-container { color: black; background-color: #E7F4FE; }
`
    },
    brown: {
      name: "棕黄背景",
      css: `
.nr-reader-container { color: black; background-color: #C2A886; }
`
    },
    classic: {
      name: "经典皮肤",
      css: `
.nr-reader-container { color: black; background-color: #EAEAEE; }
.nr-chapter-title { background-color: #f0f0f0; }
`
    },
    "qidian-parchment-dark": {
      name: "起点牛皮纸（深色）",
      css: `
.nr-reader-container { color: black; background: url("http://qidian.gtimg.com/qd/images/read.qidian.com/theme/body_theme1_bg_2x.0.3.png"); }
`
    },
    "qidian-parchment-light": {
      name: "起点牛皮纸（浅色）",
      css: `
.nr-reader-container { color: black; background: url("http://qidian.gtimg.com/qd/images/read.qidian.com/theme/theme_1_bg_2x.0.3.png"); }
`
    },
    "qidian-black": {
      name: "起点黑色",
      css: `
.nr-reader-container,
.nr-sidebar,
.nr-sidebar-header { color: #666; background: #111 url("https://qidian.gtimg.com/qd/images/read.qidian.com/theme/theme_6_bg.45ad3.png") repeat; }
.nr-settings-btn { background: white; }
`
    },
    "green-bright": {
      name: "绿色亮字",
      css: `
.nr-reader-container,
.nr-sidebar,
.nr-sidebar-header,
.nr-sidebar-item.active { color: rgb(187,215,188); background-color: rgb(18,44,20); }
`
    }
  };
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
  overflow-y: auto;
  scroll-behavior: smooth;
}
.nr-sidebar {
  order: 0;
  position: sticky;
  top: 0;
  width: 220px;
  min-width: 220px;
  height: 100vh;
  flex-shrink: 0;
  background: inherit;
  border-right: 1px solid rgba(0,0,0,0.14);
  display: flex;
  flex-direction: column;
  overflow: visible;
  transition: margin-left 0.25s ease, width 0.25s ease;
}
.nr-sidebar::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.08);
  pointer-events: none;
}
.nr-sidebar-hidden .nr-sidebar {
  margin-left: -220px;
}
.nr-sidebar-header {
  position: relative;
  z-index: 1;
  padding: 12px 14px;
  font-weight: 700;
  font-size: 15px;
  border-bottom: 1px solid rgba(0,0,0,0.12);
  flex-shrink: 0;
}
.nr-sidebar-list {
  position: relative;
  z-index: 1;
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
  text-align: left;
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
  position: absolute;
  right: -24px;
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
}
.nr-sidebar-toggle:hover {
  background: #ccc;
}
.nr-content-area {
  order: 1;
  flex: 1;
  min-width: 0;
  padding: 40px 80px 80px;
  max-width: var(--nr-content-max-width);
  margin-left: var(--nr-content-ml, auto);
  margin-right: var(--nr-content-mr, auto);
  text-align: left;
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
  text-align: left;
}
.nr-chapter-body p {
  margin: 0 0 1em;
  text-indent: 2em;
}
.nr-chapter-body img {
  display: block;
  margin: 1em auto;
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
  let extraCssEl = null;
  let skinCssEl = null;
  function injectReaderStyles() {
    gmAddStyle(READER_CSS);
  }
  function updateReaderStyleVars(settings) {
    const container = document.querySelector(".nr-reader-container");
    if (!container) return;
    container.style.setProperty("--nr-font-family", settings.fontFamily);
    container.style.setProperty("--nr-font-size", settings.fontSize + "px");
    container.style.setProperty("--nr-line-height", String(settings.lineHeight));
    container.style.setProperty("--nr-content-max-width", settings.contentWidth + "px");
    const ml = settings.contentAlign === "left" ? "0" : "auto";
    const mr = settings.contentAlign === "right" ? "0" : "auto";
    container.style.setProperty("--nr-content-ml", ml);
    container.style.setProperty("--nr-content-mr", mr);
  }
  function updateSkinCss(skinName) {
    var _a;
    const css = ((_a = SKIN_PRESETS[skinName]) == null ? void 0 : _a.css) ?? "";
    if (!skinCssEl) {
      skinCssEl = document.createElement("style");
      skinCssEl.id = "nr-skin-css";
      document.head.appendChild(skinCssEl);
    }
    skinCssEl.textContent = css;
  }
  function updateExtraCss(css) {
    if (!extraCssEl) {
      extraCssEl = document.createElement("style");
      extraCssEl.id = "nr-extra-css";
      document.head.appendChild(extraCssEl);
    }
    extraCssEl.textContent = css;
  }
  function removeExtraCss() {
    if (extraCssEl) {
      extraCssEl.remove();
      extraCssEl = null;
    }
  }
  function removeSkinCss() {
    if (skinCssEl) {
      skinCssEl.remove();
      skinCssEl = null;
    }
  }
  let sidebarRef = null;
  function createSidebar(container, chapters, activeIndex, onChapterClick) {
    var _a;
    const sidebar = document.createElement("div");
    sidebar.className = "nr-sidebar";
    const header = document.createElement("div");
    header.className = "nr-sidebar-header";
    header.textContent = ((_a = chapters[0]) == null ? void 0 : _a.bookTitle) || "章节目录";
    const list = document.createElement("div");
    list.className = "nr-sidebar-list";
    for (let i = 0; i < chapters.length; i++) {
      const item = createSidebarItem(chapters[i], i, i === activeIndex, onChapterClick);
      list.appendChild(item);
    }
    sidebar.appendChild(header);
    sidebar.appendChild(list);
    container.appendChild(sidebar);
    const toggle = document.createElement("button");
    toggle.className = "nr-sidebar-toggle";
    toggle.textContent = "◀";
    toggle.addEventListener("click", () => {
      if (container.classList.contains("nr-sidebar-hidden")) {
        showSidebar();
      } else {
        hideSidebar();
      }
    });
    sidebar.appendChild(toggle);
    sidebarRef = { el: sidebar, listEl: list, toggleEl: toggle };
    return sidebarRef;
  }
  function createSidebarItem(chapter, index, isActive, onChapterClick) {
    const item = document.createElement("a");
    item.className = "nr-sidebar-item" + (isActive ? " active" : "");
    item.textContent = chapter.chapterTitle || `第 ${index + 1} 章`;
    item.addEventListener("click", (e) => {
      if (e.button === 1 || e.ctrlKey || e.metaKey) {
        if (chapter.url) {
          e.preventDefault();
          window.open(chapter.url, "_blank");
          return;
        }
      }
      e.preventDefault();
      onChapterClick(index);
    });
    return item;
  }
  function addSidebarItem(chapter, onChapterClick) {
    if (!sidebarRef) return;
    const items = sidebarRef.listEl.querySelectorAll(".nr-sidebar-item");
    const index = items.length;
    const item = createSidebarItem(chapter, index, false, onChapterClick);
    sidebarRef.listEl.appendChild(item);
  }
  function setActiveSidebarItem(index) {
    if (!sidebarRef) return;
    const items = sidebarRef.listEl.querySelectorAll(".nr-sidebar-item");
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }
  function showSidebar() {
    const container = document.querySelector(".nr-reader-container");
    if (container) {
      container.classList.remove("nr-sidebar-hidden");
    }
  }
  function hideSidebar() {
    const container = document.querySelector(".nr-reader-container");
    if (container) {
      container.classList.add("nr-sidebar-hidden");
    }
  }
  function toggleSidebarVisibility() {
    const container = document.querySelector(".nr-reader-container");
    if (!container) return;
    if (container.classList.contains("nr-sidebar-hidden")) {
      showSidebar();
    } else {
      hideSidebar();
    }
  }
  function removeSidebar() {
    if (sidebarRef) {
      sidebarRef.el.remove();
      sidebarRef.toggleEl.remove();
      sidebarRef = null;
    }
  }
  let navRef = null;
  function createNavLink(href, text, onClick) {
    const el = document.createElement("a");
    el.textContent = text;
    el.href = href || "#";
    el.style.visibility = href ? "" : "hidden";
    if (onClick) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        onClick();
      });
    }
    return el;
  }
  function createBottomNav(container, links, onNavigate) {
    const navEl = document.createElement("div");
    navEl.className = "nr-bottom-nav";
    const prev = createNavLink(links.prevUrl || "", "上一章", () => {
      if (links.prevUrl) onNavigate(links.prevUrl);
    });
    const index = createNavLink(links.indexUrl || "", "目录", () => {
      if (links.indexUrl) window.open(links.indexUrl, "_top");
    });
    const next = createNavLink(links.nextUrl || "", "下一章", () => {
      if (links.nextUrl) onNavigate(links.nextUrl);
    });
    navEl.appendChild(prev);
    navEl.appendChild(index);
    navEl.appendChild(next);
    container.appendChild(navEl);
    navRef = { container: navEl, prev, index, next };
    return navEl;
  }
  function updateBottomNav(links, onNavigate) {
    if (!navRef) return;
    navRef.prev.href = links.prevUrl || "#";
    navRef.prev.style.visibility = links.prevUrl ? "" : "hidden";
    navRef.index.href = links.indexUrl || "#";
    navRef.index.style.visibility = links.indexUrl ? "" : "hidden";
    navRef.next.href = links.nextUrl || "#";
    navRef.next.style.visibility = links.nextUrl ? "" : "hidden";
  }
  function removeBottomNav() {
    if (navRef) {
      navRef.container.remove();
      navRef = null;
    }
  }
  const loadedUrls = /* @__PURE__ */ new Set();
  const failedUrls = /* @__PURE__ */ new Set();
  const loadingUrls = /* @__PURE__ */ new Set();
  function isUrlLoaded(url) {
    return loadedUrls.has(url);
  }
  function markUrlLoaded(url) {
    loadedUrls.add(url);
  }
  function clearLoadedUrls() {
    loadedUrls.clear();
  }
  function isUrlFailed(url) {
    return failedUrls.has(url);
  }
  function markUrlFailed(url) {
    failedUrls.add(url);
  }
  function clearFailedUrls() {
    failedUrls.clear();
  }
  function isUrlLoading(url) {
    return loadingUrls.has(url);
  }
  function markUrlLoading(url) {
    loadingUrls.add(url);
  }
  async function loadNextChapter(url, rule2, textRules2, cleanOptions2, maxRetries = 2, retryDelay = 2e3) {
    if (isUrlLoaded(url)) {
      logger.info(`跳过已加载 URL: ${url}`);
      return { status: "skipped", chapter: null, url };
    }
    if (isUrlFailed(url)) {
      logger.info(`跳过已失败 URL: ${url}`);
      return { status: "skipped", chapter: null, url };
    }
    if (isUrlLoading(url)) {
      logger.info(`跳过正在加载中的 URL: ${url}`);
      return { status: "skipped", chapter: null, url };
    }
    markUrlLoading(url);
    try {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`加载下一页${attempt > 0 ? ` (重试 ${attempt}/${maxRetries})` : ""}: ${url}`);
          const html = await gmFetch(url);
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const chapter = parseChapter(doc, url, rule2, textRules2, cleanOptions2);
          markUrlLoaded(url);
          return { status: "loaded", chapter, url };
        } catch (e) {
          lastError = e;
          logger.warn(`加载下一页失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${url}`, e);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }
      markUrlFailed(url);
      const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
      logger.warn(`加载下一页最终失败: ${url}`, lastError);
      return { status: "failed", chapter: null, url, error: errorMessage };
    } finally {
      loadingUrls.delete(url);
    }
  }
  function preloadImages(contentHtml, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, "text/html");
    const imgs = doc.querySelectorAll("img[src]");
    for (const img of imgs) {
      const src = img.getAttribute("src");
      if (src) {
        try {
          new Image().src = new URL(src, baseUrl).href;
        } catch {
          new Image().src = src;
        }
      }
    }
  }
  const PANEL_CSS = `
.nr-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483649;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nr-panel {
  background: #fff;
  border-radius: 8px;
  width: 500px;
  max-width: 92vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.nr-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.nr-panel-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
.nr-panel-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 20px;
  color: #999;
  border-radius: 4px;
  line-height: 1;
  padding: 0;
}
.nr-panel-close-btn:hover {
  background: #f0f0f0;
  color: #333;
}
.nr-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
}
.nr-panel-section {
  margin-bottom: 20px;
}
.nr-panel-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}
.nr-panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  min-height: 32px;
}
.nr-panel-row label {
  font-size: 14px;
  color: #333;
  flex-shrink: 0;
  margin-right: 12px;
}
.nr-panel-row input[type="text"],
.nr-panel-row input[type="number"],
.nr-panel-row select {
  width: 200px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}
.nr-panel-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin: 0;
}
.nr-panel-row textarea {
  width: 100%;
  min-height: 80px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
}
.nr-panel-row-full {
  flex-direction: column;
  align-items: flex-start;
}
.nr-panel-row-full label {
  margin-bottom: 4px;
}
.nr-panel-save-hint {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  margin-top: 12px;
}
`;
  let overlayEl = null;
  let onChangeCallback = null;
  let currentSettings = null;
  let stylesInjected = false;
  function ensureStyles() {
    if (!stylesInjected) {
      gmAddStyle(PANEL_CSS);
      stylesInjected = true;
    }
  }
  function createRow(label, control, fullWidth = false) {
    const row = document.createElement("div");
    row.className = fullWidth ? "nr-panel-row nr-panel-row-full" : "nr-panel-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(control);
    return row;
  }
  function createTextInput(key, value) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.addEventListener("change", () => {
      saveSetting(key, input.value);
      onChangeCallback == null ? void 0 : onChangeCallback(key, input.value);
    });
    return input;
  }
  function createNumberInput(key, value, step = 1) {
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value);
    if (step !== 1) input.step = String(step);
    input.addEventListener("change", () => {
      const num = Number(input.value);
      if (!isNaN(num)) {
        saveSetting(key, num);
        onChangeCallback == null ? void 0 : onChangeCallback(key, num);
      }
    });
    return input;
  }
  function createCheckbox(key, value) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value;
    input.addEventListener("change", () => {
      saveSetting(key, input.checked);
      onChangeCallback == null ? void 0 : onChangeCallback(key, input.checked);
    });
    return input;
  }
  function createTextarea(key, value) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.addEventListener("change", () => {
      saveSetting(key, textarea.value);
      onChangeCallback == null ? void 0 : onChangeCallback(key, textarea.value);
    });
    return textarea;
  }
  function createContentAlignSelect(value) {
    const select = document.createElement("select");
    const opts = [["center", "居中"], ["left", "居左"], ["right", "居右"]];
    for (const [val, label] of opts) {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = label;
      select.appendChild(option);
    }
    select.value = value;
    select.addEventListener("change", () => {
      saveSetting("contentAlign", select.value);
      onChangeCallback == null ? void 0 : onChangeCallback("contentAlign", select.value);
    });
    return select;
  }
  function createSkinSelect(value) {
    const select = document.createElement("select");
    for (const [key, preset] of Object.entries(SKIN_PRESETS)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = preset.name;
      select.appendChild(option);
    }
    select.value = value;
    select.addEventListener("change", () => {
      saveSetting("skinName", select.value);
      onChangeCallback == null ? void 0 : onChangeCallback("skinName", select.value);
    });
    return select;
  }
  function buildPanel(settings) {
    const panel = document.createElement("div");
    panel.className = "nr-panel";
    const header = document.createElement("div");
    header.className = "nr-panel-header";
    const title = document.createElement("h3");
    title.textContent = "阅读设置";
    const closeBtn = document.createElement("button");
    closeBtn.className = "nr-panel-close-btn";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", closePreferencesPanel);
    header.appendChild(title);
    header.appendChild(closeBtn);
    const body = document.createElement("div");
    body.className = "nr-panel-body";
    function addSection(sectionTitle) {
      const section = document.createElement("div");
      section.className = "nr-panel-section";
      const st = document.createElement("div");
      st.className = "nr-panel-section-title";
      st.textContent = sectionTitle;
      section.appendChild(st);
      body.appendChild(section);
      return section;
    }
    const styleSection = addSection("阅读样式");
    styleSection.appendChild(createRow("皮肤预设", createSkinSelect(settings.skinName)));
    styleSection.appendChild(createRow("字体", createTextInput("fontFamily", settings.fontFamily)));
    styleSection.appendChild(createRow("字号(px)", createNumberInput("fontSize", settings.fontSize)));
    styleSection.appendChild(createRow("行高", createNumberInput("lineHeight", settings.lineHeight, 0.1)));
    styleSection.appendChild(createRow("内容宽度(px)", createNumberInput("contentWidth", settings.contentWidth)));
    styleSection.appendChild(createRow("内容对齐", createContentAlignSelect(settings.contentAlign)));
    styleSection.appendChild(createRow("自定义CSS", createTextarea("extraCss", settings.extraCss), true));
    const toggleSection = addSection("功能开关");
    toggleSection.appendChild(createRow("简繁转换", createCheckbox("convertToTraditional", settings.convertToTraditional)));
    toggleSection.appendChild(createRow("强制分段", createCheckbox("splitContent", settings.splitContent)));
    toggleSection.appendChild(createRow("隐藏历史章节菜单", createCheckbox("hideHistoryMenu", settings.hideHistoryMenu)));
    toggleSection.appendChild(createRow("隐藏底部导航", createCheckbox("hideFooterNav", settings.hideFooterNav)));
    toggleSection.appendChild(createRow("隐藏设置按钮", createCheckbox("hidePreferencesButton", settings.hidePreferencesButton)));
    toggleSection.appendChild(createRow("图片预加载", createCheckbox("imagePreload", settings.imagePreload)));
    toggleSection.appendChild(createRow("调试日志", createCheckbox("debug", settings.debug)));
    toggleSection.appendChild(createRow("禁用自动启动", createCheckbox("disableAutoLaunch", settings.disableAutoLaunch)));
    toggleSection.appendChild(createRow("启用Booklink", createCheckbox("booklinkEnable", settings.booklinkEnable)));
    toggleSection.appendChild(createRow("下一页加入历史", createCheckbox("addNextPageToHistory", settings.addNextPageToHistory)));
    toggleSection.appendChild(createRow("双击暂停", createCheckbox("doubleClickPause", settings.doubleClickPause)));
    toggleSection.appendChild(createRow("滚动动画", createCheckbox("scrollAnimate", settings.scrollAnimate)));
    const urlSection = addSection("远程地址");
    urlSection.appendChild(createRow("站点规则", createTextInput("siteRulesUrl", settings.siteRulesUrl)));
    urlSection.appendChild(createRow("文本规则", createTextInput("textRulesUrl", settings.textRulesUrl)));
    urlSection.appendChild(createRow("简繁映射", createTextInput("s2tRulesUrl", settings.s2tRulesUrl)));
    const customSection = addSection("自定义规则");
    const groupInput = document.createElement("input");
    groupInput.type = "text";
    groupInput.value = settings.enabledTextRuleGroups.join(", ");
    groupInput.addEventListener("change", () => {
      const arr = groupInput.value.split(",").map((s) => s.trim()).filter(Boolean);
      saveSetting("enabledTextRuleGroups", arr);
      onChangeCallback == null ? void 0 : onChangeCallback("enabledTextRuleGroups", arr);
    });
    customSection.appendChild(createRow("启用规则组(逗号分隔)", groupInput));
    customSection.appendChild(createRow("自定义站点规则(JSON)", createTextarea("customSiteRules", settings.customSiteRules), true));
    customSection.appendChild(createRow("自定义替换规则(JSON)", createTextarea("customReplaceRules", settings.customReplaceRules), true));
    const loadSection = addSection("连续加载");
    loadSection.appendChild(createRow("触发距离(px)", createNumberInput("remainHeight", settings.remainHeight)));
    loadSection.appendChild(createRow("最大重试", createNumberInput("maxRetries", settings.maxRetries)));
    loadSection.appendChild(createRow("重试间隔(ms)", createNumberInput("retryDelay", settings.retryDelay)));
    loadSection.appendChild(createRow("保留章节数", createNumberInput("maxKeptChapters", settings.maxKeptChapters)));
    const kbSection = addSection("快捷键");
    const kbTextarea = document.createElement("textarea");
    kbTextarea.value = JSON.stringify(settings.keybindings, null, 2);
    kbTextarea.addEventListener("change", () => {
      try {
        const parsed = JSON.parse(kbTextarea.value);
        saveSetting("keybindings", parsed);
        onChangeCallback == null ? void 0 : onChangeCallback("keybindings", parsed);
      } catch {
      }
    });
    kbSection.appendChild(createRow("快捷键配置(JSON)", kbTextarea, true));
    const hint = document.createElement("div");
    hint.className = "nr-panel-save-hint";
    hint.textContent = "修改后自动保存";
    body.appendChild(hint);
    panel.appendChild(header);
    panel.appendChild(body);
    return panel;
  }
  function openPreferencesPanel(onChange) {
    if (overlayEl) return;
    ensureStyles();
    currentSettings = loadAllSettings();
    onChangeCallback = onChange ?? null;
    const panel = buildPanel(currentSettings);
    overlayEl = document.createElement("div");
    overlayEl.className = "nr-panel-overlay";
    overlayEl.appendChild(panel);
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) {
        closePreferencesPanel();
      }
    });
    document.body.appendChild(overlayEl);
  }
  function closePreferencesPanel() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
      onChangeCallback = null;
      currentSettings = null;
    }
  }
  function isPanelOpen() {
    return overlayEl !== null;
  }
  const DEFAULT_KEYBINDINGS = {
    openIndex: "enter",
    prevChapter: "arrowleft",
    nextChapter: "arrowright",
    pageUp: ",",
    pageDown: ".",
    openSettings: "ctrl+,",
    toggleSidebar: "ctrl+b",
    toggleQuietMode: "ctrl+q"
  };
  let keydownHandler = null;
  let customBindings = {};
  function shouldIgnore() {
    var _a;
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (((_a = el.getAttribute) == null ? void 0 : _a.call(el, "contenteditable")) === "true") return true;
    return false;
  }
  function matchesBinding(e, binding) {
    const parts = binding.toLowerCase().split("+");
    const modifiers = parts.filter((p) => p !== parts[parts.length - 1]);
    const key = parts[parts.length - 1];
    const ctrlRequired = modifiers.includes("ctrl");
    const shiftRequired = modifiers.includes("shift");
    const altRequired = modifiers.includes("alt");
    if (e.ctrlKey !== ctrlRequired) return false;
    if (e.shiftKey !== shiftRequired) return false;
    if (e.altKey !== altRequired) return false;
    return e.key.toLowerCase() === key;
  }
  function getScrollContainer() {
    return document.querySelector(".nr-content-area");
  }
  function initKeyboard(handlers, keybindings) {
    customBindings = { ...DEFAULT_KEYBINDINGS, ...keybindings };
    keydownHandler = (e) => {
      var _a, _b, _c, _d, _e;
      if (shouldIgnore()) return;
      if (e.key === "Escape") {
        if (isPanelOpen()) {
          e.preventDefault();
          closePreferencesPanel();
          return;
        }
        return;
      }
      if (isPanelOpen()) return;
      if (matchesBinding(e, customBindings.openIndex)) {
        e.preventDefault();
        (_a = handlers.onOpenIndex) == null ? void 0 : _a.call(handlers);
        return;
      }
      if (matchesBinding(e, customBindings.prevChapter)) {
        e.preventDefault();
        (_b = handlers.onPrevChapter) == null ? void 0 : _b.call(handlers);
        return;
      }
      if (matchesBinding(e, customBindings.nextChapter)) {
        e.preventDefault();
        (_c = handlers.onNextChapter) == null ? void 0 : _c.call(handlers);
        return;
      }
      if (matchesBinding(e, customBindings.pageUp)) {
        e.preventDefault();
        const container = getScrollContainer();
        if (container) {
          container.scrollTop -= container.clientHeight * 0.8;
        }
        return;
      }
      if (matchesBinding(e, customBindings.pageDown)) {
        e.preventDefault();
        const container = getScrollContainer();
        if (container) {
          container.scrollTop += container.clientHeight * 0.8;
        }
        return;
      }
      if (matchesBinding(e, customBindings.openSettings)) {
        e.preventDefault();
        if (handlers.onOpenSettings) {
          handlers.onOpenSettings();
        } else {
          openPreferencesPanel();
        }
        return;
      }
      if (matchesBinding(e, customBindings.toggleSidebar)) {
        e.preventDefault();
        (_d = handlers.onToggleSidebar) == null ? void 0 : _d.call(handlers);
        return;
      }
      if (matchesBinding(e, customBindings.toggleQuietMode)) {
        e.preventDefault();
        (_e = handlers.onToggleQuietMode) == null ? void 0 : _e.call(handlers);
        return;
      }
    };
    document.addEventListener("keydown", keydownHandler);
    return () => {
      if (keydownHandler) {
        document.removeEventListener("keydown", keydownHandler);
        keydownHandler = null;
      }
    };
  }
  let state = null;
  let rule = null;
  let textRules = [];
  let cleanOptions = {};
  let containerEl = null;
  let contentAreaEl = null;
  let isLoadingNext = false;
  let loadingIndicatorEl = null;
  let errorIndicatorEl = null;
  let scrollHandler = null;
  let keyboardCleanup = null;
  let syncActiveChapterTimer = null;
  let autoLoadCooldownTimer = null;
  function ensureViewport() {
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1.0";
      document.head.appendChild(meta);
    }
  }
  function renderChapterElement(chapter, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "nr-chapter";
    wrapper.setAttribute("data-chapter-index", String(index));
    const title = document.createElement("h2");
    title.className = "nr-chapter-title";
    title.textContent = chapter.chapterTitle || chapter.bookTitle || `第 ${index + 1} 章`;
    const body = document.createElement("div");
    body.className = "nr-chapter-body";
    body.innerHTML = chapter.contentHtml;
    wrapper.appendChild(title);
    wrapper.appendChild(body);
    return wrapper;
  }
  function syncActiveChapter() {
    if (!containerEl || !contentAreaEl || !state) return;
    const containerRect = containerEl.getBoundingClientRect();
    const chapters = contentAreaEl.querySelectorAll(".nr-chapter");
    let bestIndex = -1;
    let bestArea = 0;
    for (const ch of chapters) {
      const rect = ch.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.right, containerRect.right) - Math.max(rect.left, containerRect.left));
      const y = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
      const area = x * y;
      if (area > bestArea) {
        bestArea = area;
        bestIndex = Number(ch.getAttribute("data-chapter-index"));
      }
    }
    if (bestIndex >= 0 && !isNaN(bestIndex) && bestIndex !== state.activeIndex) {
      state.activeIndex = bestIndex;
      setActiveSidebarItem(bestIndex);
      applyTitleUpdate(bestIndex);
      updateHistory(bestIndex);
    }
  }
  function applyTitleUpdate(index) {
    if (!state || !state.chapters[index]) return;
    const chapter = state.chapters[index];
    const newTitle = chapter.bookTitle ? `${chapter.chapterTitle || ""} - ${chapter.bookTitle}` : chapter.chapterTitle;
    if (newTitle && document.title !== newTitle) {
      document.title = newTitle;
    }
  }
  function updateHistory(index) {
    if (!state || !state.chapters[index]) return;
    const settings = loadAllSettings();
    if (!settings.addNextPageToHistory) return;
    const chapter = state.chapters[index];
    const title = chapter.bookTitle ? `${chapter.chapterTitle || ""} - ${chapter.bookTitle}` : chapter.chapterTitle || "";
    let url;
    try {
      url = chapter.url && new URL(chapter.url).origin === location.origin ? chapter.url : void 0;
    } catch {
      url = void 0;
    }
    history.pushState(
      { chapterIndex: index, chapterTitle: chapter.chapterTitle, bookTitle: chapter.bookTitle },
      title,
      url
    );
  }
  function showLoadingIndicator() {
    if (!contentAreaEl || loadingIndicatorEl) return;
    loadingIndicatorEl = document.createElement("div");
    loadingIndicatorEl.className = "nr-loading-indicator";
    loadingIndicatorEl.textContent = "正在加载下一章...";
    contentAreaEl.appendChild(loadingIndicatorEl);
  }
  function hideLoadingIndicator() {
    if (loadingIndicatorEl) {
      loadingIndicatorEl.remove();
      loadingIndicatorEl = null;
    }
  }
  function showErrorIndicator(url) {
    if (!contentAreaEl || errorIndicatorEl) return;
    errorIndicatorEl = document.createElement("div");
    errorIndicatorEl.className = "nr-error-indicator";
    const link = document.createElement("a");
    link.textContent = "加载失败，点击手动打开下一页";
    link.href = url;
    link.target = "_blank";
    errorIndicatorEl.appendChild(link);
    contentAreaEl.appendChild(errorIndicatorEl);
  }
  function removeErrorIndicator() {
    if (errorIndicatorEl) {
      errorIndicatorEl.remove();
      errorIndicatorEl = null;
    }
  }
  async function triggerAutoLoad(url) {
    if (isLoadingNext || !rule) return;
    if (isUrlFailed(url)) return;
    isLoadingNext = true;
    removeErrorIndicator();
    showLoadingIndicator();
    const st = loadAllSettings();
    const maxRetries = st.maxRetries;
    const retryDelay = st.retryDelay;
    const result = await loadNextChapter(url, rule, textRules, cleanOptions, maxRetries, retryDelay);
    hideLoadingIndicator();
    if (result.status === "loaded" && result.chapter) {
      if (st.imagePreload) {
        preloadImages(result.chapter.contentHtml, url);
      }
      appendChapter(result.chapter);
    } else if (result.status === "failed") {
      showErrorIndicator(url);
    }
    if (autoLoadCooldownTimer) clearTimeout(autoLoadCooldownTimer);
    autoLoadCooldownTimer = setTimeout(() => {
      autoLoadCooldownTimer = null;
    }, 500);
    isLoadingNext = false;
  }
  function setupScrollLoad() {
    if (!containerEl) return;
    const st = loadAllSettings();
    scrollHandler = () => {
      if (!containerEl || !state) return;
      if (syncActiveChapterTimer) clearTimeout(syncActiveChapterTimer);
      syncActiveChapterTimer = setTimeout(syncActiveChapter, 200);
      if (isLoadingNext || state.autoLoadPaused || autoLoadCooldownTimer) return;
      const lastChapter = state.chapters[state.chapters.length - 1];
      if (!(lastChapter == null ? void 0 : lastChapter.nextUrl)) return;
      const { scrollTop, scrollHeight, clientHeight } = containerEl;
      if (scrollHeight - scrollTop - clientHeight < st.remainHeight) {
        triggerAutoLoad(lastChapter.nextUrl);
      }
    };
    containerEl.addEventListener("scroll", scrollHandler, { passive: true });
  }
  function onSettingChange(key, value) {
    const all = loadAllSettings();
    switch (key) {
      case "fontFamily":
      case "fontSize":
      case "lineHeight":
      case "contentWidth":
      case "contentAlign":
        updateReaderStyleVars(all);
        break;
      case "hideSidebar":
      case "hideHistoryMenu":
        if (value) {
          containerEl == null ? void 0 : containerEl.classList.add("nr-sidebar-hidden");
        } else {
          containerEl == null ? void 0 : containerEl.classList.remove("nr-sidebar-hidden");
        }
        if (state) state.sidebarVisible = !value;
        break;
      case "hideFooterNav":
        if (value) {
          containerEl == null ? void 0 : containerEl.classList.add("nr-nav-hidden");
        } else {
          containerEl == null ? void 0 : containerEl.classList.remove("nr-nav-hidden");
        }
        break;
      case "hidePreferencesButton": {
        const btn = document.querySelector(".nr-settings-btn");
        if (btn) btn.style.display = value ? "none" : "";
        break;
      }
      case "extraCss":
        updateExtraCss(value);
        break;
      case "skinName":
        updateSkinCss(value);
        break;
      case "debug":
        logger.setDebug(value);
        break;
      case "keybindings": {
        if (keyboardCleanup) {
          keyboardCleanup();
          keyboardCleanup = null;
        }
        setupKeyboard();
        break;
      }
    }
  }
  function setupKeyboard() {
    const handlers = {
      onOpenIndex: () => {
        const last = state == null ? void 0 : state.chapters[state.chapters.length - 1];
        if (last == null ? void 0 : last.indexUrl) {
          window.open(last.indexUrl, "_blank");
        }
      },
      onPrevChapter: () => {
        var _a;
        if (state && state.activeIndex > 0) {
          scrollToChapter(state.activeIndex - 1);
        } else if ((_a = state == null ? void 0 : state.chapters[0]) == null ? void 0 : _a.prevUrl) {
          navigateToChapter(state.chapters[0].prevUrl);
        }
      },
      onNextChapter: () => {
        if (state && state.activeIndex < state.chapters.length - 1) {
          scrollToChapter(state.activeIndex + 1);
        } else {
          const last = state == null ? void 0 : state.chapters[state.chapters.length - 1];
          if (last == null ? void 0 : last.nextUrl) {
            navigateToChapter(last.nextUrl);
          }
        }
      },
      onToggleSidebar: () => toggleSidebarVisibility(),
      onToggleQuietMode: () => toggleQuietMode(),
      onOpenSettings: () => openPreferencesPanel(onSettingChange)
    };
    keyboardCleanup = initKeyboard(handlers, loadAllSettings().keybindings);
  }
  function renderReaderView(initialChapter, r, tr, co) {
    rule = r;
    textRules = tr;
    cleanOptions = co;
    const settings = loadAllSettings();
    injectReaderStyles();
    updateSkinCss(settings.skinName);
    if (settings.extraCss) {
      updateExtraCss(settings.extraCss);
    }
    ensureViewport();
    document.body.innerHTML = "";
    containerEl = document.createElement("div");
    containerEl.className = "nr-reader-container";
    if (settings.hideSidebar || settings.hideHistoryMenu) {
      containerEl.classList.add("nr-sidebar-hidden");
    }
    if (settings.hideFooterNav) {
      containerEl.classList.add("nr-nav-hidden");
    }
    contentAreaEl = document.createElement("div");
    contentAreaEl.className = "nr-content-area";
    const chapterEl = renderChapterElement(initialChapter, 0);
    contentAreaEl.appendChild(chapterEl);
    containerEl.appendChild(contentAreaEl);
    document.body.appendChild(containerEl);
    updateReaderStyleVars(settings);
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "nr-settings-btn";
    settingsBtn.textContent = "⚙";
    settingsBtn.title = "设置";
    if (settings.hidePreferencesButton) {
      settingsBtn.style.display = "none";
    }
    settingsBtn.addEventListener("click", () => {
      openPreferencesPanel(onSettingChange);
    });
    document.body.appendChild(settingsBtn);
    state = {
      chapters: [initialChapter],
      activeIndex: 0,
      sidebarVisible: !(settings.hideSidebar || settings.hideHistoryMenu),
      quietMode: false,
      autoLoadPaused: false
    };
    createSidebar(containerEl, state.chapters, 0, (index) => {
      scrollToChapter(index);
    });
    createBottomNav(
      containerEl,
      {
        prevUrl: initialChapter.prevUrl,
        indexUrl: initialChapter.indexUrl,
        nextUrl: initialChapter.nextUrl
      },
      async (url) => {
        await navigateToChapter(url);
      }
    );
    applyTitleUpdate(0);
    setupScrollLoad();
    setupKeyboard();
    if (settings.doubleClickPause && contentAreaEl) {
      contentAreaEl.addEventListener("dblclick", () => {
        if (!state) return;
        state.autoLoadPaused = !state.autoLoadPaused;
      });
    }
    logger.info("阅读视图渲染完成", {
      bookTitle: initialChapter.bookTitle,
      chapterTitle: initialChapter.chapterTitle
    });
  }
  function trimDistantChapters() {
    if (!contentAreaEl || !state) return;
    const maxKept = loadAllSettings().maxKeptChapters;
    const chapterEls = contentAreaEl.querySelectorAll(".nr-chapter");
    if (chapterEls.length <= maxKept) return;
    const activeIdx = state.activeIndex;
    const sorted = Array.from(chapterEls).sort((a, b) => {
      const distA = Math.abs(Number(a.getAttribute("data-chapter-index")) - activeIdx);
      const distB = Math.abs(Number(b.getAttribute("data-chapter-index")) - activeIdx);
      return distA - distB;
    });
    for (let i = maxKept; i < sorted.length; i++) {
      sorted[i].remove();
    }
  }
  function appendChapter(chapter) {
    if (!state || !contentAreaEl) return;
    state.chapters.push(chapter);
    const index = state.chapters.length - 1;
    const chapterEl = renderChapterElement(chapter, index);
    contentAreaEl.appendChild(chapterEl);
    addSidebarItem(chapter, (i) => {
      scrollToChapter(i);
    });
    updateBottomNav(
      {
        prevUrl: chapter.prevUrl,
        indexUrl: chapter.indexUrl,
        nextUrl: chapter.nextUrl
      }
    );
    trimDistantChapters();
  }
  function scrollToChapter(index) {
    if (!contentAreaEl || !state) return;
    let target = contentAreaEl.querySelector(`[data-chapter-index="${index}"]`);
    if (!target) {
      const chapter = state.chapters[index];
      if (chapter) {
        target = renderChapterElement(chapter, index);
        const next = contentAreaEl.querySelector(`[data-chapter-index="${index + 1}"]`);
        if (next) {
          contentAreaEl.insertBefore(target, next);
        } else {
          contentAreaEl.appendChild(target);
        }
      }
    }
    if (target && typeof target.scrollIntoView === "function") {
      const st = loadAllSettings();
      target.scrollIntoView({ behavior: st.scrollAnimate ? "smooth" : "auto", block: "start" });
    }
    state.activeIndex = index;
    setActiveSidebarItem(index);
    applyTitleUpdate(index);
    updateHistory(index);
    trimDistantChapters();
  }
  async function navigateToChapter(url) {
    if (!rule || isLoadingNext) return;
    isLoadingNext = true;
    removeErrorIndicator();
    showLoadingIndicator();
    const st = loadAllSettings();
    const result = await loadNextChapter(url, rule, textRules, cleanOptions, st.maxRetries, st.retryDelay);
    hideLoadingIndicator();
    if (result.status === "loaded" && result.chapter) {
      appendChapter(result.chapter);
      scrollToChapter(state.chapters.length - 1);
    } else if (result.status === "failed") {
      showErrorIndicator(url);
      logger.warn(`无法加载章节: ${url}`);
    }
    isLoadingNext = false;
  }
  function toggleQuietMode() {
    if (!containerEl) return;
    if (containerEl.classList.contains("nr-quiet")) {
      containerEl.classList.remove("nr-quiet");
      if (state) state.quietMode = false;
    } else {
      containerEl.classList.add("nr-quiet");
      if (state) state.quietMode = true;
    }
  }
  function destroyReaderView() {
    invalidateSettingsCache();
    if (syncActiveChapterTimer) {
      clearTimeout(syncActiveChapterTimer);
      syncActiveChapterTimer = null;
    }
    if (scrollHandler && containerEl) {
      containerEl.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
    }
    if (keyboardCleanup) {
      keyboardCleanup();
      keyboardCleanup = null;
    }
    hideLoadingIndicator();
    removeErrorIndicator();
    removeExtraCss();
    removeSkinCss();
    isLoadingNext = false;
    if (containerEl) {
      containerEl.remove();
    }
    const settingsBtn = document.querySelector(".nr-settings-btn");
    if (settingsBtn) {
      settingsBtn.remove();
    }
    removeSidebar();
    removeBottomNav();
    clearLoadedUrls();
    clearFailedUrls();
    containerEl = null;
    contentAreaEl = null;
    state = null;
    rule = null;
    textRules = [];
    cleanOptions = {};
  }
  function waitForSelector(selector, doc, timeout = 1e4) {
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
  async function initApp(options) {
    const doc = document;
    const url = location.href;
    const settings = loadAllSettings();
    logger.setDebug(settings.debug);
    logger.info("ReaderApp 启动");
    clearLoadedUrls();
    await initRuleRegistry(settings.siteRulesUrl);
    await initTextRuleRegistry(settings.textRulesUrl);
    const rule2 = matchRule(url);
    if (!rule2) {
      logger.info("当前页面未匹配任何站点规则，跳过");
      return false;
    }
    if (rule2.disableAuto) {
      logger.info("站点规则设置 disableAuto，跳过自动启动");
      return false;
    }
    if (rule2.waitDelay && rule2.waitDelay > 0) {
      logger.info(`等待 ${rule2.waitDelay}ms 后启动...`);
      await new Promise((resolve) => setTimeout(resolve, rule2.waitDelay));
    }
    if (rule2.waitSelector) {
      logger.info(`等待选择器 "${rule2.waitSelector}" 出现...`);
      await waitForSelector(rule2.waitSelector, doc);
    }
    const textRules2 = getCombinedTextRules();
    const s2tMapping = await loadS2TMapping();
    const cleanOptions2 = {
      convertToTraditional: settings.convertToTraditional,
      splitContent: settings.splitContent,
      s2tMapping
    };
    const chapter = parseChapter(doc, url, rule2, textRules2, cleanOptions2);
    logger.info("章节解析完成", {
      bookTitle: chapter.bookTitle,
      chapterTitle: chapter.chapterTitle,
      contentLength: chapter.contentText.length,
      isVip: chapter.isVip,
      hasNext: !!chapter.nextUrl,
      hasPrev: !!chapter.prevUrl
    });
    renderReaderView(chapter, rule2, textRules2, cleanOptions2);
    return true;
  }
  function isBooklinkHost(hostname = location.hostname) {
    return hostname === "booklink.me" || hostname.endsWith(".booklink.me");
  }
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function findUnreadParent() {
    const tds = document.querySelectorAll('td[colspan="2"]');
    for (const td of tds) {
      const text = td.textContent || "";
      if (text.includes("未读") || text.includes("未讀")) {
        return td;
      }
    }
    return null;
  }
  function findUnreadLinks(context) {
    const result = [];
    const xpath = './ancestor::table[@width="100%"]/descendant::a[img[@alt="未读"]]';
    const snapshot = document.evaluate(
      xpath,
      context,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0; i < snapshot.snapshotLength; i++) {
      const node = snapshot.snapshotItem(i);
      if (node instanceof HTMLAnchorElement) {
        result.push(node);
      }
    }
    return result;
  }
  function hasNoPirateMarker(link) {
    const tr = link.closest("tr");
    if (!tr) return false;
    const chapterLink = tr.querySelector("td:last-child a");
    return !!(chapterLink == null ? void 0 : chapterLink.querySelector('font[color*="800000"]'));
  }
  function markClicked(link) {
    const tr = link.closest("tr");
    if (!tr) return;
    const fontEl = tr.querySelector("td:first-child font");
    if (fontEl) {
      fontEl.setAttribute("color", "666666");
    }
    const chapterLink = tr.querySelector("td:last-child a");
    if (chapterLink) {
      chapterLink.classList.add("mclicked");
    }
  }
  function createButton(parent) {
    const btn = document.createElement("a");
    btn.href = "javascript:;";
    btn.title = "一键打开所有未读链接";
    btn.style.cssText = "width:auto;";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const links = findUnreadLinks(btn);
      for (const link of links) {
        if (hasNoPirateMarker(link)) continue;
        await delay(200);
        gmOpenInTab(link.href);
        markClicked(link);
      }
    });
    const img = document.createElement("img");
    img.src = "me.png";
    img.style.cssText = "max-width:20px;";
    btn.appendChild(img);
    parent.appendChild(btn);
  }
  function init() {
    if (!isBooklinkHost()) return;
    const settings = loadAllSettings();
    if (!settings.booklinkEnable) return;
    const parent = findUnreadParent();
    if (!parent) {
      logger.info("booklink.me: 未找到未读区域");
      return;
    }
    createButton(parent);
    logger.info("booklink.me 辅助模式已启动");
  }
  (function() {
    if (window.top !== window.self) {
      return;
    }
    const start = () => {
      logger.info("小说阅读脚本初始化中...");
      if (isBooklinkHost()) {
        init();
        return;
      }
      const settings = loadAllSettings();
      const savedBodyHTML = document.body.innerHTML;
      const savedTitle = document.title;
      let isReadingMode = false;
      function createToggleBtn() {
        const btn = document.createElement("button");
        btn.className = "nr-toggle-btn";
        btn.textContent = isReadingMode ? "✕ 退出阅读" : "📖 阅读模式";
        Object.assign(btn.style, {
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: "2147483648",
          padding: "10px 18px",
          fontSize: "14px",
          cursor: "pointer",
          background: isReadingMode ? "#e74c3c" : "#4a90d9",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          lineHeight: "1"
        });
        btn.addEventListener("click", toggleReadingMode);
        return btn;
      }
      async function toggleReadingMode() {
        var _a;
        if (isReadingMode) {
          destroyReaderView();
          document.body.innerHTML = savedBodyHTML;
          document.title = savedTitle;
          isReadingMode = false;
          document.body.appendChild(createToggleBtn());
        } else {
          (_a = document.querySelector(".nr-toggle-btn")) == null ? void 0 : _a.remove();
          await initApp();
          const readerEl = document.querySelector(".nr-reader-container");
          isReadingMode = !!readerEl;
          document.body.appendChild(createToggleBtn());
        }
      }
      if (settings.disableAutoLaunch) {
        document.body.appendChild(createToggleBtn());
      } else {
        initApp().then((matched) => {
          if (matched) {
            const readerEl = document.querySelector(".nr-reader-container");
            if (readerEl) {
              isReadingMode = true;
            }
            document.body.appendChild(createToggleBtn());
          }
        });
      }
      if (typeof unsafeWindow !== "undefined") {
        unsafeWindow.startNovelReader = () => {
          if (!isReadingMode) {
            return toggleReadingMode();
          }
          return Promise.resolve();
        };
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  })();

})();