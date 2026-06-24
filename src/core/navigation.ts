interface NavLinks {
  prevUrl?: string;
  indexUrl?: string;
  nextUrl?: string;
}

interface NavElements {
  container: HTMLElement;
  prev: HTMLAnchorElement;
  index: HTMLAnchorElement;
  next: HTMLAnchorElement;
}

let navRef: NavElements | null = null;

function createNavLink(href: string, text: string, onClick?: () => void): HTMLAnchorElement {
  const el = document.createElement('a');
  el.textContent = text;
  el.href = href || '#';
  el.style.visibility = href ? '' : 'hidden';
  if (onClick) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
  }
  return el;
}

export function createBottomNav(
  container: HTMLElement,
  links: NavLinks,
  onNavigate: (url: string) => void,
): HTMLElement {
  const navEl = document.createElement('div');
  navEl.className = 'nr-bottom-nav';

  const prev = createNavLink(links.prevUrl || '', '上一章', () => {
    if (links.prevUrl) onNavigate(links.prevUrl);
  });

  const index = createNavLink(links.indexUrl || '', '目录', () => {
    if (links.indexUrl) window.open(links.indexUrl, '_top');
  });

  const next = createNavLink(links.nextUrl || '', '下一章', () => {
    if (links.nextUrl) onNavigate(links.nextUrl);
  });

  navEl.appendChild(prev);
  navEl.appendChild(index);
  navEl.appendChild(next);
  container.appendChild(navEl);

  navRef = { container: navEl, prev, index, next };
  return navEl;
}

export function updateBottomNav(links: NavLinks, onNavigate: (url: string) => void): void {
  if (!navRef) return;

  navRef.prev.href = links.prevUrl || '#';
  navRef.prev.style.visibility = links.prevUrl ? '' : 'hidden';
  navRef.index.href = links.indexUrl || '#';
  navRef.index.style.visibility = links.indexUrl ? '' : 'hidden';
  navRef.next.href = links.nextUrl || '#';
  navRef.next.style.visibility = links.nextUrl ? '' : 'hidden';
}

export function removeBottomNav(): void {
  if (navRef) {
    navRef.container.remove();
    navRef = null;
  }
}