import { useState, type ReactNode } from 'react';

/** A small, dependency-free accessible tooltip — shows on hover (mouse),
 * focus (keyboard), and tap (touch, via the click toggle), not hover-only.
 * `children` must be a single focusable/tappable element (a button or a
 * tabIndex={0} wrapper) so :focus-within and the click toggle both work. */
export default function Tooltip({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`group/tooltip relative inline-flex ${className}`}
      onClick={() => setOpen((v) => !v)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg bg-text-900 px-3 py-2 text-center text-caption font-semibold text-white opacity-0 transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${
          open ? 'opacity-100' : ''
        }`}
      >
        {label}
      </span>
    </span>
  );
}
