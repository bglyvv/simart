// Static markup from the reference page (header + journey stage + footer).
// LandingPage handles two hooks on these links: data-scroll (in-page
// scrolling, replacing the reference's #top/#about) and data-route (in-app
// navigation without a full page reload).
export const LANDING_MARKUP = `
<header class="topbar" id="topbar">
  <a class="brand" href="/" data-scroll="top" aria-label="simart ana səhifə">
    <svg viewBox="0 0 40 32" aria-hidden="true"><path fill="#54246b" d="M1 5Q12 2 20 9Q28 2 39 5V29Q28 26 20 31Q12 26 1 29Z"/><path fill="#ff9b38" stroke="#fff" stroke-width="1.5" d="M4 2Q14 0 20 7Q26 0 36 2V24Q26 22 20 28Q14 22 4 24Z M20 7V28"/></svg>
    simart
  </a>
  <nav class="nav" aria-label="Əsas menyu">
    <a href="/" data-scroll="top" class="active" aria-current="page">Ana səhifə</a>
    <a href="/" data-scroll="top">Kitablar</a>
    <button type="button">Kateqoriyalar <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <a href="/" data-scroll="about">Haqqında</a>
  </nav>
  <div class="actions">
    <button class="icon-btn" type="button" aria-label="Axtar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#2c1838" stroke-width="2.4"/><path d="m15.5 15.5 5 5" stroke="#2c1838" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    <a class="btn-login" href="/giris" data-route>Daxil ol</a>
  </div>
</header>

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

  <section class="footer" id="about">
    <svg class="brand-mark" viewBox="0 0 40 32" aria-hidden="true"><path fill="#54246b" d="M1 5Q12 2 20 9Q28 2 39 5V29Q28 26 20 31Q12 26 1 29Z"/><path fill="#ff9b38" stroke="#fff" stroke-width="1.5" d="M4 2Q14 0 20 7Q26 0 36 2V24Q26 22 20 28Q14 22 4 24Z M20 7V28"/></svg>
    <h2>Yeni bir dünya kəşf et.</h2>
    <p>SİMART — ailənin rəqəmsal vərdiş dünyası.</p>
    <button class="btn-primary" id="footerBack" type="button">Kitablara qayıt</button>
    <small>Prototip • Kitab məlumatları, müəlliflər və qiymətlər nümunədir.</small>
  </section>
</main>
`;
