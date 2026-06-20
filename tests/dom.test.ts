import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { getTextContent, querySelector, querySelectorAll, removeElements, getAbsoluteUrl } from '../src/shared/dom';

describe('DOM 工具函数', () => {
  const dom = new JSDOM(`
    <html>
      <body>
        <h1 class="title">测试章节标题</h1>
        <div id="content">
          <p>第一段内容</p>
          <p>第二段内容</p>
          <script>alert('xss')</script>
          <iframe src="ad.html"></iframe>
        </div>
        <a class="prev" href="/prev/1.html">上一章</a>
        <a class="next" href="next/2.html">下一章</a>
        <a class="index" href="/index/">目录</a>
      </body>
    </html>
  `);

  const doc = dom.window.document;

  it('getTextContent 应返回元素文本内容', () => {
    const h1 = doc.querySelector('h1.title');
    expect(getTextContent(h1)).toBe('测试章节标题');
  });

  it('getTextContent 对 null 返回空字符串', () => {
    expect(getTextContent(null)).toBe('');
  });

  it('querySelector 应返回匹配元素', () => {
    const el = querySelector(doc, 'h1.title');
    expect(el?.tagName).toBe('H1');
  });

  it('querySelectorAll 应返回所有匹配元素', () => {
    const els = querySelectorAll(doc, '#content p');
    expect(els).toHaveLength(2);
    expect(els[0].textContent).toContain('第一段内容');
    expect(els[1].textContent).toContain('第二段内容');
  });

  it('removeElements 应移除匹配元素', () => {
    const content = doc.querySelector('#content')!;
    expect(content.querySelector('script')).not.toBeNull();
    expect(content.querySelector('iframe')).not.toBeNull();
    removeElements('script, iframe', content);
    expect(content.querySelector('script')).toBeNull();
    expect(content.querySelector('iframe')).toBeNull();
  });

  it('getAbsoluteUrl 应转换相对路径为绝对 URL', () => {
    const base = 'https://www.example.com/book/1/';
    expect(getAbsoluteUrl('/prev/1.html', base)).toBe('https://www.example.com/prev/1.html');
    expect(getAbsoluteUrl('next/2.html', base)).toBe('https://www.example.com/book/1/next/2.html');
  });

  it('getAbsoluteUrl 对无效 URL 返回空字符串', () => {
    expect(getAbsoluteUrl('', 'https://example.com')).toBe('');
    expect(getAbsoluteUrl(null, 'https://example.com')).toBe('');
  });
});
