/**
 * HABITS SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `GET /api/habits/categories`, `POST /api/habits/categories`,
 * `POST /api/habits/categories/{id}/tasks` (admin catalog management — see
 * backend/README.md), plus the family-facing additions:
 * `POST /api/habits/families/{familyId}/tasks` (a parent creating their own
 * custom habit, capped at MAX_FAMILY_TASKS per family and MAX_TASK_XP per
 * task — enforced again server-side, this is just for instant UI feedback)
 * and the per-child completion endpoints
 * (`POST`/`DELETE /api/habits/children/{childId}/completions`,
 * `GET .../completions?logDate=`). `fetchHabitCategories` now takes an
 * optional `{ familyId, token }` — omit it for the admin-catalog-only view
 * (AdminHabitsPage), pass it for the family view (HabitsPage/SettingsPage),
 * which also includes that family's own custom tasks (`isCustom: true` on
 * the returned HabitTask).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MAX_FAMILY_TASKS = 5;
export const MAX_TASK_XP = 10;

export interface HabitTask {
  id: string;
  categoryId: string;
  title: string;
  note: string | null;
  xpValue: number;
  /** True for a task a parent created for their own family (see
   * CreateFamilyHabitTaskCommand) — false for the shared admin catalog. */
  isCustom: boolean;
}

export interface HabitCategory {
  id: string;
  key: string;
  title: string;
  /** Slug into the shared icon registry (src/lib/icons.tsx) — same convention
   * as every other icon slug stored in mock/backend data. */
  icon: string;
  tasks: HabitTask[];
}

export interface CreateHabitCategoryInput {
  key: string;
  title: string;
  icon: string;
}

export interface AddHabitTaskInput {
  categoryId: string;
  title: string;
  note?: string;
  xpValue: number;
}

export interface CreateFamilyHabitTaskInput {
  categoryId: string;
  title: string;
  note?: string;
  xpValue: number;
}

export interface HabitCompletion {
  id: string;
  childId: string;
  taskId: string;
  logDate: string;
  /** The XP actually granted for this completion (base task XP + any streak
   * bonus at the time it was completed) — null only if the backend somehow
   * has no ledger row for it. Needed so un-completing a task that was already
   * done before this page loaded subtracts the real amount, not the task's
   * current static xpValue (which can differ once a streak bonus applied). */
  xpAwarded: number | null;
}

/** POST .../completions' response shape — richer than HabitCompletion because
 * the "+N XP" feedback (and which streak-bonus message to show) needs the
 * base/bonus breakdown, not just the total. XpAwarded == BaseXp + BonusXp. */
export interface HabitCompletionResult {
  id: string;
  childId: string;
  taskId: string;
  logDate: string;
  xpAwarded: number;
  baseXp: number;
  bonusXp: number;
  streakDays: number;
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

/** For the DELETE completion endpoint — 204 No Content on success, no body to parse. */
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

export function fetchHabitCategories(opts?: { familyId: string; token: string }): Promise<HabitCategory[]> {
  const path = opts ? `/api/habits/categories?familyId=${opts.familyId}` : '/api/habits/categories';
  const headers = opts ? { Authorization: `Bearer ${opts.token}` } : undefined;
  return requestJson<HabitCategory[]>(path, { headers });
}

export function createHabitCategory(input: CreateHabitCategoryInput, token: string): Promise<HabitCategory> {
  return requestJson<HabitCategory>('/api/habits/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function addHabitTask(input: AddHabitTaskInput, token: string): Promise<HabitTask> {
  const { categoryId, ...body } = input;
  return requestJson<HabitTask>(`/api/habits/categories/${categoryId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

/** A parent creating a custom habit for their own family — backend-enforced caps:
 * MAX_FAMILY_TASKS per family (409 once exceeded), MAX_TASK_XP per task (400). */
export function createFamilyHabitTask(
  familyId: string,
  input: CreateFamilyHabitTaskInput,
  token: string,
): Promise<HabitTask> {
  return requestJson<HabitTask>(`/api/habits/families/${familyId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function fetchHabitCompletions(childId: string, logDate: string, token: string): Promise<HabitCompletion[]> {
  return requestJson<HabitCompletion[]>(`/api/habits/children/${childId}/completions?logDate=${logDate}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface HabitStreakDay {
  /** ISO 'YYYY-MM-DD' */
  date: string;
  state: 'done' | 'today' | 'upcoming' | 'missed';
}

export interface HabitStreak {
  /** The "🔥 N GÜN" badge — see GetHabitStreakQueryHandler for exactly how
   * today counts before it has its own completion yet. */
  consecutiveDays: number;
  /** Always 7 entries, Monday through Sunday, for whichever week contains `today`. */
  week: HabitStreakDay[];
}

/** GET /api/habits/children/{childId}/streak — backs HabitsPage.tsx's "Həftəlik
 * Seriya" widget, previously entirely static mock data even for a real backend
 * account. `today` is required (same reasoning as logDate everywhere else in
 * this file — only the caller knows the child's local "today"). */
export function fetchHabitStreak(childId: string, today: string, token: string): Promise<HabitStreak> {
  return requestJson<HabitStreak>(`/api/habits/children/${childId}/streak?today=${today}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Idempotent — completing an already-completed task just returns the amount
 * it was already granted, not a fresh (and possibly different) streak bonus. */
export function completeHabitTask(
  childId: string,
  taskId: string,
  logDate: string,
  token: string,
): Promise<HabitCompletionResult> {
  return requestJson<HabitCompletionResult>(`/api/habits/children/${childId}/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ taskId, logDate }),
  });
}

/** Idempotent — un-completing a task that isn't currently completed is a no-op. */
export function uncompleteHabitTask(childId: string, taskId: string, logDate: string, token: string): Promise<void> {
  return requestVoid(`/api/habits/children/${childId}/completions/${taskId}?logDate=${logDate}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
