import { useIsIllustratedTheme } from '../../lib/useActiveTheme';
import { THEME_ART, type ThemeArtName } from './themeArtAssets';

/** Renders the named artwork only while the illustrated theme is active —
 * every other theme keeps its existing look, so this renders nothing. */
export default function ThemeArt({ name, className = '' }: { name: ThemeArtName; className?: string }) {
  const illustrated = useIsIllustratedTheme();
  if (!illustrated) return null;
  return <img src={THEME_ART[name]} alt="" aria-hidden="true" draggable={false} className={`select-none ${className}`} />;
}
