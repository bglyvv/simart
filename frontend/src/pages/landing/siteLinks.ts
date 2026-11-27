import type { NavigateFunction } from 'react-router-dom';

/**
 * Click handling for the static markup of the public pages (landing, About):
 * - `data-route` links navigate in-app. A link to the page you're already on
 *   scrolls to the top instead.
 * - `data-scroll` links smooth-scroll to the section with that id ("top" or a
 *   missing id scrolls to the top).
 * - Placeholder store links ("#") do nothing.
 */
export function handleSiteLinkClick(e: MouseEvent, root: HTMLElement, navigate: NavigateFunction) {
  const target = e.target as HTMLElement;

  const routeLink = target.closest<HTMLAnchorElement>('a[data-route]');
  if (routeLink) {
    e.preventDefault();
    const href = routeLink.getAttribute('href')!;
    if (href === window.location.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(href);
    return;
  }

  const scrollLink = target.closest<HTMLElement>('[data-scroll]');
  if (scrollLink) {
    e.preventDefault();
    const id = scrollLink.dataset.scroll;
    const section = id && id !== 'top' ? root.querySelector(`#${id}`) : null;
    if (section) section.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const store = target.closest('a.store');
  if (store && store.getAttribute('href') === '#') e.preventDefault();
}
