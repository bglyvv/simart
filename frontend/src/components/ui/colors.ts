// Central lookup so icon-tile background tokens coming from mock data (e.g. "purple-100")
// resolve to literal Tailwind class names the compiler can see at build time.
export const TINT_BG: Record<string, string> = {
  'purple-100': 'bg-purple-100',
  'blue-100': 'bg-blue-100',
  'green-100': 'bg-green-100',
  'amber-100': 'bg-amber-100',
  'red-100': 'bg-red-100',
  'coral-100': 'bg-coral-100',
  'teal-100': 'bg-teal-100',
};

export const TINT_TEXT: Record<string, string> = {
  'purple-100': 'text-purple-700',
  'blue-100': 'text-blue-700',
  'green-100': 'text-green-700',
  'amber-100': 'text-amber-text',
  'red-100': 'text-red-600',
  'coral-100': 'text-coral-600',
  'teal-100': 'text-teal-600',
};
