import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

// 'glass-light'/'glass-dark' were dead variants (defined, never used anywhere
// in a page) — dropped as part of the premium redesign rather than carried
// forward, since glassmorphism doesn't fit the minimal/flat direction.
type Variant = 'solid' | 'soft';

const VARIANT_CLASSES: Record<Variant, string> = {
  solid: 'bg-surface border border-border shadow-soft',
  soft: 'bg-surface-alt border border-border-soft',
};

/** Tailwind resolves two same-property utility classes on one element by
 *  their order in the *generated stylesheet*, not by their order in the
 *  className string — so a caller passing e.g. `className="bg-primary"` to
 *  override this card's own `bg-surface` is not reliably guaranteed to win.
 *  Stripping the variant's own bg-* utility whenever the caller supplies one
 *  avoids the conflict outright instead of depending on cascade order. */
function resolveVariantClass(variant: Variant, callerClassName: string): string {
  const base = VARIANT_CLASSES[variant];
  if (!/\bbg-\S+/.test(callerClassName)) return base;
  return base.replace(/\bbg-\S+/g, '').trim();
}

export default function Card({
  children,
  className = '',
  padding = 'lg',
  variant = 'solid',
  interactive = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  padding?: 'lg' | 'md' | 'sm' | 'none';
  variant?: Variant;
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const pad = { lg: 'p-6 sm:p-8', md: 'p-5 sm:p-6', sm: 'p-4', none: '' }[padding];
  const variantClass = resolveVariantClass(variant, className);

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'tween', duration: 0.15 }}
        className={`rounded-md ${pad} ${variantClass} ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`rounded-md ${pad} ${variantClass} ${className}`} {...rest}>
      {children}
    </div>
  );
}
