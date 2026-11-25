/**
 * IDENTITY SERVICE — backed by the real SimartBackend.Api
 * ---------------------------------------------------------
 * `POST /api/identity/signup`, `POST /api/identity/login`,
 * `POST /api/identity/families/{id}/children`, and
 * `GET /api/identity/families/{id}/children`, served by
 * `backend/src/SimartBackend.Api` (see backend/README.md — "Identity (account
 * creation + login)"). Signup auto-issues a bearer token (no separate login call
 * needed right after creating an account); `addChildAccount`/`fetchFamilyChildren`
 * both require that token — the backend checks it's for the same familyId being
 * read/written. No refresh-token flow, so a token is only ever good for the 7 days
 * the backend issues it for.
 *
 * `LoginPage.tsx` calls `loginFamily` then `fetchFamilyChildren` to restore which
 * child profile(s) belong to a returning parent on a device with nothing cached
 * locally — login alone only ever returns family/parent info, never children.
 *
 * SignupPage also sets the local PIN gate (useAppStore.setPin) directly from what
 * the user just entered — that's a separate, unrelated bridge for
 * FamilyGatePage's local PIN check, not real verification against the backend.
 * LoginPage can't do the same (login verifies the password, not the PIN — there's
 * no PIN-verify endpoint), so a returning parent's local `pin` stays whatever was
 * already cached on that device (or the '1234' default on a brand-new one).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface SignUpFamilyInput {
  fullName: string;
  email: string;
  password: string;
  pin: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface FamilyAccount {
  familyId: string;
  parentId: string;
  fullName: string;
  email: string;
  /** Send as `Authorization: Bearer {token}` — required by addChildAccount. */
  token: string;
}

export interface AddChildInput {
  familyId: string;
  name: string;
  avatarEmoji: string;
  gender: 'boy' | 'girl';
  /** ISO 'YYYY-MM-DD' */
  dateOfBirth: string;
  city: string;
}

export interface ChildAccount {
  childId: string;
  familyId: string;
  name: string;
  avatarEmoji: string;
  gender: string;
  dateOfBirth: string;
  city: string;
  /** Whether a parent has set a PIN for this child — never the PIN itself.
   * Gates one sibling switching into another's account; see
   * verifyChildPin/setChildPin below. */
  hasPin: boolean;
}

async function postJson<TResult>(path: string, body: unknown, token?: string): Promise<TResult> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(new URL(path, API_BASE_URL), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${path} failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TResult;
}

/** For ForgotPassword/ResetPassword/ChangePin — all return 204 No Content on
 * success, no body to parse (postJson would throw trying to parse an empty
 * response). */
