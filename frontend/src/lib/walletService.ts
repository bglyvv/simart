/**
 * WALLET SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `GET /api/wallet/donation-campaigns` (open, no token — just a catalog, same
 * shape as GET /api/habits/categories with no familyId) replaces
 * src/data/wallet.json's static `donations` list for every child, backend-
 * synced or not. `GET`/`POST .../balance`, `.../transactions`,
 * `.../donations`, `.../allowance` are child-ownership-gated and only ever
 * called for a backend-synced child — WalletPage.tsx's local-only path keeps
 * using the existing Zustand `balance`/`transactions`/`donate` store state
 * exactly as before. See backend/README.md's "Wallet" section.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface DonationCampaign {
  id: string;
  title: string;
  sponsor: string | null;
  xpCost: number;
  aznAmount: number;
  icon: string;
}

export interface WalletTransaction {
  id: string;
  title: string;
  direction: 'in' | 'out';
  amountAzn: number;
  occurredAt: string;
}

export interface DonationResult {
  transactionId: string;
  campaignTitle: string;
  xpCost: number;
  aznAmount: number;
  newBalanceAzn: number;
  /** The real-world partner (one of the two sponsor banks) behind this
   * campaign, if any — scans/types this to confirm the sponsor-matched
   * transfer actually happened. See backend/README.md's "Vouchers and
   * partners". */
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

export function fetchDonationCampaigns(): Promise<DonationCampaign[]> {
  return requestJson<DonationCampaign[]>('/api/wallet/donation-campaigns');
}

export function fetchWalletBalance(childId: string, token: string): Promise<number> {
  return requestJson<{ balanceAzn: number }>(`/api/wallet/children/${childId}/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.balanceAzn);
}

export function fetchWalletTransactions(childId: string, token: string, limit = 30): Promise<WalletTransaction[]> {
  return requestJson<WalletTransaction[]>(`/api/wallet/children/${childId}/transactions?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function donate(childId: string, campaignId: string, token: string): Promise<DonationResult> {
  return requestJson<DonationResult>(`/api/wallet/children/${childId}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ campaignId }),
  });
}

/** A parent manually crediting their own child's pocket money — SettingsPage.tsx. */
export function grantAllowance(childId: string, amountAzn: number, token: string): Promise<WalletTransaction> {
  return requestJson<WalletTransaction>(`/api/wallet/children/${childId}/allowance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amountAzn }),
  });
}
