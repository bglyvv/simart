import { useIsIllustratedTheme } from '../../lib/useActiveTheme';
import { AVATAR_ART } from './themeArtAssets';

/** A child's avatar emoji — drawn as the matching illustrated animal under
 * the "İllüstrasiyalı" theme (filling its round container), otherwise the
 * emoji itself, exactly as before. */
export default function ThemeAvatar({ emoji }: { emoji: string }) {
  const illustrated = useIsIllustratedTheme();
  const art = illustrated ? AVATAR_ART[emoji] : undefined;
  if (!art) return <>{emoji}</>;
  return <img src={art} alt="" aria-hidden="true" draggable={false} className="size-full rounded-full object-cover" />;
}
