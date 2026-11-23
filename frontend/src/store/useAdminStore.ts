import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminProfile {
  name: string;
  email: string;
  /** Send as `Authorization: Bearer {token}` on content sync, habit catalog
   * writes, and the family directory — see adminService.ts. */
  token: string;
}

interface AdminState {
  admin: AdminProfile | null;
  authedAsAdmin: boolean;
  setAdmin: (admin: AdminProfile) => void;
  logoutAdmin: () => void;
}

/**
 * Pure state setters only — same split as useAppStore: the actual
 * `POST /api/admin/login` call and its error handling live in
 * AdminLoginPage.tsx (via adminService.ts's `loginAdmin`), not here. Real
 * backend auth now: the Admin table is seeded idempotently at every backend
 * startup (see Program.cs — survives a database reset) — there's no
 * self-service admin signup, by design.
 */
export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      authedAsAdmin: false,

      setAdmin: (admin) => set({ admin, authedAsAdmin: true }),
      logoutAdmin: () => set({ admin: null, authedAsAdmin: false }),
    }),
    {
      name: 'simart-admin-state',
      // Bumped from 1 -> 2: AdminProfile gained `token` (the bearer token real
      // admin login now issues) — a version bump safely discards a stale,
      // token-less cached session instead of crashing on the shape mismatch.
      version: 2,
    },
  ),
);
