import familyArt from '../../assets/about/family.webp';
import booksArt from '../../assets/about/books.webp';
import targetArt from '../../assets/about/target.webp';
import sproutArt from '../../assets/about/sprout.webp';
import castleArt from '../../assets/about/castle.webp';
import { SITE_FOOTER, siteHeader } from './markup';

// The /haqqinda page. Illustrations are cut from the supplied About-page
// design. Same link hooks as the landing page (see siteLinks.ts).
const card = (img: string, w: number, h: number, title: string, text: string) => `
      <article class="about-card">
        <img src="${img}" alt="" width="${w}" height="${h}" loading="lazy">
        <div><h2>${title}</h2><p>${text}</p></div>
      </article>`;

export const ABOUT_MARKUP = `${siteHeader('about')}
<main class="about" id="top">
  <section class="about-hero" aria-labelledby="aboutTitle">
    <div class="about-hero-text">
      <span class="about-eyebrow">Haqqında</span>
      <h1 id="aboutTitle">SİMART nədir?</h1>
      <p>SİMART — ailələrin birlikdə kitab kəşf etdiyi, sağlam vərdişlər formalaşdırdığı və uşaqların hərtərəfli inkişafını dəstəkləyən rəqəmsal platformadır.</p>
      <a class="btn-primary about-cta" href="/" data-route>SİMART-ı kəşf et <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
    </div>
    <img class="about-hero-art" src="${familyArt}" alt="Birlikdə kitab oxuyan ailə" width="1280" height="675">
  </section>

  <section class="about-cards" aria-label="SİMART haqqında">${card(booksArt, 220, 219, 'Məqsədimiz', 'Uşaqlarda oxu mədəniyyətini, məsuliyyət və müsbət vərdişləri inkişaf etdirmək.')}${card(targetArt, 220, 230, 'Dəyərlərimiz', 'Ailə, inkişaf, yaradıcılıq, təhlükəsizlik və etibar.')}${card(sproutArt, 220, 251, 'Niyə SİMART?', 'Kitab, vərdiş və inkişafı bir platformada birləşdirir.')}
  </section>

  <section class="about-future" aria-labelledby="futureTitle">
    <img src="${castleArt}" alt="" width="1100" height="465" loading="lazy">
    <div>
      <h2 id="futureTitle">Gələcək planlarımız</h2>
      <p>SİMART-ı daha da zənginləşdirərək, uşaqlar üçün təhsil, yaradıcılıq və sosial inkişaf imkanlarını genişləndirmək.</p>
    </div>
  </section>
${SITE_FOOTER}</main>
`;
