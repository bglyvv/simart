import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'success' | 'outline' | 'white' | 'ghost' | 'danger';

/** framer-motion's event prop types collide with the native DOM ones for these keys. */
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

// Premium redesign: primary (black/white solid), secondary (white/bordered)
// and ghost (text-only) are the spec's 3-tier button system; outline/white/
// success/danger are semantic variants layered on top for contexts the
// generic 3-tier system doesn't cover (confirmations, destructive actions,
// buttons on a dark/accent background). See new_design/DESIGN_SYSTEM.md §5.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-soft hover:brightness-95',
  secondary: 'bg-white text-text-900 border border-border hover:bg-surface-alt',
  success: 'bg-success text-white shadow-soft hover:brightness-95',
  outline: 'border border-border text-text-700 bg-transparent hover:bg-surface-alt',
  white: 'bg-white text-primary hover:bg-surface-alt',
  ghost: 'bg-transparent text-text-700 hover:bg-surface-alt',
  danger: 'bg-error text-white shadow-soft hover:brightness-95',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  children,
  className = '',
  disabled,
  ...rest
}: {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  children: ReactNode;
  className?: string;
} & NativeButtonProps) {
  const sizeClass = {
    // h-11 = 44px, the spec's minimum touch target even for the "sm" size.
    sm: 'h-11 px-4 text-body-sm rounded-sm gap-1.5',
    md: 'h-13 px-6 text-body-lg rounded-sm gap-2',
    lg: 'h-15 px-8 text-lg rounded-sm gap-2.5',
  }[size];

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.01, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'tween', duration: 0.15 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${sizeClass} ${VARIANT_CLASSES[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
