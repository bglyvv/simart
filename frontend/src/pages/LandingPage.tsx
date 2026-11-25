import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import landingBooksData from '../data/landingBooks.json';
import coverKicikAstronavt from '../assets/books/kicik-astronavt.jpg';
import coverTebiyatinSirleri from '../assets/books/tebiyatin-sirleri.jpg';
import coverDostlugunGucu from '../assets/books/dostlugun-gucu.jpg';
import coverDenizMacerasi from '../assets/books/deniz-macerasi.jpg';
import coverAgilliKesflar from '../assets/books/agilli-kesflar.jpg';

const COVER_IMAGES: Record<string, string> = {
  'kicik-astronavt': coverKicikAstronavt,
  'tebiyatin-sirleri': coverTebiyatinSirleri,
  'dostlugun-gucu': coverDostlugunGucu,
  'deniz-macerasi': coverDenizMacerasi,
  'agilli-kesflar': coverAgilliKesflar,
};

const books = landingBooksData.books;
const N = books.length;

// Same three small helpers the reference implementation uses to turn raw
// scroll progress into eased 0..1 "how far into this stage" values.
function clamp(x: number) {
  return Math.max(0, Math.min(1, x));
}
function ease(x: number) {
  x = clamp(x);
  return x * x * (3 - 2 * x);
}
function part(p: number, a: number, b: number) {
  return ease((p - a) / (b - a));
}

const SLOT_OFFSETS = [-2, -1, 0, 1, 2];

