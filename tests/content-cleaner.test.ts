import { describe, it, expect } from 'vitest';
import { cleanContent, convertS2T } from '../src/core/content-cleaner';
import type { TextRule } from '../src/text-rules/text-rule-types';

const TEST_S2T: Record<string, string> = {
  '个': '個', '们': '們', '门': '門', '为': '為', '国': '國', '学': '學',
  '这': '這', '体': '體', '转': '轉', '运': '運', '试': '試', '测': '測',
  '简': '簡',
};

describe('节点移除', () => {
  it('应移除 script 元素', () => {
    const html = '<div><p>正文</p><script>alert("xss")</script></div>';
    const result = cleanContent(html, []);
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('alert');
    expect(result.html).toContain('正文');
  });

  it('应移除 iframe 元素', () => {
    const html = '<div><p>正文</p><iframe src="ad.html"></iframe></div>';
    const result = cleanContent(html, []);
    expect(result.html).not.toContain('<iframe');
    expect(result.html).toContain('正文');
  });

  it('应移除 style 和 noscript 元素', () => {
    const html = '<div><p>正文</p><style>.ad{display:none}</style><noscript>请开启JS</noscript></div>';
    const result = cleanContent(html, []);
    expect(result.html).not.toContain('<style');
    expect(result.html).not.toContain('<noscript');
    expect(result.html).toContain('正文');
  });
});

