import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PartnerProfile {
  name: string;
  email: string;
  /** Send as `Authorization: Bearer {token}` on both voucher endpoints —
   * see partnerService.ts. */
  token: string;
}

interface PartnerState {
  partner: PartnerProfile | null;
  authedAsPartner: boolean;
  setPartner: (partner: PartnerProfile) => void;
  logoutPartner: () => void;
}

/**
 * Pure state setters only — same split as useAdminStore: the actual
 * `POST /api/partners/login` call and its error handling live in
 * PartnerLoginPage.tsx (via partnerService.ts's `loginPartner`), not here.
 * Six demo accounts are seeded idempotently at every backend startup (see
 * Program.cs) — there's no self-service partner signup, by design.
 */
export const usePartnerStore = create<PartnerState>()(
  persist(
    (set) => ({
      partner: null,
      authedAsPartner: false,

      setPartner: (partner) => set({ partner, authedAsPartner: true }),
      logoutPartner: () => set({ partner: null, authedAsPartner: false }),
    }),
    {
      name: 'simart-partner-state',
      version: 1,
    },
  ),
);
