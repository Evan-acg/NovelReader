import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractTitle, extractContent, extractNavigation, detectVip, parseChapter } from '../src/core/parser';
import type { SiteRule } from '../src/rules/rule-types';

function makeDoc(html: string, title = ''): Document {
  const fullHtml = `
    <html>
      <head><title>${title}</title></head>
      <body>${html}</body>
    </html>
  `;
  return new JSDOM(fullHtml).window.document;
}

const baseRule: SiteRule = {
  id: 'test',
  name: '测试站点',
  url: '.*',
};

const TEST_S2T: Record<string, string> = {
  '国': '國', '学': '學', '中': '中', '文': '文',
};

describe('书名提取', () => {
  it('按 bookTitleSelector 提取书名', () => {
    const doc = makeDoc('<span class="book-name">剑来</span><h1>第一章 惊蛰</h1>');
    const rule: SiteRule = { ...baseRule, bookTitleSelector: '.book-name', chapterTitleSelector: 'h1' };
    const result = extractTitle(doc, rule);
    expect(result.bookTitle).toBe('剑来');
  });

  it('从 document.title 自动猜测书名（多段格式）', () => {
    const doc = makeDoc('<h1>第一章 惊蛰</h1>', '第一章 惊蛰_剑来_起点中文网');
    const result = extractTitle(doc, baseRule);
    expect(result.bookTitle).toBe('剑来');
    expect(result.chapterTitle).toContain('第一章');
  });

  it('从 document.title 自动猜测（短标题）', () => {
    const doc = makeDoc('<p>正文内容</p>', '三体');
    const result = extractTitle(doc, baseRule);
    expect(result.bookTitle).toBe('三体');
  });

  it('按 bookTitleRegex 正则捕获组提取', () => {
    const doc = makeDoc('', '第一章 惊蛰 - 剑来');
    const rule: SiteRule = {
      ...baseRule,
      bookTitleRegex: '\\s*-\\s*(.+)$',
      chapterTitleRegex: '^(.+?)\\s*-',
    };
    const result = extractTitle(doc, rule);
    expect(result.bookTitle).toBe('剑来');
    expect(result.chapterTitle).toBe('第一章 惊蛰');
  });
});

describe('章节名提取', () => {
  it('按 chapterTitleSelector 提取章节名', () => {
    const doc = makeDoc('<h2 class="chap">第三章 测试</h2>');
    const rule: SiteRule = { ...baseRule, chapterTitleSelector: '.chap' };
    const { chapterTitle } = extractTitle(doc, rule);
    expect(chapterTitle).toBe('第三章 测试');
  });
});

describe('正文提取', () => {
  it('按 contentSelector 提取正文 HTML', () => {
    const doc = makeDoc('<div id="content"><p>第一段</p><p>第二段</p></div>');
    const rule: SiteRule = { ...baseRule, contentSelector: '#content' };
    const { html, text } = extractContent(doc, rule);
    expect(html).toContain('<p>第一段</p>');
    expect(html).toContain('<p>第二段</p>');
    expect(text).toBe('第一段第二段');
  });

  it('contentSelector 未指定时自动猜测正文容器', () => {
    const doc = makeDoc(`
      <div id="article">
        <p>这是正文第一段，内容比较丰富。</p>
        <p>这是正文第二段，继续提供更多信息。</p>
        <p>第三段内容同样重要。</p>
      </div>
      <div class="sidebar">广告侧栏</div>
    `);
    const { html, text } = extractContent(doc, baseRule);
    expect(html).toContain('正文第一段');
    expect(text).toContain('正文第一段');
  });

  it('无正文内容时返回空', () => {
    const doc = makeDoc('<div>短</div>');
    const rule: SiteRule = { ...baseRule, contentSelector: '#nonexistent' };
    const { html, text } = extractContent(doc, rule);
    expect(html).toBe('');
    expect(text).toBe('');
  });

  it('应通过 removeSelectors 移除广告节点', () => {
    const doc = makeDoc('<div id="content"><p>正文</p><div class="ad">广告</div></div>');
    const rule: SiteRule = { ...baseRule, contentSelector: '#content', removeSelectors: ['.ad'] };
    const { html, text } = extractContent(doc, rule, rule.removeSelectors);
    expect(html).toContain('正文');
    expect(html).not.toContain('广告');
    expect(text).toContain('正文');
    expect(text).not.toContain('广告');
  });
});

