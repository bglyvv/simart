import { useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import ThemeFab from './ThemeFab';
import { useUiStore } from '../store/useUiStore';
import { useAppStore, useActiveChild } from '../store/useAppStore';
import { fetchChildXp } from '../lib/habitsService';
import { DEFAULT_THEME } from '../lib/themes';

/** Applies the active child's own chosen color theme (see src/lib/themes.ts
 * and index.css's [data-theme] blocks) to the whole document — every page
 * routes through AppShell, so this is the one place that needs to know
 * about theming at all. Forced back to DEFAULT_THEME while authedAsParent
 * is true, regardless of what the child has chosen — a parent always sees
 * the app's normal look (see ThemeFab's own doc comment for why this is a
 * child-only preference). */
function useApplyChildTheme() {
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const child = useActiveChild();
  const theme = authedAsParent ? DEFAULT_THEME : (child?.theme ?? DEFAULT_THEME);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}

/** Pages call this to wire Topbar's hamburger button to the mobile drawer.
 *  Backed by a plain external store (not React context) so it works no matter
 *  where in the tree it's called from, including in the page component that
 *  renders <AppShell> itself. */
export function useOpenMobileMenu() {
  return useUiStore((s) => s.openMobileMenu);
}

/** Runs once per active backend-synced child (every login, every child
 * switch) and overwrites the local xp display with the real ledger total —
 * see useAppStore's syncXp doc comment for why this exists. Lives in
 * AppShell rather than on any one page so every family screen's XP display
 * (and, more importantly, every spend attempt's "can I afford it" check)
 * reads the real number, not whichever page happened to fetch it last. */
function useSyncXp() {
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const syncXp = useAppStore((s) => s.syncXp);
  const childId = child?.childId;
  const token = parent?.token;

  useEffect(() => {
    if (!childId || !token) return;
    let cancelled = false;
    fetchChildXp(childId, token)
      .then((totalXp) => {
        if (!cancelled) syncXp(totalXp);
      })
      .catch((err) => console.error('XP sinxronlaşdırıla bilmədi:', err));
    return () => {
      cancelled = true;
    };
  }, [childId, token, syncXp]);
}

/** Shared, fully responsive shell for the dashboard-style screens: a persistent
 *  sidebar on tablet/desktop, a slide-over drawer on mobile, and a scrollable
 *  main column that fills whatever space remains. */
export default function AppShell({ children }: { children: ReactNode }) {
  const mobileOpen = useUiStore((s) => s.mobileMenuOpen);
  const closeMobileMenu = useUiStore((s) => s.closeMobileMenu);
  useSyncXp();
  useApplyChildTheme();

  return (
    <div className="flex min-h-screen w-full bg-bg md:h-screen md:overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobileMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-bg pb-16 md:h-screen md:overflow-y-auto md:pb-0">{children}</div>
      <BottomNav />
      <ThemeFab />
    </div>
  );
}
