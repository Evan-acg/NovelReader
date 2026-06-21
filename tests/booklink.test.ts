import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('../src/shared/gm', () => ({
  gmOpenInTab: vi.fn(),
  gmGetValue: vi.fn(() => ''),
  gmSetValue: vi.fn(),
  gmAddStyle: vi.fn(),
  gmFetch: vi.fn(),
}));

const mockLoadAllSettings = vi.hoisted(() => vi.fn(() => ({ booklinkEnable: true })));

vi.mock('../src/settings/storage', () => ({
  loadAllSettings: mockLoadAllSettings,
}));

import { gmOpenInTab } from '../src/shared/gm';
import {
  isBooklinkHost,
  findUnreadParent,
  findUnreadLinks,
  hasNoPirateMarker,
  markClicked,
  init,
} from '../src/integrations/booklink';

function makeTableRow(index: number, noPirate = false): HTMLTableRowElement {
  const row = document.createElement('tr');

  const tdCount = document.createElement('td');
  const font = document.createElement('font');
  font.textContent = String(index);
  tdCount.appendChild(font);
  row.appendChild(tdCount);

  const tdImg = document.createElement('td');
  const imgLink = document.createElement('a');
  imgLink.href = `https://booklink.me/chapter/${index}`;
  const img = document.createElement('img');
  img.alt = '未读';
  imgLink.appendChild(img);
  tdImg.appendChild(imgLink);
  row.appendChild(tdImg);

  const tdTitle = document.createElement('td');
  tdTitle.textContent = `第${index}章`;
  row.appendChild(tdTitle);

  const tdCh = document.createElement('td');
  const chLink = document.createElement('a');
  chLink.href = `https://example.com/chapter/${index}`;
  chLink.textContent = `第${index}章`;
  if (noPirate) {
    const pf = document.createElement('font');
    pf.setAttribute('color', '#800000');
    chLink.appendChild(pf);
  }
  tdCh.appendChild(chLink);
  row.appendChild(tdCh);

  return row;
}

function buildBooklinkTable(hasUnread = true, noPirate = false): HTMLElement {
  const table = document.createElement('table');
  table.width = '100%';

  const headerRow = document.createElement('tr');
  const headerTd = document.createElement('td');
  headerTd.colSpan = 2;
  headerTd.textContent = hasUnread ? '未读章节' : '已读章节';
  headerRow.appendChild(headerTd);
  table.appendChild(headerRow);

  table.appendChild(makeTableRow(1, noPirate));
  table.appendChild(makeTableRow(2, false));

  return table;
}

describe('findUnreadParent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('存在未读区域时应返回对应 td 元素', () => {
    const table = buildBooklinkTable(true);
    document.body.appendChild(table);

    const result = findUnreadParent();
    expect(result).not.toBeNull();
    expect(result!.tagName).toBe('TD');
    expect(result!.textContent).toContain('未读');
  });

  it('不存在未读区域时应返回 null', () => {
    const table = buildBooklinkTable(false);
    document.body.appendChild(table);

    const result = findUnreadParent();
    expect(result).toBeNull();
  });

  it('空页面时应返回 null', () => {
    const result = findUnreadParent();
    expect(result).toBeNull();
  });

  it('应同时识别 "未讀" 文本', () => {
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = '未讀章節';
    document.body.appendChild(td);

    const result = findUnreadParent();
    expect(result).not.toBeNull();
  });
});

describe('findUnreadLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('存在未读链接时应返回所有未读 a 标签', () => {
    const table = buildBooklinkTable(true);
    document.body.appendChild(table);
    const parent = findUnreadParent()!;

    const links = findUnreadLinks(parent);
    expect(links.length).toBe(2);
    expect(links[0].href).toContain('/chapter/1');
    expect(links[1].href).toContain('/chapter/2');
  });

  it('没有未读图片时应返回空数组', () => {
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = '未读';
    document.body.appendChild(td);

    const links = findUnreadLinks(td);
    expect(links).toEqual([]);
  });
});

describe('hasNoPirateMarker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('有盗版标记时应返回 false', () => {
    const table = buildBooklinkTable(true, false);
    document.body.appendChild(table);
    const parent = findUnreadParent()!;
    const links = findUnreadLinks(parent);
    expect(hasNoPirateMarker(links[0])).toBe(false);
  });

  it('有无盗版标记时应返回 true', () => {
    const table = buildBooklinkTable(true, true);
    document.body.appendChild(table);
    const parent = findUnreadParent()!;
    const links = findUnreadLinks(parent);
    expect(hasNoPirateMarker(links[0])).toBe(true);
  });
});

describe('markClicked', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('点击后应修改 font 颜色并添加 mclicked class', () => {
    const table = buildBooklinkTable(true);
    document.body.appendChild(table);
    const parent = findUnreadParent()!;
    const links = findUnreadLinks(parent);

    markClicked(links[0]);

    const tr = links[0].closest('tr');
    const fontEl = tr?.querySelector('td:first-child font');
    expect(fontEl?.getAttribute('color')).toBe('666666');

    const chapterLink = tr?.querySelector('td:last-child a');
    expect(chapterLink?.classList.contains('mclicked')).toBe(true);
  });
});

