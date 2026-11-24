import type { ReactNode } from 'react';
import { TINT_BG, TINT_TEXT } from './colors';

export default function IconTile({
  icon,
  tint,
  size = 'md',
  rounded = 'md',
}: {
  icon: ReactNode;
  tint: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'full';
}) {
  const sizeClass = {
    sm: 'size-9 text-base',
    md: 'size-11 text-lg',
    lg: 'size-[52px] text-2xl',
    xl: 'size-16 text-3xl',
  }[size];
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    full: 'rounded-full',
  }[rounded];
  const bg = TINT_BG[tint] ?? 'bg-surface-alt';
  // Lucide glyphs use currentColor, so give the tile a matching text tone;
  // emoji content ignores `color` entirely, so this is a no-op for those call sites.
  const text = TINT_TEXT[tint] ?? 'text-text-700';

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${sizeClass} ${roundedClass} ${bg} ${text}`}
    >
      {icon}
    </div>
  );
}
