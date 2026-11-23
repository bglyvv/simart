import type { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

type Variant = 'solid' | 'soft' | 'glass-light' | 'glass-dark';

const VARIANT_CLASSES: Record<Variant, string> = {
  solid: 'bg-surface border border-border-soft shadow-soft',
  soft: 'bg-surface-alt border border-border-soft',
  'glass-light': 'glass-light',
  'glass-dark': 'glass-dark text-white',
};

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

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={`rounded-xl ${pad} ${VARIANT_CLASSES[variant]} ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`rounded-xl ${pad} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
