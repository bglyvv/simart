/**
 * PARTNER SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `POST /api/partners/login`, `GET /api/partners/vouchers/{code}`,
 * `POST /api/partners/vouchers/{code}/fulfill` — see backend/README.md,
 * "Vouchers and partners". A partner only ever sees/fulfills vouchers tied
 * to their own Rewards/DonationCampaigns; the backend returns 403 for any
 * other partner's code, even one guessed correctly.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface PartnerLoginInput {
  email: string;
  password: string;
}

export interface PartnerAccount {
  partnerId: string;
  name: string;
  email: string;
  /** Send as `Authorization: Bearer {token}` on both voucher endpoints. */
  token: string;
}

export interface Voucher {
  id: string;
  code: string;
  childName: string;
  title: string;
  sourceType: 'reward_redemption' | 'donation';
  status: 'pending' | 'fulfilled';
  createdAt: string;
  fulfilledAt: string | null;
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

export function loginPartner(input: PartnerLoginInput): Promise<PartnerAccount> {
  return requestJson<PartnerAccount>('/api/partners/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function fetchVoucher(code: string, token: string): Promise<Voucher> {
  return requestJson<Voucher>(`/api/partners/vouchers/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function fulfillVoucher(code: string, token: string): Promise<Voucher> {
  return requestJson<Voucher>(`/api/partners/vouchers/${encodeURIComponent(code)}/fulfill`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Reward proposals — a partner proposing a new addition to the reward
 * catalog. See backend/README.md's "Reward proposals" for the full
 * accept/edit/approve/reject lifecycle. `Events` is the full history,
 * always included, oldest first.
 */
export interface RewardProposalEvent {
  eventType: 'submitted' | 'edited_by_admin' | 'accepted_by_admin' | 'declined_by_admin' | 'approved_by_partner' | 'rejected_by_partner' | 'published';
  actorType: 'partner' | 'admin';
  note: string | null;
  occurredAt: string;
}

export interface RewardProposal {
  id: string;
  partnerId: string;
  partnerName: string;
  title: string;
  description: string | null;
  costXp: number;
  icon: string;
  status: 'pending_admin_review' | 'admin_edited_pending_partner' | 'rejected_by_partner' | 'approved' | 'declined_by_admin';
  publishedRewardId: string | null;
  createdAt: string;
  updatedAt: string;
  events: RewardProposalEvent[];
}

export function submitRewardProposal(
  input: { title: string; description?: string; costXp: number; icon: string },
  token: string,
): Promise<RewardProposal> {
  return requestJson<RewardProposal>('/api/partners/reward-proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

/** This partner's own proposals, newest first. */
export function fetchPartnerRewardProposals(token: string): Promise<RewardProposal[]> {
  return requestJson<RewardProposal[]>('/api/partners/reward-proposals', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Signs off on the admin's edited terms — only valid while the proposal is
 * "admin_edited_pending_partner". Publishes immediately. */
export function approveRewardProposal(proposalId: string, token: string): Promise<RewardProposal> {
  return requestJson<RewardProposal>(`/api/partners/reward-proposals/${proposalId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Turns down the admin's edited terms — loops back for another admin look. */
export function rejectRewardProposal(proposalId: string, note: string | undefined, token: string): Promise<RewardProposal> {
  return requestJson<RewardProposal>(`/api/partners/reward-proposals/${proposalId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ note }),
  });
}
