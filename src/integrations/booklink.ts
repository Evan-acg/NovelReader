import { logger } from '../shared/logger';
import { gmOpenInTab } from '../shared/gm';
import { loadAllSettings } from '../settings/storage';

export function isBooklinkHost(hostname = location.hostname): boolean {
  return hostname === 'booklink.me' || hostname.endsWith('.booklink.me');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function findUnreadParent(): Element | null {
  const tds = document.querySelectorAll('td[colspan="2"]');
  for (const td of tds) {
    const text = td.textContent || '';
    if (text.includes('未读') || text.includes('未讀')) {
      return td;
    }
  }
  return null;
}

export function findUnreadLinks(context: Element): HTMLAnchorElement[] {
  const result: HTMLAnchorElement[] = [];
  const xpath = './ancestor::table[@width="100%"]/descendant::a[img[@alt="未读"]]';
  const snapshot = document.evaluate(
    xpath,
    context,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  );
  for (let i = 0; i < snapshot.snapshotLength; i++) {
    const node = snapshot.snapshotItem(i);
    if (node instanceof HTMLAnchorElement) {
      result.push(node);
    }
  }
  return result;
}

export function hasNoPirateMarker(link: HTMLAnchorElement): boolean {
  const chapterLink = link.parentNode?.nextSibling?.nextSibling?.querySelector('a');
  return !!chapterLink?.querySelector('font[color*="800000"]');
}

export function markClicked(link: HTMLAnchorElement): void {
  const fontEl = link.parentNode?.previousSibling?.querySelector('font');
  if (fontEl) {
    fontEl.setAttribute('color', '666666');
  }
  const chapterLink = link.parentNode?.nextSibling?.nextSibling?.querySelector('a');
  if (chapterLink) {
    chapterLink.classList.add('mclicked');
  }
}

function createButton(parent: Element): void {
  const btn = document.createElement('a');
  btn.href = 'javascript:;';
  btn.title = '一键打开所有未读链接';
  btn.style.cssText = 'width:auto;';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const links = findUnreadLinks(btn);
    for (const link of links) {
      if (hasNoPirateMarker(link)) continue;
      await delay(200);
      gmOpenInTab(link.href);
      markClicked(link);
    }
  });

  const img = document.createElement('img');
  img.src = 'me.png';
  img.style.cssText = 'max-width:20px;';
  btn.appendChild(img);

  parent.appendChild(btn);
}

export function init(): void {
  if (!isBooklinkHost()) return;

  const settings = loadAllSettings();
  if (!settings.booklinkEnable) return;

  const parent = findUnreadParent();
  if (!parent) {
    logger.info('booklink.me: 未找到未读区域');
    return;
  }
  createButton(parent);
  logger.info('booklink.me 辅助模式已启动');
}
