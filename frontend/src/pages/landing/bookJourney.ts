// @ts-nocheck
/* eslint-disable */
/*
 * The book-journey engine from the supplied reference (simart-book-journey.html),
 * kept close to verbatim on purpose — it's a self-contained imperative
 * animation (3D book geometry, scroll/swipe timeline, snap-to-page) and
 * rewriting it as React would only risk changing its behaviour. Type
 * checking and lint are off for this one vendored file for the same reason.
 *
 * Changes from the source, all needed to live inside the app:
 *  - wrapped as initBookJourney(root, BOOKS, STORES) instead of a page-level
 *    IIFE; book/store data comes from src/data/landingBooks.json;
 *  - element lookups and the --u/--tw/--th CSS variables are scoped to `root`
 *    instead of document / <html>;
 *  - every event listener is registered through on() and removed by the
 *    returned cleanup, which also stops the rAF loop and pending timers —
 *    otherwise leaving the page (e.g. "Daxil ol") would leave the loop and the
 *    window/keyboard handlers running, and React StrictMode's double effect
 *    run would attach every handler twice.
 */
/* simple illustrated avatar, shown when a book has no author photo. Module
   level (moved out of initBookJourney) so the admin books page can preview it. */
export function avatar({ hair, skin, shirt, bg, style }) {
  const back = style === 'long' ? `<path d="M31 64C26 34 42 17 60 17s34 17 29 47l4 44H27z" fill="${hair}"/>`
             : style === 'bob'  ? `<path d="M33 70C27 38 42 19 60 19s33 19 27 51c-3 4-9 5-13 3H46c-4 2-10 1-13-3z" fill="${hair}"/>` : '';
  const top = style === 'short'
    ? `<path d="M37 54C35 32 46 23 61 23c15 0 25 9 23 30-3-8-8-13-14-15-9 5-21 6-31 5-1 3-2 7-2 11z" fill="${hair}"/>`
    : `<path d="M37 56C36 33 47 24 61 24c14 0 24 9 23 30-9-3-17-9-22-17-5 9-14 15-25 19z" fill="${hair}"/>`;
  const ears = style === 'short' ? `<ellipse cx="38" cy="58" rx="4" ry="6" fill="${skin}"/><ellipse cx="82" cy="58" rx="4" ry="6" fill="${skin}"/>` : '';
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" fill="${bg}"/>
    <circle cx="96" cy="26" r="20" fill="#fff" opacity=".35"/>${back}
    <path d="M20 122c2-23 18-34 40-34s38 11 40 34z" fill="${shirt}"/>
    <path d="M51 76h18v14c-3 4-15 4-18 0z" fill="${skin}" opacity=".85"/>${ears}
    <ellipse cx="60" cy="57" rx="22" ry="25" fill="${skin}"/>${top}
    <circle cx="52" cy="59" r="2.6" fill="#2d2026"/><circle cx="68" cy="59" r="2.6" fill="#2d2026"/>
    <path d="M47.5 52.5q4-3 8 0M64.5 52.5q4-3 8 0" stroke="${hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="46.5" cy="66.5" r="4" fill="#f19c92" opacity=".45"/><circle cx="73.5" cy="66.5" r="4" fill="#f19c92" opacity=".45"/>
    <path d="M53 69q7 6 14 0" stroke="#8d3b3b" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;
}

