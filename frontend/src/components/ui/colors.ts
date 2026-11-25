// Central lookup so icon-tile background tokens coming from mock data (e.g. "purple-100")
// resolve to literal Tailwind class names the compiler can see at build time.
//
// "SaaS + gamification" redesign note: each hue bucket gets its own distinct
// soft tint again (matching every icon tile across the PDF's five reference
// mockups — the habit category icons, reward-store tiles, stat cards, etc.),
// reversing the prior "premium minimal" pass's deliberate collapse onto a
// restrained neutral/sage/sand palette. Rather than invent a parallel set of
// tokens, each bucket reuses an existing accent pair from index.css's
// @theme (surface-alt+primary, success, sand, sage, error) — only "blue" and
// "coral" had no existing equivalent, so those two get their own small
// bg-tile-*/text-tile-* utilities (see index.css).
export const TINT_BG: Record<string, string> = {
  'purple-100': 'bg-surface-alt',
  'blue-100': 'bg-tile-blue',
  'green-100': 'bg-success-tint',
  'teal-100': 'bg-sage-tint',
  'amber-100': 'bg-sand-tint',
  'coral-100': 'bg-tile-coral',
  'red-100': 'bg-error-tint',
};

export const TINT_TEXT: Record<string, string> = {
  'purple-100': 'text-primary',
  'blue-100': 'text-tile-blue',
  'green-100': 'text-success',
  'teal-100': 'text-sage-text',
  'amber-100': 'text-sand-text',
  'coral-100': 'text-tile-coral',
  'red-100': 'text-error',
};
