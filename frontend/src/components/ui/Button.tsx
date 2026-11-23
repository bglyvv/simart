import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'success' | 'outline' | 'white' | 'ghost' | 'sunset' | 'danger';

/** framer-motion's event prop types collide with the native DOM ones for these keys. */
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-grad-primary text-white shadow-purple',
  secondary: 'bg-grad-blue text-white shadow-[0_10px_24px_-4px_rgba(42,117,211,0.35)]',
  success: 'bg-green-600 text-white shadow-green',
  outline: 'border-2 border-border text-text-700 bg-white',
  white: 'bg-white text-purple-700',
  ghost: 'bg-transparent text-text-700 hover:bg-surface-alt',
  sunset: 'bg-grad-sunset text-white shadow-[0_10px_24px_-4px_rgba(255,135,135,0.4)]',
  danger: 'bg-red-600 text-white shadow-[0_10px_24px_-4px_rgba(239,68,68,0.35)]',
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
    sm: 'h-10 px-4 text-body-sm rounded-xl gap-1.5',
    md: 'h-13 px-6 text-body-lg rounded-2xl gap-2',
    lg: 'h-15 px-8 text-lg rounded-2xl gap-2.5',
  }[size];

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass} ${VARIANT_CLASSES[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
