import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useUiStore } from '../store/useUiStore';

/** Pages call this to wire Topbar's hamburger button to the mobile drawer.
 *  Backed by a plain external store (not React context) so it works no matter
 *  where in the tree it's called from, including in the page component that
 *  renders <AppShell> itself. */
export function useOpenMobileMenu() {
  return useUiStore((s) => s.openMobileMenu);
}

/** Shared, fully responsive shell for the dashboard-style screens: a persistent
 *  sidebar on tablet/desktop, a slide-over drawer on mobile, and a scrollable
 *  main column that fills whatever space remains. */
export default function AppShell({ children }: { children: ReactNode }) {
  const mobileOpen = useUiStore((s) => s.mobileMenuOpen);
  const closeMobileMenu = useUiStore((s) => s.closeMobileMenu);

  return (
    <div className="flex min-h-screen w-full bg-bg md:h-screen md:overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobileMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-bg md:h-screen md:overflow-y-auto">{children}</div>
    </div>
  );
}
