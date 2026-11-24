import logoLight from '../assets/simart-logo.png';
import logoDark from '../assets/simart-logo-on-dark.png';

/** The official SİMART wordmark, on its own transparent background. Two
 * color variants of the same mark — "SM" is plum on the `light` asset
 * (readable on the app's white/light sidebars and shells) and white on the
 * `dark` one (readable on the plum-colored auth/login hero panels, where
 * the light variant's plum "SM" would blend straight into the backdrop).
 * "ART" and the star icon are identical, untouched orange in both. */
export default function LogoMark({ height = 36, variant = 'light' }: { height?: number; variant?: 'light' | 'dark' }) {
  return (
    <img
      src={variant === 'dark' ? logoDark : logoLight}
      alt="SİMART"
      style={{ height }}
      className="block w-auto shrink-0"
    />
  );
}