async function postVoid(path: string, body: unknown, token?: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(new URL(path, API_BASE_URL), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${path} failed: ${response.status} ${response.statusText}`);
  }
}

export function signUpFamily(input: SignUpFamilyInput): Promise<FamilyAccount> {
  return postJson('/api/identity/signup', input);
}

export function loginFamily(input: LoginInput): Promise<FamilyAccount> {
  return postJson('/api/identity/login', input);
}

export function addChildAccount(input: AddChildInput, token: string): Promise<ChildAccount> {
  const { familyId, ...body } = input;
  return postJson(`/api/identity/families/${familyId}/children`, body, token);
}

/** POST /api/identity/forgot-password — always resolves, whether or not the email
 * matches a real account (the backend never reveals which — see
 * ForgotPasswordCommandHandler's doc comment). If it does, a reset email goes out
 * via Resend; the frontend should show the same generic message regardless. */
export function forgotPassword(email: string): Promise<void> {
  return postVoid('/api/identity/forgot-password', { email });
}

/** POST /api/identity/reset-password — token comes from the link in the reset
 * email (`?token=` on ResetPasswordPage's route). Throws if the token is
 * missing/expired/already used — same message for all three, so this can't be
 * used to probe which case occurred. */
export function resetPassword(token: string, newPassword: string): Promise<void> {
  return postVoid('/api/identity/reset-password', { token, newPassword });
}

/** POST /api/identity/verify-pin — checks the supplied PIN against the caller's
 * own backend-stored hash (the token's own subject, never a parentId the
 * caller passes in). A plain true/false answer, not a 401/403 on a wrong
 * PIN — the bearer token alone already proves "this session is this parent";
 * what's being checked is "do they currently know the PIN." */
export async function verifyPin(pin: string, token: string): Promise<boolean> {
  const result = await postJson<{ valid: boolean }>('/api/identity/verify-pin', { pin }, token);
  return result.valid;
}

/** POST /api/identity/change-pin — requires the current PIN (re-verified
 * server-side before anything is written) alongside the new one. Throws with
 * an English backend message on a wrong current PIN or a malformed new one
 * (not exactly 4 digits) — same known-substring-to-Azerbaijani mapping
 * pattern as every other backend error surfaced in this app's UI. */
export function changePin(currentPin: string, newPin: string, token: string): Promise<void> {
  return postVoid('/api/identity/change-pin', { currentPin, newPin }, token);
}

/** POST /api/identity/children/{childId}/verify-pin — checks a child's own,
 * optional PIN (gates one sibling switching into another's account; see
 * Child.PinHash's doc comment in the backend). A plain true/false answer,
 * same posture as verifyPin above — this isn't itself a 401/403 boundary,
 * the bearer token (any family member's session) already proves "this is a
 * legitimate attempt to use this family's app." Resolves true when the
 * target child has no PIN set at all. */
export async function verifyChildPin(childId: string, pin: string, token: string): Promise<boolean> {
  const result = await postJson<{ valid: boolean }>(`/api/identity/children/${childId}/verify-pin`, { pin }, token);
  return result.valid;
}

/** POST /api/identity/children/{childId}/set-pin — a parent setting (or,
 * with newPin null, clearing) their own child's PIN directly; unlike
 * changePin there's no "current PIN" to prove first, since the parent
 * administers this on the child's behalf. */
export function setChildPin(childId: string, newPin: string | null, token: string): Promise<void> {
  return postVoid(`/api/identity/children/${childId}/set-pin`, { newPin }, token);
}

export interface ChildProfileChangeRequest {
  id: string;
  childId: string;
  currentName: string;
  newName: string;
  newAvatarEmoji: string;
  status: string;
  requestedAt: string;
}

/** POST /api/identity/children/{childId}/profile-change-requests — a child
 * proposing their own new name/avatar. Never applied immediately; held
 * pending until a parent approves/rejects it via the two endpoints below.
 * Throws (409) if that child already has one pending. */
export function requestProfileChange(
  childId: string,
  newName: string,
  newAvatarEmoji: string,
  token: string,
): Promise<ChildProfileChangeRequest> {
  return postJson(`/api/identity/children/${childId}/profile-change-requests`, { newName, newAvatarEmoji }, token);
}

/** GET /api/identity/children/{childId}/profile-change-requests/pending — a
 * child's own "is my request still pending" check. Resolves null (204) when
 * there's nothing outstanding. */
export async function fetchPendingProfileChangeRequest(
  childId: string,
  token: string,
): Promise<ChildProfileChangeRequest | null> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL(`/api/identity/children/${childId}/profile-change-requests/pending`, API_BASE_URL), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 204) return null;
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `GET pending profile change failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ChildProfileChangeRequest;
}

/** GET /api/identity/families/{familyId}/profile-change-requests/pending —
 * the parent's own review queue, every pending request across the family's
 * children. */
export async function fetchPendingProfileChangeRequests(
  familyId: string,
  token: string,
): Promise<ChildProfileChangeRequest[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL(`/api/identity/families/${familyId}/profile-change-requests/pending`, API_BASE_URL), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `GET pending profile change requests failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ChildProfileChangeRequest[];
}

/** POST /api/identity/profile-change-requests/{requestId}/approve — applies
 * the request's new name/avatar to the child and marks it resolved. */
export function approveProfileChangeRequest(requestId: string, token: string): Promise<void> {
  return postVoid(`/api/identity/profile-change-requests/${requestId}/approve`, {}, token);
}

/** POST /api/identity/profile-change-requests/{requestId}/reject — marks
 * the request resolved without changing the child. */
export function rejectProfileChangeRequest(requestId: string, token: string): Promise<void> {
  return postVoid(`/api/identity/profile-change-requests/${requestId}/reject`, {}, token);
}

export async function fetchFamilyChildren(familyId: string, token: string): Promise<ChildAccount[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL(`/api/identity/families/${familyId}/children`, API_BASE_URL), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `GET children failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ChildAccount[];
}
