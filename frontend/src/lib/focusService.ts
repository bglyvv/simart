/**
 * FOCUS SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `POST /api/focus/children/{childId}/lock` (start a lock — AnimationsPage.tsx
 * calls this once a child completes 2 videos in a day) and
 * `GET /api/focus/children/{childId}/lock/active` (FocusModePage.tsx reads this
 * back so the countdown survives a reload or a different device, instead of
 * living only in local Zustand state). See backend/README.md — "Focus Mode".
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface FocusLock {
  id: string;
  childId: string;
  startedAt: string;
  lockedUntil: string;
  minutes: number;
  triggerReason: string;
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

/** For GET .../lock/active — 204 No Content (no active lock) is a valid,
 * expected result, not an error, so it maps to null rather than throwing. */
async function requestJsonOrNull<TResult>(path: string, init?: RequestInit): Promise<TResult | null> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL(path, API_BASE_URL), init);
  if (response.status === 204) return null;
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `GET ${path} failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TResult;
}

export function startFocusLock(childId: string, minutes: number, reason: string, token: string): Promise<FocusLock> {
  return requestJson<FocusLock>(`/api/focus/children/${childId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ minutes, reason }),
  });
}

export function fetchActiveFocusLock(childId: string, token: string): Promise<FocusLock | null> {
  return requestJsonOrNull<FocusLock>(`/api/focus/children/${childId}/lock/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface ScreenTime {
  date: string;
  totalSeconds: number;
}

/** POST /api/focus/children/{childId}/screen-time — adds a small positive delta
 * (real elapsed playback seconds, capped at 300/call server-side) to that day's
 * cumulative total and returns the new running total. A genuinely separate
 * concept from a focus lock — see the comment above this endpoint in
 * Program.cs. Family bearer token required. */
export function addScreenTime(childId: string, date: string, secondsDelta: number, token: string): Promise<ScreenTime> {
  return requestJson<ScreenTime>(`/api/focus/children/${childId}/screen-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ date, secondsDelta }),
  });
}

/** GET /api/focus/children/{childId}/screen-time?date=YYYY-MM-DD — reads that
 * day's cumulative total. HabitsPage.tsx's "Bugünkü ekran vaxtı" stat. Family
 * bearer token required. */
export function fetchScreenTime(childId: string, date: string, token: string): Promise<ScreenTime> {
  return requestJson<ScreenTime>(`/api/focus/children/${childId}/screen-time?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