describe('导航链接提取', () => {
  const currentUrl = 'https://www.example.com/novel/123/2.html';

  it('按 selector 提取导航链接', () => {
    const doc = makeDoc(`
      <a class="prev" href="/novel/123/1.html">上一章</a>
      <a class="next" href="/novel/123/3.html">下一章</a>
      <a class="index" href="/novel/123/">目录</a>
    `);
    const rule: SiteRule = {
      ...baseRule,
      prevSelector: '.prev',
      nextSelector: '.next',
      indexSelector: '.index',
    };
    const nav = extractNavigation(doc, rule, currentUrl);
    expect(nav.prevUrl).toBe('https://www.example.com/novel/123/1.html');
    expect(nav.nextUrl).toBe('https://www.example.com/novel/123/3.html');
    expect(nav.indexUrl).toBe('https://www.example.com/novel/123/');
  });

  it('相对 URL 转绝对 URL', () => {
    const doc = makeDoc('<a class="next" href="3.html">下一章</a>');
    const rule: SiteRule = { ...baseRule, nextSelector: '.next' };
    const nav = extractNavigation(doc, rule, currentUrl);
    expect(nav.nextUrl).toBe('https://www.example.com/novel/123/3.html');
  });

  it('自动猜测导航链接（文本模式）', () => {
    const doc = makeDoc(`
      <a href="/prev">← 上一章</a>
      <a href="/next">下一章 →</a>
      <a href="/index">返回目录</a>
    `);
    const nav = extractNavigation(doc, baseRule, currentUrl);
    expect(nav.prevUrl).toBe('https://www.example.com/prev');
    expect(nav.nextUrl).toBe('https://www.example.com/next');
    expect(nav.indexUrl).toBe('https://www.example.com/index');
  });

  it('跳过 javascript: 无效链接', () => {
    const doc = makeDoc('<a class="next" href="javascript:void(0)">下一章</a>');
    const rule: SiteRule = { ...baseRule, nextSelector: '.next' };
    const nav = extractNavigation(doc, rule, currentUrl);
    expect(nav.nextUrl).toBeUndefined();
  });

  it('跳过与当前 URL 相同的链接', () => {
    const doc = makeDoc('<a class="next" href="2.html">下一章</a>');
    const rule: SiteRule = { ...baseRule, nextSelector: '.next' };
    const nav = extractNavigation(doc, rule, currentUrl);
    expect(nav.nextUrl).toBeUndefined();
  });
});

describe('VIP 检测', () => {
  it('正文极短时判定为 VIP', () => {
    const doc = makeDoc('<div id="content">请登录后阅读</div>');
    const rule: SiteRule = { ...baseRule, contentSelector: '#content' };
    const chapter = parseChapter(doc, 'https://example.com/1', rule);
    expect(chapter.isVip).toBe(true);
  });

  it('rule.isVip 为 true 时直接返回 true', () => {
    const doc = makeDoc('<div id="content"><p>很长很长很长很长很长很长很长很长很长很长很长很长的正文内容</p></div>');
    const rule: SiteRule = { ...baseRule, contentSelector: '#content', isVip: true };
    const chapter = parseChapter(doc, 'https://example.com/1', rule);
    expect(chapter.isVip).toBe(true);
  });

  it('正文充足时判定为非 VIP', () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => `<p>第${i + 1}段内容，这是一段比较长的测试正文，用来验证内容充足时不会被误判为VIP章节。</p>`).join('');
    const doc = makeDoc(`<div id="content">${paragraphs}</div>`);
    const rule: SiteRule = { ...baseRule, contentSelector: '#content' };
    const chapter = parseChapter(doc, 'https://example.com/1', rule);
    expect(chapter.isVip).toBeFalsy();
  });
});