export function initBookJourney(root, BOOKS, STORES) {
let disposed = false, rafId = 0;
const disposers = [];
const on = (target, type, fn, opts) => {
  target.addEventListener(type, fn, opts);
  disposers.push(() => target.removeEventListener(type, fn, opts));
};



/* =====================================================================
   TIMELINE (fractions of the journey's scroll distance)
   ===================================================================== */
const TL = {
  grow:  [0.00, 0.10],   // tile grows into the closed 3D book
  open:  [0.15, 0.25],   // front cover opens → title page
  l1:    [0.30, 0.38],   // → author + illustration
  l2:    [0.47, 0.55],   // → about the book + illustration
  l3:    [0.64, 0.72],   // → price + where to buy
  close: [0.82, 0.91]    // book closes onto the back cover
};
const TRANSITIONS = Object.values(TL);
const SNAP = true;            // finish a page turn when the user stops mid-turn
const VISIBLE_SIDE = 2;       // centre ± 2 = 5 books on the arch

/* =====================================================================
   REFERENCE GEOMETRY (measured from the GIF, 1106 × 618 design pixels)
   ===================================================================== */
const REF = {
  cx: 553,
  center: { y: 337, w: 200, h: 267 },
  slots: [ null, { dx: 197, h: 202, rot: 3 }, { dx: 354, h: 195, rot: 6.5 }, { dx: 520, h: 186, rot: 9 } ],
  shelf: { apex: 435, depth: 17, front: 11, R: 1830, x0: 112, x1: 998 },
  stand: 8
};

/* ===================================================================== */
const $ = id => root.querySelector('#' + id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, [a, b]) => clamp((p - a) / (b - a));
const ease = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = $('stage'), journey = $('journey'), header = $('topbar');
const hero = $('hero'), arc = $('arc'), shelf = $('shelf'), platform = $('platform');
const prevBtn = $('prev'), nextBtn = $('next'), cta = $('cta'), dotsEl = $('dots');
const anchor = $('anchor'), book = $('book'), backTo = $('backTo'), live = $('live');
const leaves = [$('leaf0'), $('leaf1'), $('leaf2'), $('leaf3')], baseLeaf = $('base');
const spineF = $('spineF'), spineB = $('spineB');

const N = BOOKS.length;
let selected = Math.min(2, N - 1);
let G = {};                      // computed geometry

/* ---------------------------------------------------------------- icons */
const SPRIG = (cls, style = '') => `<svg class="sprig ${cls}" style="${style}" viewBox="0 0 60 92" aria-hidden="true">
  <path d="M28 90C28 64 31 38 41 6" fill="none" stroke="#8eac68" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M29 74C16 71 9 61 11 52 22 54 29 62 29 74Z" fill="#a8c683"/>
  <path d="M30 60C43 58 50 48 48 39 38 41 31 49 30 60Z" fill="#97b871"/>
  <path d="M33 45C21 41 17 31 19 22 29 24 34 34 33 45Z" fill="#b3cf8e"/>
  <path d="M36 31C47 29 53 19 51 10 42 12 36 20 36 31Z" fill="#9fbf79"/>
  <path d="M39 18C33 13 32 7 34 2 40 5 41 12 39 18Z" fill="#b9d396"/></svg>`;
const ORN = `<svg class="orn" viewBox="0 0 120 16" aria-hidden="true"><path d="M2 8H46M74 8H118" stroke="#b9a37f" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M60 8C54 2 49 3 47 8 49 13 54 14 60 8Z" fill="#9fbd78"/><path d="M60 8C66 2 71 3 73 8 71 13 66 14 60 8Z" fill="#b3cf8e"/><circle cx="60" cy="8" r="2" fill="#c9a86a"/></svg>`;
const LOGO = `<svg viewBox="0 0 40 32" aria-hidden="true"><path fill="#54246b" d="M1 5Q12 2 20 9Q28 2 39 5V29Q28 26 20 31Q12 26 1 29Z"/><path fill="#ff9b38" stroke="#fff" stroke-width="1.5" d="M4 2Q14 0 20 7Q26 0 36 2V24Q26 22 20 28Q14 22 4 24Z M20 7V28"/></svg>`;
const I = {
  age:  '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.6-4.2 3.6-6.6 7.5-6.6s6.9 2.4 7.5 6.6"/></g></svg>',
  pages:'<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2.5 5.5C5.2 4 8.8 4 12 6.2 15.2 4 18.8 4 21.5 5.5v13.6c-2.7-1.4-6.3-1.4-9.5.7-3.2-2.1-6.8-2.1-9.5-.7z"/><path d="M12 6.2v13.6"/></g></svg>',
  tag:  '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11.6V3.5h8.1l9.6 9.6-8.1 8.1z"/><circle cx="7.6" cy="8" r="1.4"/></g></svg>',
  cart: '<svg class="s-ic" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h2.6l2.3 11.2h11.1l2.2-8.1H6"/><circle cx="9.5" cy="19.3" r="1.6" fill="currentColor"/><circle cx="17" cy="19.3" r="1.6" fill="currentColor"/></g></svg>',
  ext:  '<svg class="s-ext" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></g></svg>'
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* decorative barcode from the book code */
function barcode(code) {
  let s = 0; for (const ch of code) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  let x = 3, bars = '', i = 0;
  const guard = x0 => { bars += `<rect x="${x0}" y="0" width="1" height="38"/><rect x="${x0 + 2}" y="0" width="1" height="38"/>`; };
  guard(3); x = 7;
  while (x < 88) {
    const w = .8 + Math.floor(rnd() * 3) * .75;
    if (i++ % 2 === 0) bars += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="33"/>`;
    x += w + (Math.abs(x - 46) < 1.2 ? 2 : 0);
  }
  guard(90);
  const d = code.replace(/\D/g, '');
  return `<svg viewBox="0 0 96 46" aria-hidden="true"><g fill="#1d1620">${bars}</g>
    <text x="48" y="44.5" font-size="7" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="700" fill="#1d1620" letter-spacing=".6">${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}</text></svg>`;
}

/* illustrated back-cover landscape (replace with b.back = 'image.jpg' for real artwork) */
function scene(theme = 'meadow') {
  const T = {
    meadow:{ sky:['#a8d6ef','#fdf1da'], hills:['#c6ddb0','#a5cb84','#89ba5f'], sun:[240,46], tree:true, flowers:true, clouds:true },
    forest:{ sky:['#c8e5bd','#f8f2da'], hills:['#a8cd94','#7eb26a','#5d974d'], sun:[240,46], pines:true, tree:true, flowers:true, clouds:true },
    space: { sky:['#22144a','#7a4db4'], hills:['#6c4ba0','#56398b','#402b72'], moon:[246,48], stars:true, planet:true },
    sea:   { sky:['#9fd2ee','#fdf2de'], hills:null, sun:[240,46], sea:true, clouds:true },
    sunny: { sky:['#ffcf8c','#fff3dc'], hills:['#f8cf98','#efb06c','#e3924b'], sun:[242,50], rays:true, clouds:true }
  }[theme] || {};
  let g = `<defs><linearGradient id="bcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.sky[0]}"/><stop offset=".72" stop-color="${T.sky[1]}"/></linearGradient>
    <radialGradient id="bcSun"><stop offset="0" stop-color="#fffbe8"/><stop offset=".45" stop-color="#fff2c4" stop-opacity=".9"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient>
    <linearGradient id="bcSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6db7e0"/><stop offset="1" stop-color="#2e72ad"/></linearGradient></defs>
    <rect width="300" height="400" fill="url(#bcSky)"/>`;
  let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  if (T.stars) for (let i = 0; i < 70; i++) g += `<circle cx="${(r()*300).toFixed(1)}" cy="${(r()*250).toFixed(1)}" r="${(r()*1.3+.3).toFixed(2)}" fill="#fff" opacity="${(r()*.6+.3).toFixed(2)}"/>`;
  if (T.sun) { const [x, y] = T.sun; g += `<circle cx="${x}" cy="${y}" r="58" fill="url(#bcSun)"/><circle cx="${x}" cy="${y}" r="20" fill="#fff6d2"/>`;
    if (T.rays) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g += `<path d="M${x + Math.cos(a)*30} ${y + Math.sin(a)*30}L${x + Math.cos(a)*46} ${y + Math.sin(a)*46}" stroke="#fff3cf" stroke-width="4" stroke-linecap="round" opacity=".8"/>`; } }
  if (T.moon) { const [x, y] = T.moon; g += `<circle cx="${x}" cy="${y}" r="50" fill="#fff" opacity=".08"/><circle cx="${x}" cy="${y}" r="24" fill="#fdf0c8"/><circle cx="${x-8}" cy="${y-5}" r="5" fill="#ecd9a6"/><circle cx="${x+7}" cy="${y+8}" r="3.5" fill="#ecd9a6"/>`; }
  if (T.planet) g += `<circle cx="62" cy="214" r="16" fill="#f3a35c"/><path d="M60 207c8 0 14 4 16 9" stroke="#fbc68a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="62" cy="214" rx="30" ry="7" fill="none" stroke="#ffd9a8" stroke-width="2.5" transform="rotate(-18 62 214)"/>`;
  const cloud = (x, y, k) => `<g fill="#fff" opacity=".92" transform="translate(${x} ${y}) scale(${k})"><circle cx="0" cy="0" r="12"/><circle cx="14" cy="-6" r="15"/><circle cx="30" cy="0" r="11"/><rect x="-6" y="0" width="42" height="10" rx="5"/></g>`;
  if (T.clouds) g += cloud(28, 70, 1) + cloud(196, 150, .8) + cloud(40, 196, .6);
  if (T.sea) {
    g += `<path d="M150 282c30-26 62-34 96-20 18 7 36 8 54 4v16H150z" fill="#9db7c9"/><path d="M0 286c40-14 70-12 104-4v10H0z" fill="#b8cbd8"/>
      <rect y="286" width="300" height="114" fill="url(#bcSea)"/>`;
    for (let i = 0; i < 9; i++) { const y = 300 + i * 11, x = (i * 53) % 230; g += `<path d="M${x} ${y}q10 -5 20 0t20 0" stroke="#fff" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`; }
    g += `<g transform="translate(78 300)"><path d="M0 22h56l-9 12H9z" fill="#c4553f"/><path d="M28 -34v56" stroke="#7a4a30" stroke-width="2.2"/><path d="M30 -30c16 14 20 32 18 48H30z" fill="#fffaf0"/><path d="M26 -24c-12 12-16 28-14 42h14z" fill="#f4e7d4"/></g>`;
  }
  if (T.hills) {
    const [h1, h2, h3] = T.hills;
    g += `<path d="M0 292C58 262 112 270 160 283 210 296 252 264 300 271V400H0Z" fill="${h1}"/>`;
    if (T.pines) for (const [x, y, k] of [[22,300,1],[52,292,1.25],[248,296,1.1],[276,304,.9]]) g += `<path d="M${x} ${y-50*k}l${18*k} ${50*k}h${-36*k}z" fill="#5f9a4f" opacity=".85"/><rect x="${x-2*k}" y="${y}" width="${4*k}" height="${8*k}" fill="#7a5235"/>`;
    g += `<path d="M0 322C52 302 100 297 152 311 202 325 252 300 300 307V400H0Z" fill="${h2}"/>`;
    if (T.tree) g += `<g><path d="M244 330c2-14 1-26-3-36h7c3 10 4 22 3 36z" fill="#7a5235"/><circle cx="236" cy="290" r="13" fill="#7fb352"/><circle cx="252" cy="284" r="15" fill="#8dc05e"/><circle cx="246" cy="300" r="12" fill="#77ab4c"/></g>`;
    g += `<path d="M0 352C70 336 140 340 200 349 240 355 270 347 300 345V400H0Z" fill="${h3}"/>`;
    if (T.tree) g += `<g><path d="M46 372C52 330 50 282 38 236l14-3c14 44 18 96 12 139z" fill="#835532"/><path d="M50 290c18-14 34-20 54-22M44 262c-12-10-24-14-36-14" stroke="#835532" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="22" cy="214" r="34" fill="#76ad4b"/><circle cx="62" cy="186" r="38" fill="#86bc58"/><circle cx="104" cy="214" r="30" fill="#7ab24f"/><circle cx="40" cy="244" r="26" fill="#6ea445"/><circle cx="86" cy="246" r="24" fill="#75ab4b"/>
      <circle cx="58" cy="176" r="16" fill="#9fd06d" opacity=".7"/><circle cx="100" cy="204" r="10" fill="#9fd06d" opacity=".6"/></g>`;
    if (T.flowers) for (let i = 0; i < 26; i++) { const x = r() * 300, y = 360 + r() * 36; g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r()*2+1.6).toFixed(1)}" fill="${['#f49ab0','#ffd36b','#fff','#f7b267'][i % 4]}"/>`; }
  }
  return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}

/* ============================================================ BOOK CONTENT */
function fillBook(i) {
  const b = BOOKS[i];
  book.style.setProperty('--cover', `url("${b.cover}")`);
  book.style.setProperty('--accent-rgb', b.accent);
  const art = (k, cls) => {
    const a = (b.art && b.art[k]) || {};
    const src = a.src ? `--cover:url('${a.src}');` : '';
    return `<div class="illus ${a.flip && !a.src ? 'flip' : ''}" style="${src}--size:${a.src ? 'cover' : (a.size || '165%')};--pos:${a.src ? 'center' : (a.pos || '50% 100%')}"><i></i></div>${cls || ''}`;
  };
  $('pgEnd').innerHTML = `<div class="endpaper"><div class="exlibris">${LOGO}<b>Bu kitab</b><i></i><small>adlı balaca oxucuya məxsusdur</small></div></div>`;
  $('pgTitle').innerHTML = `<div class="pin t-page">${SPRIG('', 'right:7%;top:5%;transform:rotate(18deg)')}${SPRIG('', 'left:7%;bottom:4%;transform:rotate(-160deg) scaleX(-1);width:calc(var(--bu)*9)')}
    <span class="kicker">simart təqdim edir</span><h2>${esc(b.title)}</h2>${ORN}<span class="by">${esc(b.author.name)}</span></div>`;
  const photo = b.author.photo ? `<img src="${esc(b.author.photo)}" alt="" style="width:100%;height:100%;object-fit:cover">` : avatar(b.author.look);
  $('pgAuthor').innerHTML = `<div class="pin a-page"><div class="avatar">${photo}</div><span class="label">Müəllif</span><h2>${esc(b.author.name)}</h2><p>${esc(b.author.bio)}</p>
    ${SPRIG('', 'left:5%;bottom:3%;width:calc(var(--bu)*9);transform:rotate(-12deg)')}</div>`;
  $('pgIllus1').innerHTML = art(0, SPRIG('', 'right:2%;top:2%;width:calc(var(--bu)*13);transform:rotate(28deg)'));
  $('pgAbout').innerHTML = `<div class="pin ab-page"><h2>Kitab haqqında</h2><p>${esc(b.about)}</p><ul class="meta">
    <li>${I.age}<span><b>Yaş:</b> ${esc(b.age)}</span></li><li>${I.pages}<span><b>Səhifə:</b> ${esc(b.pages)}</span></li><li>${I.tag}<span><b>Kateqoriya:</b> ${esc(b.category)}</span></li></ul></div>`;
  $('pgIllus2').innerHTML = art(1);
  $('pgMini').innerHTML = `<div class="pin m-page"><div class="mini"></div>${SPRIG('', 'left:6%;bottom:4%;width:calc(var(--bu)*9);transform:rotate(-10deg)')}</div>`;
  const stores = (b.stores || STORES).map(s => `<a class="store" href="${esc(s.url)}" target="_blank" rel="noopener" style="--c:${s.color};--t:${s.text || '#2d1d38'}">${I.cart}<span class="s-name">${esc(s.name)}</span>${I.ext}</a>`).join('');
  $('pgPrice').innerHTML = `<div class="pin pr-page"><h3>Qiymət</h3><div class="price">${esc(b.price)}</div><h4>Haradan əldə etmək olar?</h4><div class="stores">${stores}</div></div>`;
  const dark = b.scene === 'space' && !b.back;
  $('pgBack').style.cssText = dark ? '--qc:#fff;--qg:rgba(30,15,70,.6)' : '';
  $('pgBack').innerHTML = `${b.back ? `<div class="bc-art photo" style="background-image:url('${esc(b.back)}')"></div>` : `<div class="bc-art">${scene(b.scene)}</div>`}
    <div class="bc-quote">${dark ? '' : ORN}<p>“${esc(b.quote)}”</p>${ORN}</div><div class="bc-brand">${LOGO}simart</div><div class="barcode">${barcode(b.code)}</div>`;
}

/* ============================================================ ARCH (hero) */
const tiles = BOOKS.map((b, i) => {
  const t = document.createElement('button');
  t.className = 'tile'; t.type = 'button';
  t.setAttribute('aria-label', b.title);
  t.innerHTML = `<span class="tile-in"><img src="${b.cover}" alt="" draggable="false"></span>`;
  on(t, 'click', () => {
    if (swiped) return;
    if (i === selected) startJourney(); else select(i);
  });
  arc.appendChild(t);
  return t;
});
dotsEl.innerHTML = BOOKS.map((b, i) => `<button type="button" role="tab" aria-label="${esc(b.title)}"></button>`).join('');
const dots = [...dotsEl.children];
dots.forEach((d, i) => on(d, 'click', () => select(i)));

/* signed offset of book i from the selected one, wrapped around the ring */
function offsetOf(i, sel = selected) {
  let k = ((i - sel) % N + N) % N;
  if (k > N / 2) k -= N;
  return k;
}
function standY(dxRef) { const R = REF.shelf.R; return REF.shelf.apex + REF.stand + (R - Math.sqrt(R * R - dxRef * dxRef)); }
function pose(k) {
  const a = Math.min(Math.abs(k), 3), sg = Math.sign(k) || 0;
  const u = G.u;
  if (a === 0) return { x: G.ox + REF.cx * u, y: G.oy + REF.center.y * u, s: 1, r: 0, o: 1, z: 10 };
  const sl = REF.slots[a];
  const cy = standY(sl.dx) - sl.h / 2;
  return { x: G.ox + (REF.cx + sg * sl.dx * G.dxScale) * u, y: G.oy + cy * u, s: sl.h / REF.center.h, r: sg * sl.rot,
           o: a <= VISIBLE_SIDE ? 1 : 0, z: 10 - a };
}
function applyPose(t, P) {
  t.style.transform = `translate3d(${P.x.toFixed(2)}px,${P.y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${P.r}deg) scale(${P.s.toFixed(4)})`;
  t.style.opacity = P.o; t.style.zIndex = P.z;
}

function layoutTiles(dir = 0) {
  tiles.forEach((t, i) => {
    const k = offsetOf(i), prev = t._k;
    t.classList.toggle('is-center', k === 0);
    t.tabIndex = Math.abs(k) <= VISIBLE_SIDE ? 0 : -1;
    t.setAttribute('aria-hidden', Math.abs(k) <= VISIBLE_SIDE ? 'false' : 'true');
    const wrapped = dir && prev !== undefined && Math.abs(k - prev) > N / 2;
    if (wrapped) {
      // a book leaving one end re-enters at the other end: a ghost copy exits, the real one slides in
      if (Math.abs(prev) <= VISIBLE_SIDE && !reduceMotion) spawnGhost(t, prev, dir > 0 ? -3 : 3);
      t.style.transition = 'none';
      applyPose(t, { ...pose(dir > 0 ? 3 : -3), o: 0 });
      t.offsetWidth; // reflow so the jump is not animated
      t.style.transition = '';
    }
    applyPose(t, pose(k));
    t._k = k;
  });
  dots.forEach((d, i) => { d.classList.toggle('active', i === selected); d.setAttribute('aria-selected', i === selected); });
}
function spawnGhost(t, fromK, toK) {
  const g = t.cloneNode(true);
  g.classList.add('ghost'); g.classList.remove('is-center'); g.removeAttribute('aria-label'); g.tabIndex = -1;
  g.style.transition = 'none'; applyPose(g, pose(fromK));
  arc.appendChild(g); g.offsetWidth; g.style.transition = '';
  applyPose(g, { ...pose(toK), o: 0 });
  setTimeout(() => g.remove(), 800);
}
function select(i) {
  i = ((i % N) + N) % N;
  if (i === selected) return;
  let d = i - selected; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
  selected = i;
  layoutTiles(Math.sign(d));
  fillBook(selected);
  live.textContent = BOOKS[selected].title;
}
const shift = d => select(selected + d);
on(prevBtn, 'click', () => shift(-1));
on(nextBtn, 'click', () => shift(1));
on(document, 'keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const d = e.key === 'ArrowRight' ? 1 : -1;
  if (swipeMode && Math.round(swipeF) >= 1) { swipeTo(Math.round(swipeF) + d); e.preventDefault(); return; }  // turn pages
  if (shown > .02) return;
  shift(d); e.preventDefault();                                                                           // change book
});
/* swipe on the arch (touch & mouse drag) */
let swX = null, swiped = false;
on(arc, 'pointerdown', e => { if (shown > .02) return; swX = e.clientX; swiped = false; });
on(window, 'pointerup', e => {
  if (swX === null) return;
  const dx = e.clientX - swX; swX = null;
  if (Math.abs(dx) > 45) { swiped = true; shift(dx < 0 ? 1 : -1); setTimeout(() => swiped = false, 50); }
});

/* ============================================================ SHELF SVG */
function arcPath(yApex, x0, x1, R) {           // y of a circular arc's end points, given its apex
  const h = (x1 - x0) / 2;
  return { y: yApex + (R - Math.sqrt(R * R - h * h)) };
}
function buildShelf() {
  const S = REF.shelf, x0 = S.x0, x1 = S.x1, R = S.R;
  const back = arcPath(S.apex, x0, x1, R), ftop = arcPath(S.apex + S.depth, x0, x1, R), fbot = arcPath(S.apex + S.depth + S.front, x0, x1, R);
  const body = `M${x0} ${back.y} A${R} ${R} 0 0 1 ${x1} ${back.y} C${x1 + 9} ${back.y + 4} ${x1 + 9} ${fbot.y - 4} ${x1} ${fbot.y} A${R} ${R} 0 0 0 ${x0} ${fbot.y} C${x0 - 9} ${fbot.y - 4} ${x0 - 9} ${back.y + 4} ${x0} ${back.y}Z`;
  const top = `M${x0} ${back.y} A${R} ${R} 0 0 1 ${x1} ${back.y} C${x1 + 7} ${back.y + 3} ${x1 + 7} ${ftop.y - 3} ${x1} ${ftop.y} A${R} ${R} 0 0 0 ${x0} ${ftop.y} C${x0 - 7} ${ftop.y - 3} ${x0 - 7} ${back.y + 3} ${x0} ${back.y}Z`;
  const shadow = `M${x0 + 20} ${fbot.y + 4} A${R} ${R} 0 0 1 ${x1 - 20} ${fbot.y + 4} L${x1 - 30} ${fbot.y + 26} A${R} ${R} 0 0 0 ${x0 + 30} ${fbot.y + 26}Z`;
  const hl = `M${x0 + 6} ${ftop.y - .5} A${R} ${R} 0 0 1 ${x1 - 6} ${ftop.y - .5}`;
  $('shelfGroup').innerHTML = `<path d="${shadow}" fill="#6b3f6e" opacity=".22" filter="url(#shBlur)"/>
    <path d="${body}" fill="url(#shFront)"/><path d="${body}" fill="url(#shSide)"/><path d="${top}" fill="url(#shTop)"/>
    <path d="${hl}" fill="none" stroke="#fff6e4" stroke-width="1.6" opacity=".9"/>`;
}

/* ============================================================ LAYOUT */
function layout() {
  const sw = stage.clientWidth, sh = stage.clientHeight, hh = header.offsetHeight;
  const mobile = sw < 720 || sw / sh < .8;
  setSwipeMode(mobile);
  let u = mobile ? Math.min(sw / 450, (sh - hh) / 600) : Math.min(sw / 1106, sh / 618);
  u = clamp(u, .4, 2);
  const top = 90, bottom = 610;                      // design-space vertical extent of the hero
  const free = sh - hh - (bottom - top) * u;
  const oy = hh + Math.max(0, free / 2) - top * u + (mobile ? 0 : Math.min(0, free / 2));
  const ox = (sw - 1106 * u) / 2;
  G = { sw, sh, hh, u, ox, oy, mobile, dxScale: mobile ? .8 : 1 };

  const rootStyle = root.style;
  rootStyle.setProperty('--u', u + 'px');
  rootStyle.setProperty('--tw', (REF.center.w * u) + 'px');
  rootStyle.setProperty('--th', (REF.center.h * u) + 'px');

  hero.style.top = (oy + 97 * u) + 'px';
  Object.assign(shelf.style, { left: ox + 'px', top: oy + 'px', width: 1106 * u + 'px', height: 618 * u + 'px',
    transform: G.dxScale !== 1 ? `scaleX(${G.dxScale})` : '' });
  const arrowY = oy + 377 * u;
  const ax = mobile ? 26 : Math.max(30, ox + 60 * u);
  prevBtn.style.transform = `translate(${ax}px,${arrowY}px) translate(-50%,-50%)`;
  nextBtn.style.transform = `translate(${sw - ax}px,${arrowY}px) translate(-50%,-50%)`;
  cta.style.top = (oy + 493 * u) + 'px';
  platform.style.top = (oy + 400 * u) + 'px';

  /* book size: one page is W × H; the open spread is 2W wide */
  const maxSpread = sw * (mobile ? .94 : .72);
  let H = Math.min((sh - hh) * .86, maxSpread / 1.5);
  if (!mobile) H = Math.min(H, sh * .75);
  const W = H * .75, D = H * .095, c = Math.max(1.5, H * .006), m = H * .027, L0 = D * .42, dl = D * .06;
  const cy = Math.max(hh + 14 + H / 2, sh * .525);
  /* a closed book is only one page wide, so on narrow screens it can be shown larger than the spread */
  const closedScale = Math.max(1, Math.min(1.6, sw * .78 / W, (sh - hh) * .8 / H));
  Object.assign(G, { W, H, D, c, m, L0, dl, cy, closedScale, persp: H * 4.5 });
  const bs = book.style;
  bs.setProperty('--W', W + 'px'); bs.setProperty('--H', H + 'px'); bs.setProperty('--D', D + 'px');
  bs.setProperty('--c', c + 'px'); bs.setProperty('--m', m + 'px'); bs.setProperty('--bu', H / 100 + 'px');
  bs.setProperty('--zb', (D - L0 - 3 * dl) + 'px');
  bs.setProperty('--mv', (H * .014) + 'px');      // cover overhang at top / bottom
  bs.setProperty('--fy', (H * .0055) + 'px');
  anchor.style.top = cy + 'px';
  anchor.style.perspective = G.persp + 'px';

  /* scale at which the closed book exactly covers the centre tile (with perspective compensation) */
  const zFront = (D / 2 + c);
  const s0raw = (REF.center.w * u) / W;
  G.s0 = s0raw / (G.persp / (G.persp - zFront * s0raw));

  arc.classList.add('no-anim');
  layoutTiles(0);
  arc.offsetWidth; arc.classList.remove('no-anim');
  lastP = -1;
}

/* ============================================================ SCROLL → PROGRESS */
const distance = () => Math.max(1, journey.offsetHeight - stage.offsetHeight);
const targetProgress = () => clamp((scrollY - journey.offsetTop) / distance());
const scrollToProgress = p => scrollTo({ top: journey.offsetTop + p * distance(), behavior: reduceMotion ? 'auto' : 'smooth' });

/* Stops = the resting states: shelf, closed book, title, author, about, price, back cover.
   Desktop: reached by scrolling (HOLD = scroll progress of each stop).
   Phone ("swipe mode"): the journey is one screen tall, pages turn with left/right swipes,
   and vertical scrolling is left completely to the browser. */
const HOLD = [0, .125, .275, .425, .595, .77, .955];
const LAST = HOLD.length - 1;
let swipeMode = false, swipeF = 0, shownF = 0, dragging = false, swipedOnce = false;
/* in swipe mode a fractional stop index maps straight onto the transition between two stops */
const progressAt = f => { f = clamp(f, 0, LAST); if (f >= LAST) return HOLD[LAST]; const i = Math.floor(f), [a, b] = TRANSITIONS[i]; return f === i && i > 0 ? HOLD[i] : lerp(a, b, f - i); };
const nearestStop = p => HOLD.reduce((best, h, i) => Math.abs(h - p) < Math.abs(HOLD[best] - p) ? i : best, 0);
function swipeTo(i) {
  swipeF = clamp(Math.round(i), 0, LAST);
  if (swipeF >= 2) swipedOnce = true;
}
function setSwipeMode(on) {
  if (on === swipeMode) return;
  const stop = swipeMode ? Math.round(swipeF) : nearestStop(shown);
  const inJourney = scrollY < journey.offsetTop + journey.offsetHeight - 1;
  swipeMode = on;
  journey.classList.toggle('swipe-mode', on);
  if (on && inJourney) scrollTo(0, journey.offsetTop);   // keep the book on screen when the page gets shorter
  $('hintText').textContent = on ? 'Sola-sağa sürüşdür' : 'Aşağı sürüşdür';
  $('hintArrow').textContent = on ? '↔' : '↓';
  if (on) { swipeF = shownF = stop; shown = progressAt(stop); }
  else requestAnimationFrame(() => { scrollTo(0, journey.offsetTop + HOLD[stop] * distance()); shown = HOLD[stop]; });
}
const toTop = () => { if (scrollY > journey.offsetTop + 4) scrollTo({ top: journey.offsetTop, behavior: reduceMotion ? 'auto' : 'smooth' }); };
function startJourney() { if (swipeMode) { toTop(); swipeTo(1); } else scrollToProgress(TL.grow[1] + .015); }
function backToShelf() { if (swipeMode) { toTop(); swipeTo(0); } else scrollToProgress(0); }
on($('explore'), 'click', startJourney);
on(backTo, 'click', backToShelf);
if ($('footerBack')) on($('footerBack'), 'click', backToShelf); // optional — the footer no longer has it
on($('bPrev'), 'click', () => swipeTo(Math.round(swipeF) - 1));
on($('bNext'), 'click', () => swipeTo(Math.round(swipeF) + 1));
$('steps').innerHTML = HOLD.slice(1).map(() => '<i></i>').join('');
const stepDots = [...$('steps').children];

/* horizontal drag turns pages and follows the finger; a vertical drag is handed to the browser (touch-action: pan-y) */
let gst = null;
on(stage, 'pointerdown', e => {
  if (!swipeMode || e.button > 0 || e.target.closest('a,button')) return;
  const idx = Math.round(swipeF);
  if (idx < 1) return;                                   // on the shelf the swipe changes the book instead
  gst = { id: e.pointerId, x: e.clientX, y: e.clientY, idx, dir: null, lx: e.clientX, lt: performance.now(), v: 0 };
});
on(stage, 'pointermove', e => {
  if (!gst || e.pointerId !== gst.id) return;
  const dx = e.clientX - gst.x, dy = e.clientY - gst.y;
  if (!gst.dir) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    gst.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    if (gst.dir === 'v') { gst = null; return; }
    dragging = true;
  }
  const now = performance.now();
  gst.v = (e.clientX - gst.lx) / Math.max(1, now - gst.lt); gst.lx = e.clientX; gst.lt = now;
  swipeF = clamp(gst.idx - dx / (G.sw * .6), 0, LAST);   // drag a little over half the screen = one page
});
function endDrag(e, cancel) {
  if (!gst || (e && e.pointerId !== gst.id)) return;
  if (gst.dir === 'h') {
    const f = gst.idx - swipeF;                          // < 0 → forward
    const flick = Math.abs(gst.v) > .35;
    let target = gst.idx;
    if (!cancel && (Math.abs(f) > .2 || flick)) {
      const d = Math.abs(f) > .2 ? -Math.sign(f) : (gst.v < 0 ? 1 : -1);
      target = gst.idx + d * Math.max(1, Math.round(Math.abs(f)));
    }
    swipeTo(target);
  }
  gst = null; dragging = false;
}
on(stage, 'pointerup', e => endDrag(e, false));
on(stage, 'pointercancel', e => endDrag(e, true));

