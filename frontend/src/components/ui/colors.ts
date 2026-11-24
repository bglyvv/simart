// Central lookup so icon-tile background tokens coming from mock data (e.g. "purple-100")
// resolve to literal Tailwind class names the compiler can see at build time.
//
// Premium redesign note: the new design system treats color as a restrained,
// supporting accent (sage/sand), not a per-category rainbow — see
// new_design/DESIGN_SYSTEM.md §2 ("neutral colors as the foundation ... sage
// and sand are supporting accents, not dominant backgrounds"). Rather than
// rename every slug across the mock-data JSON files, the OLD hue-bucket keys
// below are kept as stable identifiers and now collapse onto the NEW
// restrained palette: most buckets resolve to a plain neutral tile, "green"/
// "teal" (previously used for positive/calm things) resolve to the sage
// accent, "amber"/"coral" (previously warm/reward things) resolve to the
// sand accent, and "red" resolves to the error tint.
export const TINT_BG: Record<string, string> = {
  'purple-100': 'bg-surface-alt',
  'blue-100': 'bg-surface-alt',
  'green-100': 'bg-sage-tint',
  'teal-100': 'bg-sage-tint',
  'amber-100': 'bg-sand-tint',
  'coral-100': 'bg-sand-tint',
  'red-100': 'bg-error-tint',
};

export const TINT_TEXT: Record<string, string> = {
  'purple-100': 'text-text-700',
  'blue-100': 'text-text-700',
  'green-100': 'text-sage-text',
  'teal-100': 'text-sage-text',
  'amber-100': 'text-sand-text',
  'coral-100': 'text-sand-text',
  'red-100': 'text-error',
};
