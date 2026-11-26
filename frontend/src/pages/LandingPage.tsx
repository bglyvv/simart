import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import landingData from '../data/landingBooks.json';
import { initBookJourney } from './landing/bookJourney';
import { LANDING_MARKUP } from './landing/markup';
import { toEngineBook } from './landing/engineBooks';
import { fetchBooks } from '../lib/bookService';
import coverKicikAstronavt from '../assets/books/kicik-astronavt.jpg';
import coverTebiyatinSirleri from '../assets/books/tebiyatin-sirleri.jpg';
import coverDostlugunGucu from '../assets/books/dostlugun-gucu.jpg';
import coverDenizMacerasi from '../assets/books/deniz-macerasi.jpg';
import coverAgilliKesflar from '../assets/books/agilli-kesflar.jpg';

const COVERS: Record<string, string> = {
  'kicik-astronavt': coverKicikAstronavt,
  'tebiyatin-sirleri': coverTebiyatinSirleri,
  'dostlugun-gucu': coverDostlugunGucu,
  'deniz-macerasi': coverDenizMacerasi,
  'agilli-kesflar': coverAgilliKesflar,
};

/**
 * Public landing page, shown at "/" to any visitor this device doesn't already
 * recognize (see RootRedirect in routes/Guards.tsx). The markup, styles and
 * animation engine come from the supplied reference (simart-book-journey.html)
 * — see landing/bookJourney.ts for what was changed to fit it into the app.
 * The markup is a static, trusted constant; book text is escaped by the
 * engine before it's inserted.
 *
 * Books come from GET /api/books (managed at /admin/books). If that fails,
 * returns nothing, or is slower than BOOKS_TIMEOUT_MS (the free Render
 * instance can take 20-30 s to wake up), the bundled landingBooks.json books
 * are shown instead so the arch is never empty.
 */
const BOOKS_TIMEOUT_MS = 5000;

function bundledBooks() {
  return landingData.books.map((b) => ({ ...b, cover: COVERS[b.id] }));
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let dispose: (() => void) | undefined;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BOOKS_TIMEOUT_MS);
    fetchBooks(controller.signal)
      .then((books) => (books.length ? books.map(toEngineBook) : bundledBooks()))
      .catch(() => bundledBooks())
      .then((books) => {
        clearTimeout(timeout);
        if (!cancelled) dispose = initBookJourney(root, books, landingData.stores);
      });

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const routeLink = target.closest<HTMLAnchorElement>('a[data-route]');
      if (routeLink) {
        e.preventDefault();
        navigate(routeLink.getAttribute('href')!);
        return;
      }
      const scrollLink = target.closest<HTMLElement>('[data-scroll]');
      if (scrollLink) {
        e.preventDefault();
        const about = scrollLink.dataset.scroll === 'about' ? root!.querySelector('#about') : null;
        if (about) about.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // Store links are placeholders ("#") in the sample data — don't open a
      // new tab of this same page.
      const store = target.closest('a.store');
      if (store && store.getAttribute('href') === '#') e.preventDefault();
    }
    root.addEventListener('click', onClick);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
      root.removeEventListener('click', onClick);
      dispose?.();
    };
  }, [navigate]);

  return <div ref={rootRef} className="landing-page" dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }} />;
}