/* finish a half-done page turn in the direction the user was scrolling */
let lastY = scrollY, dir = 1, idle = 0, touching = false;
on(window, 'touchstart', () => touching = true, { passive: true });
on(window, 'touchend', () => { touching = false; clearTimeout(idle); idle = setTimeout(settle, 220); }, { passive: true });
on(window, 'scroll', () => {
  const y = scrollY; if (y !== lastY) dir = Math.sign(y - lastY); lastY = y;
  clearTimeout(idle); idle = setTimeout(settle, 170);
}, { passive: true });
function settle() {
  if (disposed) return;
  if (!SNAP || touching || swipeMode) return;
  const p = targetProgress();
  if (p <= 0 || p >= 1) return;
  for (const [a, b] of TRANSITIONS) {
    if (p > a + .003 && p < b - .003) { scrollToProgress(clamp(dir >= 0 ? b + .015 : a - .015)); return; }
  }
}

/* ============================================================ RENDER */
let shown = 0, lastP = -1, lastT = performance.now();
function frame(now) {
  if (disposed) return;
  const dt = Math.min(64, now - lastT); lastT = now;
  const k = base => 1 - Math.pow(1 - base, dt / 16.7);
  if (swipeMode) {
    shownF = reduceMotion ? swipeF : shownF + (swipeF - shownF) * k(dragging ? .5 : .12);
    if (Math.abs(swipeF - shownF) < .0004) shownF = swipeF;
    shown = progressAt(shownF);
  } else {
    const target = targetProgress();
    shown = reduceMotion ? target : shown + (target - shown) * k(.16);
    if (Math.abs(target - shown) < .00005) shown = target;
  }
  if (Math.abs(shown - lastP) > .00001) { render(shown); lastP = shown; }
  (rafId = requestAnimationFrame(frame));
}