describe('文本替换规则引擎', () => {
  it('应应用单条正则替换规则', () => {
    const html = '<p>请记住本站域名 example.com</p>';
    const rules: TextRule[] = [
      { pattern: '请记住本站域名\\s*\\S*', replacement: '', flags: 'g' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).not.toContain('请记住本站域名');
  });

  it('应按顺序应用多条规则', () => {
    const html = '<p>第一步替换，第二步替换</p>';
    const rules: TextRule[] = [
      { pattern: '第一步替换', replacement: '已完成A' },
      { pattern: '第二步替换', replacement: '已完成B' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).toContain('已完成A');
    expect(result.html).toContain('已完成B');
  });

  it('规则顺序影响最终结果', () => {
    const html = '<p>A</p>';
    const rules: TextRule[] = [
      { pattern: 'A', replacement: 'B', flags: 'g' },
      { pattern: 'B', replacement: 'C', flags: 'g' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).toContain('C');
    expect(result.html).not.toContain('A');
  });

  it('无效正则应跳过并继续执行后续规则', () => {
    const html = '<p>测试文本</p>';
    const rules: TextRule[] = [
      { pattern: '[invalid(regex', replacement: 'X', flags: 'g' },
      { pattern: '测试', replacement: '验证通过' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).toContain('验证通过');
  });

  it('应保护 img 标签不被文本规则匹配', () => {
    const html = '<p><img src="ad.jpg" alt="广告"></p><p>正文中的广告内容</p>';
    const rules: TextRule[] = [
      { pattern: '广告', replacement: '[已清理]', flags: 'g' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).toContain('<img');
    expect(result.html).toContain('alt="广告"');
    expect(result.html).toContain('[已清理]');
  });

  it('应保护 a 标签不被文本规则匹配', () => {
    const html = '<p><a href="/next">下一章广告</a></p><p>正文广告</p>';
    const rules: TextRule[] = [
      { pattern: '广告', replacement: '', flags: 'g' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).toContain('<a');
    expect(result.html).toContain('下一章广告');
    expect(result.html).not.toContain('正文广告');
  });
});

describe('br 转段落', () => {
  it('单段内容应用 br 转 p 应保持为单段落', () => {
    const html = '这是一段正文内容';
    const result = cleanContent(html, []);
    expect(result.html).toBe('<p>这是一段正文内容</p>');
  });

  it('连续两个 br 应拆分为两个段落', () => {
    const html = '第一段<br><br>第二段';
    const result = cleanContent(html, []);
    expect(result.html).toContain('</p><p>');
    expect(result.html).toContain('第一段');
    expect(result.html).toContain('第二段');
  });

  it('多个连续 br 应产生段落分隔', () => {
    const html = '第一段<br><br><br>第二段';
    const result = cleanContent(html, []);
    const parts = result.html.split('</p><p>');
    expect(parts.length).toBe(2);
  });
});

describe('空段清理', () => {
  it('应移除内容为空的 p 标签', () => {
    const html = '<p></p><p>正文</p><p></p>';
    const result = cleanContent(html, []);
    expect(result.html).not.toContain('<p></p>');
    expect(result.html).toContain('正文');
  });

  it('应移除仅含空格的 p 标签', () => {
    const html = '<p>   </p><p>正文</p>';
    const result = cleanContent(html, []);
    expect(result.html).not.toContain('<p>   </p>');
    expect(result.html).toContain('正文');
  });

  it('应移除仅含 br 的 p 标签', () => {
    const html = '<p><br></p><p>正文</p>';
    const result = cleanContent(html, []);
    expect(result.html).not.toContain('<p><br></p>');
    expect(result.html).toContain('正文');
  });

  it('应保留有实际内容的短段落', () => {
    const html = '<p>好</p><p>正文内容</p>';
    const result = cleanContent(html, []);
    expect(result.html).toContain('<p>好</p>');
  });
});

describe('强制分段', () => {
  it('不开启时不应分段', () => {
    const html = '第一句。第二句！第三句？第四句；';
    const result = cleanContent(html, [], { splitContent: false });
    expect(result.html).toBe('<p>第一句。第二句！第三句？第四句；</p>');
  });

  it('开启时未分段正文应按句读拆段', () => {
    const html = '第一句。第二句！第三句？第四句；';
    const result = cleanContent(html, [], { splitContent: true });
    const parts = result.html.split('</p><p>');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('已有 p 标签时不重复分段', () => {
    const html = '<p>第一句。</p><p>第二句！</p>';
    const result = cleanContent(html, [], { splitContent: true });
    const parts = result.html.split('</p><p>');
    expect(parts.length).toBe(2);
    expect(result.html).toContain('<p>第一句。</p>');
  });

  it('已有 br 标签时不重复分段', () => {
    const html = '第一句。<br>第二句！';
    const result = cleanContent(html, [], { splitContent: true });
    expect(result.html).toContain('<br>');
    const parts = result.html.split('</p><p>');
    expect(parts.length).toBeLessThan(3);
  });
});

describe('简繁转换', () => {
  it('关闭时不转换', () => {
    const html = '<p>中国文学</p>';
    const result = cleanContent(html, [], { convertToTraditional: false, s2tMapping: TEST_S2T });
    expect(result.html).toContain('中国文学');
  });

  it('开启时应转换为繁体', () => {
    const html = '<p>中国文学</p>';
    const result = cleanContent(html, [], { convertToTraditional: true, s2tMapping: TEST_S2T });
    expect(result.html).toContain('中國文學');
  });

  it('应转换正文中的常见简体字', () => {
    const html = '<p>这是一个测试，看看简体转繁体是否正常运作。</p>';
    const result = cleanContent(html, [], { convertToTraditional: true, s2tMapping: TEST_S2T });
    expect(result.html).toContain('這');
    expect(result.html).toContain('個');
    expect(result.html).toContain('測試');
    expect(result.html).toContain('體');
    expect(result.html).toContain('轉');
    expect(result.html).toContain('運');
  });

  it('原文为繁体时保持不变', () => {
    const html = '<p>這是繁體中文</p>';
    const result = cleanContent(html, [], { convertToTraditional: true, s2tMapping: TEST_S2T });
    expect(result.html).toContain('這是繁體中文');
  });
});

describe('cleanContent 集成', () => {
  it('空输入应返回空结果', () => {
    const result = cleanContent('', []);
    expect(result.html).toBe('');
    expect(result.text).toBe('');
  });

  it('多步骤管线按正确顺序执行', () => {
    const html = [
      '<script>evil()</script>',
      '<p>请记住本站域名 example.com，广告内容。</p>',
      '<br><br>',
      '<p>这是正文。</p>',
      '<p></p>',
    ].join('');

    const rules: TextRule[] = [
      { pattern: '请记住本站域名\\s*\\S*，', replacement: '', flags: 'g' },
      { pattern: '广告内容。', replacement: '', flags: 'g' },
    ];

    const result = cleanContent(html, rules);
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('请记住本站域名');
    expect(result.html).not.toContain('广告内容');
    expect(result.html).not.toContain('<p></p>');
    expect(result.html).toContain('这是正文。');
    expect(result.text).toBe('这是正文。');
  });

  it('应输出清洗后的纯文本', () => {
    const html = '<p>正文第一段。</p><p>正文第二段。</p>';
    const result = cleanContent(html, []);
    expect(result.text).toBe('正文第一段。正文第二段。');
  });

  it('站点替换规则先于自定义替换规则', () => {
    const html = '<p>ABC</p>';
    const rules: TextRule[] = [
      { pattern: 'ABC', replacement: 'REMOTE', flags: 'g' },
      { pattern: 'REMOTE', replacement: 'CUSTOM', flags: 'g' },
    ];
    const result = cleanContent(html, rules);
    expect(result.html).toContain('CUSTOM');
  });

  it('分组关闭时对应规则不生效', () => {
    const html = '<p>含有敏感词A和敏感词B的正文</p>';
    const enabledRules: TextRule[] = [
      { pattern: '敏感词A', replacement: '[过滤]', flags: 'g' },
    ];
    const result = cleanContent(html, enabledRules);
    expect(result.html).toContain('[过滤]');
    expect(result.html).toContain('敏感词B');
    expect(result.html).not.toContain('敏感词A');
  });
});

describe('convertS2T', () => {
  it('应转换中文文本', () => {
    const result = convertS2T('中国文学', TEST_S2T);
    expect(result).toContain('國');
    expect(result).toContain('學');
  });

  it('无映射字符保持不变', () => {
    expect(convertS2T('abc123', TEST_S2T)).toBe('abc123');
  });
});
