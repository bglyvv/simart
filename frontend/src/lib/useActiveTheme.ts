import { useAppStore, useActiveChild } from '../store/useAppStore';
import { DEFAULT_THEME, ILLUSTRATED_THEME } from './themes';

/** The theme the app is showing right now: the active child's own pick, or
 * DEFAULT_THEME while a parent has unlocked the dashboard (a parent always
 * sees the normal look — see ThemeFab's doc comment). */
export function useActiveThemeId(): string {
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const child = useActiveChild();
  return authedAsParent ? DEFAULT_THEME : (child?.theme ?? DEFAULT_THEME);
}

/** True when the "İllüstrasiyalı" theme is active — pages use it to swap in
 * the PDF mockups' real artwork (see components/illustrations/ThemeArt.tsx). */
export function useIsIllustratedTheme(): boolean {
  return useActiveThemeId() === ILLUSTRATED_THEME;
}
