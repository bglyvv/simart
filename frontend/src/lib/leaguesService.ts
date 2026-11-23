/**
 * LEAGUES SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `GET /api/leagues/children/{childId}/rewards`,
 * `POST /api/leagues/children/{childId}/rewards/{rewardId}/redeem`,
 * `GET /api/leagues/pending-redemptions?familyId=`,
 * `POST /api/leagues/redemptions/{id}/approve`,
 * `POST /api/leagues/redemptions/{id}/reject` — see backend/README.md,
 * "Leagues". Redeeming debits XP immediately and creates a "pending" row;
 * a parent then approves (no further change) or rejects (XP refunded) from
 * SettingsPage.tsx.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  costXp: number;
  sponsor: string | null;
  icon: string;
  /** This child's most recent attempt at this reward — null if never tried.
   * "rejected" still lets them try again (the backend allows it; see
   * RewardAlreadyRedeemedException's doc comment server-side). */
  redemptionStatus: 'pending' | 'approved' | 'rejected' | null;
}

export interface RewardRedemption {
  id: string;
  childId: string;
  childName: string;
  rewardId: string;
  rewardTitle: string;
  costXp: number;
  status: 'pending' | 'approved' | 'rejected';
  redeemedAt: string;
  /** Only ever set on the response straight from `redeemReward` itself —
   * the real-world partner (the bookstore, the ice cream shop, ...) behind
   * this reward, if any, scans/types this to hand it over once a parent
   * approves. Undefined everywhere else (the pending list, approve/reject)
   * — a parent doesn't need to see the QR code, only the child who just
   * redeemed does. See backend/README.md's "Vouchers and partners". */
  voucherCode?: string;
}

async function requestJson<TResult>(path: string, init?: RequestInit): Promise<TResult> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL(path, API_BASE_URL), init);
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `${init?.method ?? 'GET'} ${path} failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TResult;
}

export function fetchRewards(childId: string, token: string): Promise<Reward[]> {
  return requestJson<Reward[]>(`/api/leagues/children/${childId}/rewards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function redeemReward(childId: string, rewardId: string, token: string): Promise<RewardRedemption> {
  return requestJson<RewardRedemption>(`/api/leagues/children/${childId}/rewards/${rewardId}/redeem`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function fetchPendingRedemptions(familyId: string, token: string): Promise<RewardRedemption[]> {
  return requestJson<RewardRedemption[]>(`/api/leagues/pending-redemptions?familyId=${familyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function approveRedemption(redemptionId: string, token: string): Promise<RewardRedemption> {
  return requestJson<RewardRedemption>(`/api/leagues/redemptions/${redemptionId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function rejectRedemption(redemptionId: string, token: string): Promise<RewardRedemption> {
  return requestJson<RewardRedemption>(`/api/leagues/redemptions/${redemptionId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
