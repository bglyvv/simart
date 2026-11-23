/**
 * GAMES SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `POST /api/games/children/{childId}/plays` (GamesPage.tsx calls this when a
 * mini-game finishes) and `GET /api/games/children/{childId}/plays` (reads
 * real play history back, instead of GamesPage's old local-only
 * `gameHistory`). The six-game catalog itself (title/icon/axis per game) is
 * still a static frontend constant (`GAME_CATALOG` in useAppStore.ts) — the
 * backend only needs the matching slug to resolve which seeded `Game` row a
 * play belongs to. See backend/README.md's "Mini-games" section.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface GamePlay {
  id: string;
  /** The real game slug — GAME_CATALOG's id (e.g. "memory"), never the
   * backend's internal Game.Id. */
  gameId: string;
  axis: 'attention' | 'logic' | 'memory' | 'reaction' | 'creativity';
  score: number;
  /** The real, server-computed amount (GameXpAward) — never trust a
   * client-side guess for what was actually credited. */
  xpAwarded: number;
  playedAt: string;
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

export function recordGamePlay(childId: string, gameId: string, score: number, token: string): Promise<GamePlay> {
  return requestJson<GamePlay>(`/api/games/children/${childId}/plays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gameId, score }),
  });
}

export function fetchGamePlays(childId: string, token: string, limit = 30): Promise<GamePlay[]> {
  return requestJson<GamePlay[]>(`/api/games/children/${childId}/plays?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