describe('contentReplaceRules 站点级替换规则', () => {
  it('站点级替换应先于远程文本规则执行', () => {
    const doc = makeDoc('<div id="content"><p>ABC</p></div>');
    const rule: SiteRule = {
      ...baseRule,
      contentSelector: '#content',
      contentReplaceRules: [
        { pattern: 'ABC', replacement: 'SITE_REPLACED' },
      ],
    };
    const remoteRules = [
      { pattern: 'SITE_REPLACED', replacement: 'REMOTE_REPLACED' },
    ];
    const result = parseChapter(doc, 'https://example.com/1', rule, remoteRules);
    expect(result.contentHtml).toContain('REMOTE_REPLACED');
    expect(result.contentHtml).not.toContain('ABC');
  });

  it('无 contentReplaceRules 时远程规则正常工作', () => {
    const doc = makeDoc('<div id="content"><p>ABC</p></div>');
    const rule: SiteRule = { ...baseRule, contentSelector: '#content' };
    const remoteRules = [
      { pattern: 'ABC', replacement: 'REMOTE' },
    ];
    const result = parseChapter(doc, 'https://example.com/1', rule, remoteRules);
    expect(result.contentHtml).toContain('REMOTE');
  });
});

describe('标题简繁转换', () => {
  it('convertToTraditional 为 true 时应转换标题', () => {
    const doc = makeDoc('<h1>第一章 中国文学</h1><div id="content"><p>测试正文内容，需要足够长来通过VIP检测，这里填充更多文字确保超过最小文本长度阈值。</p></div>');
    const rule: SiteRule = {
      ...baseRule,
      chapterTitleSelector: 'h1',
      contentSelector: '#content',
    };
    const result = parseChapter(doc, 'https://example.com/1', rule, [], { convertToTraditional: true, s2tMapping: TEST_S2T });
    expect(result.chapterTitle).toContain('國');
    expect(result.chapterTitle).toContain('學');
  });

  it('convertToTraditional 为 false 时标题不变', () => {
    const doc = makeDoc('<h1>第一章 中国文学</h1><div id="content"><p>测试正文内容，需要足够长来通过VIP检测，这里填充更多文字确保超过最小文本长度阈值。</p></div>');
    const rule: SiteRule = {
      ...baseRule,
      chapterTitleSelector: 'h1',
      contentSelector: '#content',
    };
    const result = parseChapter(doc, 'https://example.com/1', rule, [], { convertToTraditional: false, s2tMapping: TEST_S2T });
    expect(result.chapterTitle).toBe('第一章 中国文学');
  });

  it('convertToTraditional 开启时应同时转换标题和正文', () => {
    const doc = makeDoc('<h1>第一章 中国文学</h1><div id="content"><p>中国文学测试正文，需要足够长来通过VIP检测，这里填充更多文字确保超过最小文本长度阈值。</p></div>');
    const rule: SiteRule = {
      ...baseRule,
      chapterTitleSelector: 'h1',
      contentSelector: '#content',
    };
    const result = parseChapter(doc, 'https://example.com/1', rule, [], { convertToTraditional: true, s2tMapping: TEST_S2T });
    expect(result.chapterTitle).toContain('國');
    expect(result.chapterTitle).toContain('學');
    expect(result.contentHtml).toContain('國');
    expect(result.contentHtml).toContain('學');
    expect(result.contentText).toContain('國');
    expect(result.contentText).toContain('學');
  });
});

describe('parseChapter 集成', () => {
  it('完整解析章节', () => {
    const doc = makeDoc(`
      <span class="book">斗破苍穹</span>
      <h1 class="title">第三章 测试</h1>
      <div id="content">
        <p>正文第一段内容，这里填充足够多的文字来确保超过VIP检测的最小文本长度阈值。</p>
        <p>正文第二段内容，继续添加更多的测试文本以确保完整解析章节时不会被误判为VIP章节。</p>
      </div>
      <a class="prev" href="/prev.html">上一章</a>
      <a class="next" href="/next.html">下一章</a>
    `);
    const rule: SiteRule = {
      ...baseRule,
      bookTitleSelector: '.book',
      chapterTitleSelector: '.title',
      contentSelector: '#content',
      prevSelector: '.prev',
      nextSelector: '.next',
    };
    const result = parseChapter(doc, 'https://example.com/novel/1.html', rule);
    expect(result.bookTitle).toBe('斗破苍穹');
    expect(result.chapterTitle).toBe('第三章 测试');
    expect(result.contentHtml).toContain('<p>正文第一段内容');
    expect(result.contentText).toContain('正文第一段内容');
    expect(result.prevUrl).toBe('https://example.com/prev.html');
    expect(result.nextUrl).toBe('https://example.com/next.html');
    expect(result.isVip).toBeFalsy();
    expect(result.documentTitle).toBe(doc.title);
  });
});
