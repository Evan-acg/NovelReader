interface NavLinks {
  prevUrl?: string;
  indexUrl?: string;
  nextUrl?: string;
}

let navEl: HTMLElement | null = null;

export function createBottomNav(
  container: HTMLElement,
  links: NavLinks,
  onNavigate: (url: string) => void,
): HTMLElement {
  navEl = document.createElement('div');
  navEl.className = 'nr-bottom-nav';

  const prev = document.createElement('a');
  prev.textContent = '上一章';
  prev.href = links.prevUrl || '#';
  prev.style.visibility = links.prevUrl ? '' : 'hidden';
  prev.addEventListener('click', (e) => {
    e.preventDefault();
    if (links.prevUrl) onNavigate(links.prevUrl);
  });

  const index = document.createElement('a');
  index.textContent = '目录';
  index.href = links.indexUrl || '#';
  index.style.visibility = links.indexUrl ? '' : 'hidden';
  index.addEventListener('click', (e) => {
    e.preventDefault();
    if (links.indexUrl) window.open(links.indexUrl, '_top');
  });

  const next = document.createElement('a');
  next.textContent = '下一章';
  next.href = links.nextUrl || '#';
  next.style.visibility = links.nextUrl ? '' : 'hidden';
  next.addEventListener('click', (e) => {
    e.preventDefault();
    if (links.nextUrl) onNavigate(links.nextUrl);
  });

  navEl.appendChild(prev);
  navEl.appendChild(index);
  navEl.appendChild(next);
  container.appendChild(navEl);

  return navEl;
}

export function updateBottomNav(links: NavLinks, onNavigate: (url: string) => void): void {
  if (!navEl) return;

  navEl.innerHTML = '';

  const prev = document.createElement('a');
  prev.textContent = '上一章';
  prev.href = links.prevUrl || '#';
  prev.style.visibility = links.prevUrl ? '' : 'hidden';
  prev.addEventListener('click', (e) => {
    e.preventDefault();
    if (links.prevUrl) onNavigate(links.prevUrl);
  });

  const index = document.createElement('a');
  index.textContent = '目录';
  index.href = links.indexUrl || '#';
  index.style.visibility = links.indexUrl ? '' : 'hidden';
  index.addEventListener('click', (e) => {
    e.preventDefault();
    if (links.indexUrl) window.open(links.indexUrl, '_top');
  });

  const next = document.createElement('a');
  next.textContent = '下一章';
  next.href = links.nextUrl || '#';
  next.style.visibility = links.nextUrl ? '' : 'hidden';
  next.addEventListener('click', (e) => {
    e.preventDefault();
    if (links.nextUrl) onNavigate(links.nextUrl);
  });

  navEl.appendChild(prev);
  navEl.appendChild(index);
  navEl.appendChild(next);
}

export function removeBottomNav(): void {
  if (navEl) {
    navEl.remove();
    navEl = null;
  }
}
