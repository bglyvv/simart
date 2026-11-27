import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore, useActiveChild } from '../store/useAppStore';
import { useAdminStore } from '../store/useAdminStore';
import { usePartnerStore } from '../store/usePartnerStore';
import { fetchActiveFocusLock } from '../lib/focusService';
import LandingPage from '../pages/LandingPage';
import { appEntryPath } from '../lib/appEntry';

/** Routes that need a created family profile (the "kid app" + analytics/settings).
 *  Checks `parent` first, not just whether any child exists (a real gap before
 *  this: a parent with no child yet got bounced to signup instead of
 *  add-child) — same two-step logic as RootRedirect below, now applied
 *  consistently at every entry point. */
export function RequireFamily({ children }: { children: ReactNode }) {
  const parent = useAppStore((s) => s.parent);
  const childCount = useAppStore((s) => s.children.length);
  if (!parent) return <Navigate to="/giris" replace />;
  if (childCount === 0) return <Navigate to="/usaq-elave-et" replace />;
  return <>{children}</>;
}

/** Routes gated behind the parent PIN (analytics, settings). */
export function RequireParentAuth({ children }: { children: ReactNode }) {
  const parent = useAppStore((s) => s.parent);
  const childCount = useAppStore((s) => s.children.length);
  const authed = useAppStore((s) => s.authedAsParent);
  if (!parent) return <Navigate to="/giris" replace />;
  if (childCount === 0) return <Navigate to="/usaq-elave-et" replace />;
  if (!authed) return <Navigate to="/aile-qapisi" replace />;
  return <>{children}</>;
}

/** Gates `/animasiya` behind an active focus lock (the "2 video limit reached"
 *  cooldown) — a real, pre-existing gap before this: nothing ever actually
 *  stopped a child from navigating straight back to the player mid-lock, the
 *  countdown on FocusModePage was purely cosmetic. For a backend-synced child,
 *  checks the real lock (GET .../lock/active) so it can't be bypassed by just
 *  clearing localStorage; for a local-only child (no backend account), checks
 *  the active child's own local `focusLockUntil` the same way FocusModePage
 *  already did. */
export function RequireNotFocusLocked({ children }: { children: ReactNode }) {
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const syncFocusLockUntil = useAppStore((s) => s.syncFocusLockUntil);
  const useBackend = !!(parent?.familyId && child?.childId);
  const [checked, setChecked] = useState(!useBackend);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!useBackend || !parent || !child?.childId) return;
    let cancelled = false;
    fetchActiveFocusLock(child.childId, parent.token)
      .then((lock) => {
        if (cancelled) return;
        syncFocusLockUntil(lock ? new Date(lock.lockedUntil).getTime() : null);
        setChecked(true);
      })
      .catch((err) => {
        // Backend unreachable — fail open rather than stranding the child
        // behind a check that can never resolve; any local focusLockUntil
        // still applies below regardless.
        console.error('Fokus kilidi yoxlanıla bilmədi:', err);
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [useBackend, parent?.familyId, child?.childId]);

  if (!checked) return null;

  const isLocked = !!child && child.focusLockUntil !== null && child.focusLockUntil > Date.now();
  if (isLocked) return <Navigate to="/focus-mode" replace />;
  return <>{children}</>;
}

/** Gates the admin panel — a separate persona/store from the family side (see
 *  useAdminStore's doc comment: local-only demo auth, no backend admin login yet). */
export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const authedAsAdmin = useAdminStore((s) => s.authedAsAdmin);
  if (!authedAsAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

/** Gates the partner panel — a separate persona/store from both the family
 *  and admin sides (see usePartnerStore). */
export function RequirePartnerAuth({ children }: { children: ReactNode }) {
  const authedAsPartner = usePartnerStore((s) => s.authedAsPartner);
  if (!authedAsPartner) return <Navigate to="/partners/login" replace />;
  return <>{children}</>;
}

/** Unknown paths ("*"): a logged-in family goes into the app, anyone else gets
 *  the public landing page. "/" itself always renders LandingPage (see App.tsx)
 *  — a logged-in family can still visit it, and its "Daxil ol" button takes
 *  them straight into the app instead of to the login form. */
export function RootRedirect() {
  const parent = useAppStore((s) => s.parent);
  const childCount = useAppStore((s) => s.children.length);
  const entry = appEntryPath(!!parent, childCount);
  if (!entry) return <LandingPage />;
  return <Navigate to={entry} replace />;
}