describe('isBooklinkHost', () => {
  it('booklink.me 应返回 true', () => {
    expect(isBooklinkHost('booklink.me')).toBe(true);
  });

  it('www.booklink.me 应返回 true', () => {
    expect(isBooklinkHost('www.booklink.me')).toBe(true);
  });

  it('evilbooklink.me 应返回 false', () => {
    expect(isBooklinkHost('evilbooklink.me')).toBe(false);
  });

  it('booklink.me.example 应返回 false', () => {
    expect(isBooklinkHost('booklink.me.example')).toBe(false);
  });

  it('not-booklink.me 应返回 false', () => {
    expect(isBooklinkHost('not-booklink.me')).toBe(false);
  });
});

describe('init', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    mockLoadAllSettings.mockReturnValue({ booklinkEnable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('非 booklink.me 页面不应执行任何操作', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'www.example.com' },
      writable: true,
    });

    init();
    expect(document.querySelector('a[title="一键打开所有未读链接"]')).toBeNull();
  });

  it('booklinkEnable 为 false 时不执行任何操作', () => {
    mockLoadAllSettings.mockReturnValue({ booklinkEnable: false });
    Object.defineProperty(window, 'location', {
      value: { hostname: 'booklink.me' },
      writable: true,
    });

    const table = buildBooklinkTable(true);
    document.body.appendChild(table);

    init();
    expect(document.querySelector('a[title="一键打开所有未读链接"]')).toBeNull();
  });

  it('www.booklink.me 子域名应插入按钮', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'www.booklink.me' },
      writable: true,
    });

    const table = buildBooklinkTable(true);
    document.body.appendChild(table);

    init();
    const btn = document.querySelector('a[title="一键打开所有未读链接"]');
    expect(btn).not.toBeNull();
    expect(btn!.querySelector('img')).not.toBeNull();
  });

  it('booklink.me 页面存在未读区域时应插入按钮', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'booklink.me' },
      writable: true,
    });

    const table = buildBooklinkTable(true);
    document.body.appendChild(table);

    init();
    const btn = document.querySelector('a[title="一键打开所有未读链接"]');
    expect(btn).not.toBeNull();
    expect(btn!.querySelector('img')).not.toBeNull();
  });

  it('evilbooklink.me 不应执行任何操作', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'evilbooklink.me' },
      writable: true,
    });

    const table = buildBooklinkTable(true);
    document.body.appendChild(table);

    init();
    expect(document.querySelector('a[title="一键打开所有未读链接"]')).toBeNull();
  });

  it('booklink.me.example 不应执行任何操作', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'booklink.me.example' },
      writable: true,
    });

    const table = buildBooklinkTable(true);
    document.body.appendChild(table);

    init();
    expect(document.querySelector('a[title="一键打开所有未读链接"]')).toBeNull();
  });

  it('booklink.me 页面无未读区域时不插入按钮', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'booklink.me' },
      writable: true,
    });

    init();
    const btn = document.querySelector('a[title="一键打开所有未读链接"]');
    expect(btn).toBeNull();
  });

  it('点击按钮应逐个打开未读链接并跳过无盗版标记章节', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'booklink.me' },
      writable: true,
    });

    // Row 1: normal unread
    // Row 2: no-pirate (should be skipped)
    const table = document.createElement('table');
    table.width = '100%';

    const headerRow = document.createElement('tr');
    const headerTd = document.createElement('td');
    headerTd.colSpan = 2;
    headerTd.textContent = '未读';
    headerRow.appendChild(headerTd);
    table.appendChild(headerRow);

    function makeRow(index: number, noPirate = false): void {
      const row = document.createElement('tr');

      const tdCount = document.createElement('td');
      const font = document.createElement('font');
      font.textContent = String(index);
      tdCount.appendChild(font);
      row.appendChild(tdCount);

      const tdImg = document.createElement('td');
      const imgLink = document.createElement('a');
      imgLink.href = `https://booklink.me/chapter/${index}`;
      const img = document.createElement('img');
      img.alt = '未读';
      imgLink.appendChild(img);
      tdImg.appendChild(imgLink);
      row.appendChild(tdImg);

      const tdTitle = document.createElement('td');
      tdTitle.textContent = `第${index}章`;
      row.appendChild(tdTitle);

      const tdCh = document.createElement('td');
      const chLink = document.createElement('a');
      chLink.href = `https://example.com/chapter/${index}`;
      chLink.textContent = `第${index}章`;
      if (noPirate) {
        const pf = document.createElement('font');
        pf.setAttribute('color', '#800000');
        chLink.appendChild(pf);
      }
      tdCh.appendChild(chLink);
      row.appendChild(tdCh);

      table.appendChild(row);
    }

    makeRow(1, false);
    makeRow(2, true);
    makeRow(3, false);

    document.body.appendChild(table);

    init();

    const btn = document.querySelector('a[title="一键打开所有未读链接"]')!;
    btn.dispatchEvent(new MouseEvent('click'));

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Chapter 1 and 3 should be opened (Chapter 2 skipped due to no-pirate)
    expect(gmOpenInTab).toHaveBeenCalledWith('https://booklink.me/chapter/1');
    expect(gmOpenInTab).not.toHaveBeenCalledWith('https://booklink.me/chapter/2');
    expect(gmOpenInTab).toHaveBeenCalledWith('https://booklink.me/chapter/3');
  });
});

describe('booklink userscript metadata', () => {
  it('vite.config.ts 应使用全网页 match，使 booklink 入口可被注入后自行判断', () => {
    const configPath = resolve(__dirname, '../vite.config.ts');
    const config = readFileSync(configPath, 'utf-8');
    expect(config).toContain('*://*/*');
  });
});
