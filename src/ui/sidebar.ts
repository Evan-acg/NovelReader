import type { ParsedChapter } from '../core/reader-state';

interface SidebarRef {
  el: HTMLElement;
  listEl: HTMLElement;
  toggleEl: HTMLElement;
}

let sidebarRef: SidebarRef | null = null;

export function createSidebar(
  container: HTMLElement,
  chapters: ParsedChapter[],
  activeIndex: number,
  onChapterClick: (index: number) => void,
): SidebarRef {
  const sidebar = document.createElement('div');
  sidebar.className = 'nr-sidebar';

  const header = document.createElement('div');
  header.className = 'nr-sidebar-header';
  header.textContent = chapters[0]?.bookTitle || '章节目录';

  const list = document.createElement('div');
  list.className = 'nr-sidebar-list';

  for (let i = 0; i < chapters.length; i++) {
    const item = createSidebarItem(chapters[i], i, i === activeIndex, onChapterClick);
    list.appendChild(item);
  }

  sidebar.appendChild(header);
  sidebar.appendChild(list);
  container.appendChild(sidebar);

  const toggle = document.createElement('button');
  toggle.className = 'nr-sidebar-toggle';
  toggle.textContent = '◀';
  toggle.addEventListener('click', () => {
    if (container.classList.contains('nr-sidebar-hidden')) {
      showSidebar();
    } else {
      hideSidebar();
    }
  });
  sidebar.appendChild(toggle);

  sidebarRef = { el: sidebar, listEl: list, toggleEl: toggle };
  return sidebarRef;
}

function createSidebarItem(
  chapter: ParsedChapter,
  index: number,
  isActive: boolean,
  onChapterClick: (index: number) => void,
): HTMLElement {
  const item = document.createElement('a');
  item.className = 'nr-sidebar-item' + (isActive ? ' active' : '');
  item.textContent = chapter.chapterTitle || `第 ${index + 1} 章`;
  item.addEventListener('click', (e) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      if (chapter.url) {
        e.preventDefault();
        window.open(chapter.url, '_blank');
        return;
      }
    }
    e.preventDefault();
    onChapterClick(index);
  });
  return item;
}

export function addSidebarItem(
  chapter: ParsedChapter,
  onChapterClick: (index: number) => void,
): void {
  if (!sidebarRef) return;

  const items = sidebarRef.listEl.querySelectorAll('.nr-sidebar-item');
  const index = items.length;
  const item = createSidebarItem(chapter, index, false, onChapterClick);
  sidebarRef.listEl.appendChild(item);
}

export function setActiveSidebarItem(index: number): void {
  if (!sidebarRef) return;

  const items = sidebarRef.listEl.querySelectorAll('.nr-sidebar-item');
  items.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

export function showSidebar(): void {
  const container = document.querySelector('.nr-reader-container');
  if (container) {
    container.classList.remove('nr-sidebar-hidden');
  }
}

export function hideSidebar(): void {
  const container = document.querySelector('.nr-reader-container');
  if (container) {
    container.classList.add('nr-sidebar-hidden');
  }
}

export function toggleSidebarVisibility(): void {
  const container = document.querySelector('.nr-reader-container');
  if (!container) return;
  if (container.classList.contains('nr-sidebar-hidden')) {
    showSidebar();
  } else {
    hideSidebar();
  }
}

export function removeSidebar(): void {
  if (sidebarRef) {
    sidebarRef.el.remove();
    sidebarRef.toggleEl.remove();
    sidebarRef = null;
  }
}
