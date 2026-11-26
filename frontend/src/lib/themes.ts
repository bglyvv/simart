/**
 * THEME PALETTES — purely cosmetic, child-chosen, local-only preference.
 * -----------------------------------------------------------------------
 * Each theme overrides a handful of index.css's design-token CSS variables
 * via a `:root[data-theme="…"]` block — every existing bg-primary/bg-sage-
 * tint/etc. utility class already resolves against `var(--color-*)`, so
 * setting `document.documentElement.dataset.theme` re-skins the whole app
 * with no per-component changes needed. Deliberately light-only variants
 * (different accent hues, not a real dark mode) — a true dark theme would
 * need auditing every hardcoded `text-white`/`bg-white` call site across the
 * app (several assume a light surface), which is a much bigger change than
 * "let a child pick a color palette" asked for. Semantic colors (success/
 * error) are never touched by any theme — they carry real meaning
 * (approved/pending, correct/incorrect) that shouldn't shift with a cosmetic
 * preference.
 */
export const DEFAULT_THEME = 'default';

/** Not just a palette: besides its tokens it swaps in the real artwork from
 * SIMART_UI_UX_Implementation_Guide.pdf (see components/illustrations/
 * ThemeArt.tsx and useIsIllustratedTheme) plus the decorative rules in
 * index.css's [data-theme='illustrated'] section. */
export const ILLUSTRATED_THEME = 'illustrated';

export interface ThemeOption {
  id: string;
  label: string;
  /** Three swatch colors shown on the picker tile — not necessarily the
   * exact token values, just a representative preview. */
  swatch: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'default', label: 'Defolt', swatch: ['#4a3353', '#a7b8a0', '#d8c9b5'] },
  { id: 'ocean', label: 'Okean', swatch: ['#2c5f8a', '#7fa8c9', '#f0c987'] },
  { id: 'forest', label: 'Meşə', swatch: ['#2f6e4f', '#7fb894', '#d9b97a'] },
  { id: 'sunset', label: 'Gün Batımı', swatch: ['#b5542e', '#e0956b', '#f3c178'] },
  { id: 'candy', label: 'Şəkər', swatch: ['#a3447a', '#c57fbd', '#f0a8c4'] },
  { id: 'lavender', label: 'Lavanda', swatch: ['#5d4e9c', '#a79be0', '#e0b8e8'] },
  // Brighter and more saturated than the other six on purpose — revives the
  // app's original pre-redesign "kid mode" palette (index.css's own LEGACY
  // color block: purple/teal/amber) as an explicit, opt-in option rather
  // than leaving those colors entirely unused now that the rest of the app
  // has moved to the minimal neutral/sage/sand system.
  { id: 'colorful', label: 'Rəngarəng', swatch: ['#8a4fff', '#2dd4bf', '#f5b83d'] },
  // The UI/UX handoff PDF's look, artwork included — see ILLUSTRATED_THEME.
  { id: ILLUSTRATED_THEME, label: 'İllüstrasiyalı', swatch: ['#6d35ed', '#f5a742', '#ede7ff'] },
];
