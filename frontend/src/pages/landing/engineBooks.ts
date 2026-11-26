import landingData from '../../data/landingBooks.json';
import { bookImageUrl, type AuthorGender, type Book, type BookScene } from '../../lib/bookService';

/** Placeholder author avatars (drawn by bookJourney's `avatar`) used when a
 * book has no author photo — one per gender. */
export const AUTHOR_LOOKS: Record<AuthorGender, { hair: string; skin: string; shirt: string; bg: string; style: string }> = {
  female: { hair: '#2c1f30', skin: '#f2c7a5', shirt: '#7c5cc8', bg: '#ddd1f5', style: 'long' },
  male: { hair: '#3b2a20', skin: '#e9b993', shirt: '#4f8f4a', bg: '#d6ead0', style: 'short' },
};

/** Page tint per back-cover scene — the same colours the original five books used. */
const ACCENT_BY_SCENE: Record<BookScene, string> = {
  space: '91,58,158',
  forest: '64,128,60',
  meadow: '196,104,52',
  sea: '46,110,170',
  sunny: '214,120,40',
};

/** How the cover is cropped onto the two inside pages. */
const DEFAULT_ART = [
  { size: '165%', pos: '50% 100%' },
  { size: '230%', pos: '45% 94%', flip: true },
];

/** The original books had hand-tuned crops; keep them when the ISBN matches. */
const LEGACY_ART = new Map(landingData.books.map((b) => [b.code, b.art]));

const STORE_COLORS: Record<string, { color: string; text?: string }> = {
  bakubook: { color: '#5b2a7e' },
  libraff: { color: '#e2312d', text: '#d42a26' },
  'ali & nino': { color: '#ea7f22' },
};

function formatPrice(azn: number): string {
  return `${azn.toFixed(2).replace('.', ',')} ₼`;
}

/** Maps an API book to the object shape bookJourney.ts expects. */
export function toEngineBook(b: Book) {
  return {
    id: b.id,
    title: b.title,
    scene: b.backScene,
    accent: ACCENT_BY_SCENE[b.backScene] ?? ACCENT_BY_SCENE.meadow,
    category: b.category,
    age: b.ageRange,
    pages: b.pageCount,
    price: formatPrice(b.priceAzn),
    cover: bookImageUrl(b.coverImageId),
    back: b.backCoverImageId ? bookImageUrl(b.backCoverImageId) : undefined,
    author: {
      name: b.authorName,
      bio: b.authorBio,
      look: AUTHOR_LOOKS[b.authorGender] ?? AUTHOR_LOOKS.female,
      photo: b.authorPhotoImageId ? bookImageUrl(b.authorPhotoImageId) : undefined,
    },
    about: b.about,
    quote: b.quote,
    code: b.isbn ?? '',
    art: (b.isbn && LEGACY_ART.get(b.isbn)) || DEFAULT_ART,
    // No links → the engine falls back to the default store list.
    stores: b.storeLinks.length
      ? b.storeLinks.map((s) => ({ name: s.name, url: s.url, ...(STORE_COLORS[s.name.trim().toLowerCase()] ?? { color: '#7c5cc8' }) }))
      : undefined,
  };
}
