import type { ReactNode } from 'react';

type BadgeTone = 'green' | 'purple' | 'blue' | 'amber' | 'red' | 'dark';

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-text',
  red: 'bg-red-100 text-red-600',
  dark: 'bg-white/8 text-white',
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