function setLeaf(el, t, z0, axis) {
  el.style.transform = `translateZ(${axis.toFixed(2)}px) rotateY(${(-180 * t).toFixed(3)}deg) translateZ(${(z0 - axis).toFixed(2)}px)`;
  el.style.setProperty('--shade', (Math.sin(Math.PI * t) * .5).toFixed(3));
}

function render(p) {
  const { u, W, D, c, L0, dl } = G;

  /* --- hero out --- */
  const fade = seg(p, [0, .045]);
  const heroOn = fade < .5;
  hero.style.opacity = 1 - fade;
  hero.style.transform = `translateY(${(-fade * 24 * u).toFixed(2)}px)`;
  cta.style.opacity = prevBtn.style.opacity = nextBtn.style.opacity = 1 - fade;
  cta.style.visibility = prevBtn.style.visibility = nextBtn.style.visibility = fade >= 1 ? 'hidden' : '';
  cta.style.pointerEvents = heroOn ? '' : 'none';
  prevBtn.style.pointerEvents = nextBtn.style.pointerEvents = heroOn ? '' : 'none';
  arc.classList.toggle('locked', !heroOn);
  const bl = seg(p, [0, .08]);
  arc.style.filter = bl > 0 ? `blur(${(bl * 6 * u).toFixed(2)}px) saturate(${(1 - .2 * bl).toFixed(3)})` : '';
  arc.style.opacity = 1 - .55 * bl;
  shelf.style.opacity = 1 - seg(p, [0, .07]);
  platform.style.opacity = seg(p, [.02, .1]);
  const active = p > .0015;
  arc.classList.toggle('handoff', active);

  /* --- book --- */
  book.style.visibility = active ? 'visible' : 'hidden';
  const gr = ease(seg(p, TL.grow)), o = ease(seg(p, TL.open));
  const a1 = ease(seg(p, TL.l1)), a2 = ease(seg(p, TL.l2)), a3 = ease(seg(p, TL.l3));
  const cl = ease(seg(p, TL.close));
  const tp = pose(0);
  const tx = lerp(tp.x - G.sw / 2, 0, gr), ty = lerp(tp.y - G.cy, 0, gr);
  const s = lerp(lerp(lerp(G.s0, G.closedScale, gr), 1, o), G.closedScale, cl);
  const RX = 13, RY = 19, RXO = 9;
  let rx = lerp(0, RX, gr), ry = lerp(0, RY, gr);
  rx = lerp(rx, RXO, o); ry = lerp(ry, 0, o);
  rx = lerp(rx, RX, cl); ry = lerp(ry, -RY, cl);
  const lift = Math.sin(Math.PI * o) * .025 + Math.sin(Math.PI * cl) * .025;  // tiny "breath" while it opens / closes
  const sh = lerp(lerp(-W / 2, 0, o), W / 2, cl);
  book.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${(s * (1 - lift)).toFixed(4)}) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) translate3d(${sh.toFixed(2)}px,0,${(-D / 2).toFixed(2)}px)`;

  /* page-block thickness: a chunk (L0) of pages goes over with the cover, then each leaf moves dl */
  const flipped = a1 + a2 + a3;
  const sink = L0 * seg(o, [0, .5]);                 // right stack drops while the cover lifts…
  book.style.setProperty('--tR', Math.max(0, D - sink - flipped * dl).toFixed(2) + 'px');
  const tR = Math.max(0, D - sink - flipped * dl), tL = L0 * seg(o, [.5, 1]) + flipped * dl;   // …and lands on the left
  book.style.setProperty('--tL', tL.toFixed(2) + 'px');
  book.classList.toggle('no-left', tL < .5);
  book.classList.toggle('no-right', tR < .5);
  const fan = G.H * .026;                                     // how far the lowest sheet peeks out
  book.style.setProperty('--fxL', (fan * clamp(tL / (D * .5))).toFixed(2) + 'px');
  book.style.setProperty('--fxR', (fan * clamp(tR / (D * .5))).toFixed(2) + 'px');
  const ax = (D + dl) / 2;
  setLeaf(leaves[0], o, D + c, (D + c) / 2);                       // cover board lands at z = 0, under the pages
  leaves[0].style.setProperty('--es', Math.max(.5, L0 * seg(o, [.5, 1])).toFixed(2) + 'px');
  setLeaf(leaves[1], a1, D - sink, ax);
  setLeaf(leaves[2], a2, D - sink - dl, ax);
  setLeaf(leaves[3], a3, D - sink - 2 * dl, ax);
  setLeaf(baseLeaf, cl, 0, D / 2 + .6);
  spineF.style.opacity = 1 - seg(o, [0, .35]);
  spineB.style.opacity = seg(cl, [.6, 1]);

  book.classList.toggle('interactive', p > TL.l3[1] - .005 && p < TL.close[0] + .01);
  backTo.classList.toggle('show', p > TL.close[1] + .02 && p < .999);

  /* phone controls */
  const stop = Math.round(swipeF);
  $('bookNav').classList.toggle('show', swipeMode && p > .06);
  $('bPrev').disabled = stop < 1; $('bNext').disabled = stop >= LAST;
  stepDots.forEach((d, i) => d.classList.toggle('on', i + 1 === stop));
  $('swipeHint').classList.toggle('show', swipeMode && !swipedOnce && stop === 1 && Math.abs(shownF - 1) < .05);
}

/* ============================================================ INIT */
buildShelf();
fillBook(selected);
layout();
live.textContent = BOOKS[selected].title;
on(window, 'resize', () => { clearTimeout(layout._t); layout._t = setTimeout(layout, 80); });
if (!swipeMode) shown = targetProgress();
(rafId = requestAnimationFrame(frame));

return () => {
  disposed = true;
  cancelAnimationFrame(rafId);
  clearTimeout(idle);
  clearTimeout(layout._t);
  for (const dispose of disposers) dispose();
  arc.innerHTML = '';
};
}
