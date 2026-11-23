/**
 * ADMIN SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `POST /api/admin/login` and `GET /api/admin/families` (see backend/README.md
 * — "Admin auth"). The account directory and every admin-only write
 * (content sync, habit catalog writes) now require the bearer token login
 * returns — the backend rejects a request with no token, or a family
 * parent's token, with 401/403 the same way the family-ownership checks do.
 * There's deliberately no `signUpAdmin` here — unlike Parent, admin accounts
 * have no public signup; see Program.cs's startup-seeding comment on the
 * backend for why.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminAccount {
  adminId: string;
  fullName: string;
  email: string;
  /** Send as `Authorization: Bearer {token}` on every other admin-only call. */
  token: string;
}

export async function loginAdmin(input: AdminLoginInput): Promise<AdminAccount> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/admin/login', API_BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST /api/admin/login failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as AdminAccount;
}

export interface FamilyParentSummary {
  parentId: string;
  fullName: string;
  email: string;
}

export interface FamilyChildSummary {
  childId: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  city: string;
}

export interface FamilySummary {
  familyId: string;
  createdAt: string;
  parents: FamilyParentSummary[];
  children: FamilyChildSummary[];
  /** Set only on a row returned by fetchDeactivatedFamilies — null on the
   * active directory. */
  deactivatedAt: string | null;
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

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL(path, API_BASE_URL), init);
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `${init?.method ?? 'GET'} ${path} failed: ${response.status} ${response.statusText}`);
  }
}

export function fetchFamilies(token: string): Promise<FamilySummary[]> {
  return requestJson<FamilySummary[]>('/api/admin/families', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** GET /api/admin/families/deactivated — backs AdminAccountsPage.tsx's
 * "Deaktiv edilmiş" tab. */
export function fetchDeactivatedFamilies(token: string): Promise<FamilySummary[]> {
  return requestJson<FamilySummary[]>('/api/admin/families/deactivated', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Cascades onto every parent/child under the family (see backend/README.md,
 * "Admin account management") — soft-delete, undone by reactivateFamily. */
export function deactivateFamily(familyId: string, token: string): Promise<void> {
  return requestVoid(`/api/admin/families/${familyId}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function reactivateFamily(familyId: string, token: string): Promise<void> {
  return requestVoid(`/api/admin/families/${familyId}/reactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Admin edit — a parent's display name only, never email or password. */
export function updateParent(parentId: string, fullName: string, token: string): Promise<void> {
  return requestVoid(`/api/admin/parents/${parentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fullName }),
  });
}

/** Admin edit — a child's name and city only. */
export function updateChild(childId: string, name: string, city: string, token: string): Promise<void> {
  return requestVoid(`/api/admin/children/${childId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, city }),
  });
}

/**
 * Reward proposals — "partner can create something that can be redeemed
 * using XP, admin should accept it; admin can also edit it, which sends it
 * back to the partner's panel; once they approve it, it's public." See
 * backend/README.md's "Reward proposals". `Events` is the full history —
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

/** GET /api/admin/reward-proposals[?status=] — the admin review queue,
 * every partner's proposals, newest first. */
export function fetchAdminRewardProposals(token: string, status?: string): Promise<RewardProposal[]> {
  const url = status ? `/api/admin/reward-proposals?status=${status}` : '/api/admin/reward-proposals';
  return requestJson<RewardProposal[]>(url, { headers: { Authorization: `Bearer ${token}` } });
}

/** Accepts a proposal's terms exactly as submitted — publishes immediately. */
export function acceptRewardProposal(proposalId: string, token: string): Promise<RewardProposal> {
  return requestJson<RewardProposal>(`/api/admin/reward-proposals/${proposalId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Changes the proposed terms — sends it to the partner's own panel for
 * them to approve or reject the new terms before it can go public. */
export function editRewardProposal(
  proposalId: string,
  input: { title: string; description?: string; costXp: number; icon: string },
  token: string,
): Promise<RewardProposal> {
  return requestJson<RewardProposal>(`/api/admin/reward-proposals/${proposalId}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

/** Turns a proposal down outright — terminal, unlike a partner rejecting an edit. */
export function declineRewardProposal(proposalId: string, note: string | undefined, token: string): Promise<RewardProposal> {
  return requestJson<RewardProposal>(`/api/admin/reward-proposals/${proposalId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ note }),
  });
}
