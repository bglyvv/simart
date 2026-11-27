import simartLogo from '../../assets/simart-logo.png';

// Static markup for the public pages. The journey stage comes from the
// reference page (simart-book-journey.html); the header, contact section and
// footer are shared with the About page (aboutMarkup.ts). Link hooks, handled
// by siteLinks.ts: data-scroll (scroll to "top" or the section with that id)
// and data-route (in-app navigation without a full page reload).

export function siteHeader(active: 'home' | 'about' | 'contact'): string {
  return `
<header class="topbar" id="topbar">
  <a class="brand" href="/" data-route aria-label="SİMART ana səhifə">
    <img src="${simartLogo}" alt="SİMART" width="800" height="312">
  </a>
  <nav class="nav" aria-label="Əsas menyu">
    <a href="/" data-route${active === 'home' ? ' class="active" aria-current="page"' : ''}>Ana səhifə</a>
    <a href="/haqqinda" data-route${active === 'about' ? ' class="active" aria-current="page"' : ''}>Haqqında</a>
    <a href="/elaqe" data-route${active === 'contact' ? ' class="active" aria-current="page"' : ''}>Əlaqə</a>
  </nav>
  <div class="actions">
    <a class="btn-login" href="/daxil-ol" data-route>Daxil ol</a>
    <a class="btn-play" href="https://simart-game.netlify.app/" aria-label="Oyun oyna"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.5a2.3 2.3 0 0 1-3.9 1.1L15 15.5H9l-2.3 2.1a2.3 2.3 0 0 1-3.9-1.1L2.1 13A5 5 0 0 1 7 7Z" fill="currentColor"/><path d="M8 9.5v3M6.5 11h3" stroke="#f7792a" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="10.3" r="1.1" fill="#f7792a"/><circle cx="17.6" cy="12.3" r="1.1" fill="#f7792a"/></svg><span>Oyun oyna</span></a>
  </div>
</header>`;
}

export const CONTACT_SECTION = `
  <section class="info-section alt" id="contact" aria-labelledby="contactTitle">
    <span class="eyebrow">Əlaqə</span>
    <h2 id="contactTitle">Bizimlə əməkdaşlıq üçün</h2>
    <p class="lead">Uşaqlar üçün daha faydalı rəqəmsal dünya qurmağa birlikdə töhfə verək.</p>
    <div class="info-grid three">
      <article class="info-card tint-purple"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span><h3>Nəşriyyatlar və müəlliflər</h3><p>Uşaq kitablarınızı SİMART ailələrinə təqdim edin.</p></article>
      <article class="info-card tint-orange"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg></span><h3>Brendlər və sponsorlar</h3><p>Uşaqların qazandığı XP-ni real mükafatlara çevirin.</p></article>
      <article class="info-card tint-green"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg></span><h3>Sosial layihələr</h3><p>Uşaqların qoşula biləcəyi ianə kampaniyaları başladın.</p></article>
    </div>
    <div class="contact-actions">
      <a class="btn-primary" href="https://www.youtube.com/@Simartaz" target="_blank" rel="noopener noreferrer">YouTube kanalımız</a>
    </div>
  </section>
`;

export const SITE_FOOTER = `
  <footer class="site-footer">
    <img src="${simartLogo}" alt="SİMART" width="800" height="312">
    <small>© 2026 SİMART. Bütün hüquqlar qorunur.</small>
  </footer>
`;

export const LANDING_MARKUP = `${siteHeader('home')}
<main id="top">
  <section class="journey" id="journey" aria-label="Kitab səyahəti">
    <div class="stage" id="stage">
      <div class="bg"></div>
      <div class="platform" id="platform"></div>

      <div class="hero" id="hero">
        <h1>Hər kitab, yeni bir dünya.</h1>
        <p>Uşaqlar və ailələr üçün seçilmiş kitabları kəşf et.</p>
      </div>

      <svg class="shelf" id="shelf" viewBox="0 0 1106 618" aria-hidden="true">
        <defs>
          <linearGradient id="shTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9ebcf"/><stop offset="1" stop-color="#efd6ab"/></linearGradient>
          <linearGradient id="shFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7c591"/><stop offset="1" stop-color="#cd9d64"/></linearGradient>
          <linearGradient id="shSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".88" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
          <filter id="shBlur" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
        </defs>
        <g id="shelfGroup"></g>
      </svg>

      <div class="arc" id="arc" role="group" aria-roledescription="karusel" aria-label="Seçilmiş kitablar"></div>

      <button class="arrow" id="prev" type="button" aria-label="Əvvəlki kitab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="arrow" id="next" type="button" aria-label="Növbəti kitab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>

      <div class="cta" id="cta">
        <div class="dots" id="dots" role="tablist" aria-label="Kitab seçimi"></div>
        <button class="btn-primary" id="explore" type="button">Kitabı kəşf et</button>
        <div class="hint"><span id="hintText">Aşağı sürüşdür</span> <span id="hintArrow">↓</span></div>
      </div>

      <div class="book-anchor" id="anchor">
        <div class="book" id="book" aria-hidden="true">
          <div class="spine spine-front" id="spineF"></div>
          <div class="spine spine-back" id="spineB"></div>
          <div class="block-l"><div class="bf bottom"></div><div class="bf outer"></div><div class="sheet" style="--k:.17"></div><div class="sheet" style="--k:.34"></div><div class="sheet" style="--k:.51"></div><div class="sheet" style="--k:.68"></div><div class="sheet" style="--k:.85"></div></div>

          <!-- base = back board + remaining pages + last page (price) -->
          <div class="leaf base" id="base">
            <div class="face board"></div>
            <div class="block-r"><div class="bf bottom"></div><div class="bf outer"></div><div class="sheet" style="--k:.17"></div><div class="sheet" style="--k:.34"></div><div class="sheet" style="--k:.51"></div><div class="sheet" style="--k:.68"></div><div class="sheet" style="--k:.85"></div></div>
            <div class="face page front" id="pgPrice"></div>
            <div class="face backcover" id="pgBack"></div>
          </div>
          <div class="leaf" id="leaf3"><div class="face page front" id="pgIllus2"></div><div class="face page back" id="pgMini"></div></div>
          <div class="leaf" id="leaf2"><div class="face page front" id="pgIllus1"></div><div class="face page back" id="pgAbout"></div></div>
          <div class="leaf" id="leaf1"><div class="face page front" id="pgTitle"></div><div class="face page back" id="pgAuthor"></div></div>
          <div class="leaf" id="leaf0"><div class="face cover-front"></div><div class="face cover-back"></div><div class="face page back endsheet" id="pgEnd"></div></div>
        </div>
      </div>

      <button class="back-to" id="backTo" type="button">↑ Kitablara qayıt</button>
      <div class="swipe-hint" id="swipeHint"><b>←</b> Səhifəni çevirmək üçün sürüşdür</div>
      <div class="book-nav" id="bookNav" role="group" aria-label="Səhifələr">
        <button class="nb" id="bPrev" type="button" aria-label="Əvvəlki səhifə"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="steps" id="steps"></div>
        <button class="nb" id="bNext" type="button" aria-label="Növbəti səhifə"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
      <p class="sr" id="live" aria-live="polite"></p>
    </div>
  </section>
${CONTACT_SECTION}${SITE_FOOTER}</main>
`;
