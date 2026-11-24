import type { ReactNode } from 'react';

type BadgeTone = 'green' | 'purple' | 'blue' | 'amber' | 'red' | 'dark';

// Premium redesign: color is a restrained signal, not decoration (never the
// only status indicator — DESIGN_SYSTEM.md §7). Tones keep their old names
// (call sites are unchanged) but now resolve onto the neutral/sage/sand
// system: "green" reads as a positive/success tone, "red" as an error tone,
// everything else (purple/blue/amber) collapses to a plain neutral pill.
const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-success-tint text-success',
  purple: 'bg-surface-alt text-text-700',
  blue: 'bg-surface-alt text-text-700',
  amber: 'bg-sand-tint text-sand-text',
  red: 'bg-error-tint text-error',
  dark: 'bg-primary text-white',
};

export default function Badge({
  tone = 'purple',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-bold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
