import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import landingData from '../data/landingBooks.json';
import { initBookJourney } from './landing/bookJourney';
import { LANDING_MARKUP } from './landing/markup';
import { toEngineBook } from './landing/engineBooks';
import { fetchBooks } from '../lib/bookService';
import { handleSiteLinkClick } from './landing/siteLinks';
import readingRobot from '../assets/reading-robot.webp';
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
 *
 * Until the books and their covers are ready, the reading robot sits on the
 * shelf where the middle book goes. The engine is started straight away with
 * the bundled books, hidden (`is-loading`), only so the hero and shelf are laid
 * out around it; it's restarted with the API's books once they arrive.
 */
const BOOKS_TIMEOUT_MS = 5000;
/** Longest the loader waits for cover images after the book list arrives — a
 * slow image then just finishes loading in place. */
const COVERS_TIMEOUT_MS = 6000;

/** Resolves once every image has loaded or failed, or after timeoutMs. */
function preloadImages(urls: string[], timeoutMs: number): Promise<void> {
  const all = Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  ).then(() => undefined);
  return Promise.race([all, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

function bundledBooks() {
  return landingData.books.map((b) => ({ ...b, cover: COVERS[b.id] }));
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  // Where the middle book sits on screen — the robot takes its place.
  const [loaderBox, setLoaderBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Arriving from another page in the SPA keeps its scroll position; the
    // journey has to start at the top.
    window.scrollTo(0, 0);
    let cancelled = false;
    // Lay the stage out with the bundled books (hidden) so the robot has a shelf.
    let dispose: (() => void) | undefined = initBookJourney(root, bundledBooks(), landingData.stores);

    let measureRaf = 0;
    function measure() {
      cancelAnimationFrame(measureRaf);
      measureRaf = requestAnimationFrame(() => {
        const tile = root!.querySelector('.tile.is-center');
        if (!tile) return;
        const r = tile.getBoundingClientRect();
        setLoaderBox({ left: r.left, top: r.top, width: r.width, height: r.height });
      });
    }
    measure();
    // The engine re-lays out 80 ms after a resize; measure after it.
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 120);
    };
    window.addEventListener('resize', onResize);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BOOKS_TIMEOUT_MS);
    fetchBooks(controller.signal)
      .then((books) => (books.length ? books.map(toEngineBook) : null))
      .catch(() => null)
      .then(async (apiBooks) => {
        clearTimeout(timeout);
        const books = apiBooks ?? bundledBooks();
        await preloadImages(books.map((b) => b.cover).filter(Boolean), COVERS_TIMEOUT_MS);
        if (cancelled) return;
        if (apiBooks) {
          dispose?.();
          dispose = initBookJourney(root, apiBooks, landingData.stores);
        }
        window.removeEventListener('resize', onResize);
        setLoading(false);
      });

    const onClick = (e: MouseEvent) => handleSiteLinkClick(e, root, navigate);
    root.addEventListener('click', onClick);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(measureRaf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      controller.abort();
      root.removeEventListener('click', onClick);
      dispose?.();
    };
  }, [navigate]);

  // No scrolling the story underneath while the loader is up.
  useEffect(() => {
    if (!loading) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
    };
  }, [loading]);

  return (
    <>
      <div
        ref={rootRef}
        className={loading ? 'landing-page is-loading' : 'landing-page'}
        dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }}
      />
      <AnimatePresence>
        {loading && loaderBox && (
          <motion.img
            key="loader"
            src={readingRobot}
            alt="Kitablar yüklənir"
            role="status"
            className="landing-loader"
            style={loaderBox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