/**
 * The public landing page — ported near-verbatim from the ChatGPT-authored
 * reference (simart-live-v4.html) the user supplied, rather than
 * reinterpreted: same structure (a single "book" made of 4 double-sided
 * leaves that hinge open in sequence), same scroll-progress math, same CSS
 * (see LandingPage.css's own doc comment), same real cover artwork
 * (extracted from the reference file's embedded images, not redrawn).
 *
 * Reachable with no login — shown at "/" for any visitor this device
 * doesn't already recognize (see RootRedirect in routes/Guards.tsx).
 *
 * One deliberate departure from the source file: the continuous
 * opacity/transform/filter/width updates every animation frame are still
 * done exactly as the reference does it (direct style mutation via refs,
 * not React state — this runs 60x/second and re-rendering React for that
 * would be wasteful), but the *content* that only changes when the selected
 * book changes (the arc's tiles, the dots, the text on every page) is
 * ordinary React state/JSX instead of the reference's innerHTML rebuilding,
 * since that's the idiomatic way to do it here and behaves at least as well
 * (keying each tile by its book, not its slot, lets the existing CSS
 * transition actually animate the reorder, which innerHTML-replacing every
 * click can't).
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(2);

  const journeyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const leaf0Ref = useRef<HTMLDivElement>(null);
  const leaf1Ref = useRef<HTMLDivElement>(null);
  const leaf2Ref = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);

  function shift(d: number) {
    setSelected((s) => (s + d + N) % N);
  }

  function explore() {
    const journeyEl = journeyRef.current;
    if (!journeyEl) return;
    window.scrollTo({ top: (journeyEl.offsetHeight - window.innerHeight) * 0.23, behavior: 'smooth' });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (window.scrollY < window.innerHeight * 0.5) {
        if (e.key === 'ArrowLeft') shift(-1);
        if (e.key === 'ArrowRight') shift(1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The per-frame scroll-linked animation — ported line-for-line from the
  // reference's own render() function (same stage boundaries: .015-.17 hero
  // fade, .23-.40 / .49-.59 / .73-.83 the three leaves opening, .85-.93
  // closing them back down, .93-.99 the whole book flipping to its back
  // cover).
  useEffect(() => {
    let raf = 0;
    function tick() {
      const journeyEl = journeyRef.current;
      const stageEl = stageRef.current;
      const bookEl = bookRef.current;
      if (journeyEl && stageEl) {
        const p = clamp(window.scrollY / (journeyEl.offsetHeight - stageEl.offsetHeight));
        let f = part(p, 0.015, 0.17);
        let o = part(p, 0.23, 0.4);
        let a = part(p, 0.49, 0.59);
        let b = part(p, 0.73, 0.83);
        let c = part(p, 0.88, 0.98);

        for (const ref of [heroRef, arcRef, prevRef, nextRef, hintRef]) {
          const el = ref.current;
          if (el) {
            el.style.opacity = String(1 - f);
            el.style.pointerEvents = f > 0.5 ? 'none' : '';
          }
        }
        if (shelfRef.current) shelfRef.current.style.opacity = String(1 - f);
        if (glowRef.current) glowRef.current.style.opacity = String(f * (1 - 0.4 * c));
        if (arcRef.current) {
          arcRef.current.style.opacity = String(1 - 0.82 * f);
          arcRef.current.style.filter = `blur(${5 * f}px)`;
        }
        if (bookEl) {
          bookEl.style.opacity = String(f);
          bookEl.classList.toggle('open', p > 0.25);
        }

        const close = part(p, 0.85, 0.93);
        const turn = part(p, 0.93, 0.99);
        o *= 1 - close;
        a *= 1 - close;
        b *= 1 - close;
        c = turn;
        const scale = 0.48 + 0.52 * f;
        if (bookEl) {
          bookEl.style.transform = `translate3d(${-50 + 50 * o - 50 * c}%, -50%, 0) scale(${scale}) rotateY(${180 * c}deg)`;
        }
        if (leaf0Ref.current) {
          leaf0Ref.current.style.transform = `translateZ(${3 * (1 - o)}px) rotateY(${-180 * o}deg)`;
          leaf0Ref.current.style.zIndex = o > 0.5 ? '1' : '6';
        }
        if (leaf1Ref.current) {
          leaf1Ref.current.style.transform = `translateZ(${2 * (1 - a)}px) rotateY(${-180 * a}deg)`;
          leaf1Ref.current.style.zIndex = a > 0.5 ? '2' : '5';
        }
        if (leaf2Ref.current) {
          leaf2Ref.current.style.transform = `translateZ(${1 * (1 - b)}px) rotateY(${-180 * b}deg)`;
          leaf2Ref.current.style.zIndex = b > 0.5 ? '3' : '4';
        }
        if (baseRef.current) baseRef.current.style.zIndex = '0';
        if (progressRef.current) progressRef.current.style.width = p * 100 + '%';
        if (chapterRef.current) {
          chapterRef.current.innerHTML =
            p < 0.12
              ? ''
              : p > 0.98
                ? `<button onclick="window.scrollTo({top:0,behavior:'smooth'})">← Kitablara qayıt</button>`
                : (p < 0.4 ? '01 — Kitabı aç' : p < 0.59 ? '02 — Müəllif və kitab' : p < 0.83 ? '03 — Qiymət və satış' : '04 — Son səhifə') +
                  ' · ' +
                  Math.round(p * 100) +
                  '%';
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const book = books[selected];
  const cover = COVER_IMAGES[book.id];

  return (
    <div className="landing-page">
      <header>
        <div className="logo">
          <svg viewBox="0 0 40 32" aria-hidden="true">
            <path fill="#54246b" d="M1 5Q12 2 20 9Q28 2 39 5V29Q28 26 20 31Q12 26 1 29Z" />
            <path fill="#ff9b38" stroke="#fff" strokeWidth={1.5} d="M4 2Q14 0 20 7Q26 0 36 2V24Q26 22 20 28Q14 22 4 24Z M20 7V28" />
          </svg>
          simart
        </div>
        <nav>
          <a href="#top">Ana səhifə</a>
          <a href="#top">Kitablar</a>
          <a href="#about">Haqqında</a>
        </nav>
        <button className="pill" onClick={() => navigate('/giris')}>
          Daxil ol
        </button>
      </header>

      <main id="top">
        <section className="journey" ref={journeyRef}>
          <div className="stage" ref={stageRef}>
            <div className="hero" ref={heroRef}>
              <h1>Hər kitab, yeni bir dünya.</h1>
              <p>Uşaqlar və ailələr üçün seçilmiş kitabları kəşf et.</p>
            </div>

            <div className="shelf" ref={shelfRef} />
            <div className="glow" ref={glowRef} />

            <div className="arc" ref={arcRef}>
              {SLOT_OFFSETS.map((k) => {
                const i = (selected + k + N) % N;
                const t = books[i];
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="tile"
                    data-center={k === 0 ? '' : undefined}
                    aria-label={t.title}
                    aria-current={k === 0}
                    style={
                      {
                        '--x': `${k * 15.5}vw`,
                        '--y': `${Math.abs(k) ** 1.5 * 21}px`,
                        '--r': `${k * 8}deg`,
                        '--s': 1 - Math.abs(k) * 0.1,
                        zIndex: 5 - Math.abs(k),
                      } as React.CSSProperties
                    }
                    onClick={() => setSelected(i)}
                  >
                    <img src={COVER_IMAGES[t.id]} alt={t.title} />
                  </button>
                );
              })}
            </div>

            <button ref={prevRef} type="button" className="arrow prev" aria-label="Əvvəlki kitab" onClick={() => shift(-1)}>
              ‹
            </button>
            <button ref={nextRef} type="button" className="arrow next" aria-label="Növbəti kitab" onClick={() => shift(1)}>
              ›
            </button>

            <div className="hint" ref={hintRef}>
              <div className="dots">
                {books.map((b, i) => (
                  <i key={b.id} className={i === selected ? 'active' : ''} />
                ))}
              </div>
              <button type="button" className="pill" onClick={explore}>
                Kitabı kəşf et
              </button>
              <br />
              Aşağı sürüşdür ↓
            </div>

            <div className="book" ref={bookRef}>
              <div className="base" ref={baseRef}>
                <div className="face paper">
                  <span className="eyebrow">Son</span>
                  <h2>Növbəti kitab səni gözləyir.</h2>
                  <button type="button" className="pill" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    Kitablara qayıt
                  </button>
                </div>
                <div className="face reverse back">
                  <span>simart</span>
                  <h2>{book.title}</h2>
                  <p>{book.theme}</p>
                  <small>Hər kitab, yeni bir dünya.</small>
                </div>
              </div>

              <div className="leaf" ref={leaf2Ref}>
                <div className="face paper">
                  <span className="eyebrow">03 / Satın al</span>
                  <h2>Kitabı əldə et</h2>
                  <div className="price">12,90 ₼</div>
                  <p>Nümunə qiymət</p>
                  <p>Haradan əldə etmək olar?</p>
                  <div className="store">BakuBook ↗ (nümunə)</div>
                  <div className="store">Libraff ↗ (nümunə)</div>
                  <div className="store">Ali &amp; Nino ↗ (nümunə)</div>
                  <span className="number">04</span>
                </div>
                <div className="face paper reverse">
                  <h2>Oxumaq bir macəradır.</h2>
                  <p>Hər səhifə yeni bir başlanğıcdır.</p>
                </div>
              </div>

              <div className="leaf" ref={leaf1Ref}>
                <div className="face paper">
                  <span className="eyebrow">Kitab haqqında</span>
                  <h2>{book.title}</h2>
                  <img className="art" src={cover} alt="" />
                  <p>{book.theme} mövzusunda uşaqlar üçün maraqlı bir səyahət.</p>
                  <p>6–10 yaş · 32 səhifə · Azərbaycan dili</p>
                  <span className="number">02</span>
                </div>
                <div className="face paper reverse">
                  <span className="eyebrow">02 / Kəşf et</span>
                  <h2>Kitab haqqında</h2>
                  <p>{book.theme} mövzusunda maraqlı hekayə.</p>
                  <p>6–10 yaş · 32 səhifə · Azərbaycan dili</p>
                  <span className="number">03</span>
                </div>
              </div>

              <div className="leaf" ref={leaf0Ref}>
                <div className="face cover">
                  <img src={cover} alt={book.title} />
                </div>
                <div className="face paper reverse">
                  <span className="eyebrow">01 / Müəllif</span>
                  <div className="portrait">✎</div>
                  <h2>Müəllif haqqında</h2>
                  <p>Nümunə müəllif profili. Burada müəllifin bioqrafiyası və yaradıcılığı göstəriləcək.</p>
                  <span className="number">01</span>
                </div>
              </div>
            </div>

            <div className="chapter" ref={chapterRef} />
            <div className="progress" ref={progressRef} />
          </div>
        </section>

        <section className="footer" id="about">
          <h2>Yeni bir dünya kəşf et.</h2>
          <p>SİMART — ailənin rəqəmsal vərdiş dünyası.</p>
          <button type="button" className="pill" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Kitablara qayıt
          </button>
          <p>
            <small>Prototip • Kitab məlumatları və qiymətlər nümunədir.</small>
          </p>
        </section>
      </main>
    </div>
  );
}
