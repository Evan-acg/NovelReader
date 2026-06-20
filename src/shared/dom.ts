export function getTextContent(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

export function querySelector<T extends Element>(
  parent: ParentNode,
  selector: string,
): T | null {
  return parent.querySelector<T>(selector);
}

export function querySelectorAll<T extends Element>(
  parent: ParentNode,
  selector: string,
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

export function removeElements(selector: string, root: ParentNode = document): void {
  querySelectorAll(root, selector).forEach((el) => el.remove());
}

export function getAbsoluteUrl(href: string | null, baseUrl: string): string {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return '';
  }
}
