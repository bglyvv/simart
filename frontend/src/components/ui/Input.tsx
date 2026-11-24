import { forwardRef, type InputHTMLAttributes } from 'react';

/** Shared text input: white background, neutral border, 10px radius, clear
 *  focus state — DESIGN_SYSTEM.md §5 Inputs. Replaces the ad hoc
 *  `border-2 ... focus:border-purple-600` className every auth/form page
 *  used to repeat individually. */
const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => (
    <input
      ref={ref}
      className={`h-12 w-full rounded-sm border border-border bg-surface px-4 text-body text-text-900 outline-none transition-colors placeholder:text-text-400 focus:border-primary ${className}`}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export default Input;
