import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import { useUiStore } from '../store/useUiStore';

/** Admin pages call this to wire Topbar's hamburger button to the mobile drawer —
 *  same useUiStore as the family-facing AppShell (it's generic, no family data in it),
 *  mirrored here only so admin pages don't have to know that detail. */
export function useOpenMobileMenu() {
  return useUiStore((s) => s.openMobileMenu);
}

/** Admin-only counterpart to AppShell — same responsive layout (persistent sidebar on
 *  tablet/desktop, slide-over drawer on mobile), but with AdminSidebar instead of the
 *  family-facing Sidebar. Kept as a separate component rather than parameterizing
 *  AppShell, since admin and family are different personas with no shared nav/state. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const mobileOpen = useUiStore((s) => s.mobileMenuOpen);
  const closeMobileMenu = useUiStore((s) => s.closeMobileMenu);

  return (
    <div className="flex min-h-screen w-full bg-bg md:h-screen md:overflow-hidden">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={closeMobileMenu} />
      <div className="flex min-w-0 flex-1 flex-col bg-bg md:h-screen md:overflow-y-auto">{children}</div>
    </div>
  );
}
