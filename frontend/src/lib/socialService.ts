/**
 * SOCIAL SERVICE — backed by the real SimartBackend.Api
 * -------------------------------------------------------
 * `GET /api/social/posts`, `POST /api/social/children/{childId}/posts`,
 * `POST`/`DELETE /api/social/children/{childId}/posts/{postId}/like`,
 * `GET /api/social/posts/{postId}/comments`,
 * `POST /api/social/children/{childId}/posts/{postId}/comments`,
 * `GET /api/social/leaderboard` — see backend/README.md, "Social". The feed
 * and leaderboard are cross-family by design (every family's children share
 * one feed, same as the original mock data always implied) — only the
 * acting childId (posting, liking, commenting) is ever ownership-checked.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface SocialPost {
  id: string;
  childId: string;
  handle: string;
  avatarEmoji: string;
  caption: string;
  mediaEmoji: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface SocialComment {
  id: string;
  postId: string;
  childId: string;
  handle: string;
  avatarEmoji: string;
  body: string;
  parentCommentId: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  childId: string;
  handle: string;
  avatarEmoji: string;
  totalXp: number;
}

export const MAX_CAPTION_LENGTH = 280;
export const MAX_COMMENT_LENGTH = 280;

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

export function fetchPosts(childId: string, token: string, limit = 20): Promise<SocialPost[]> {
  return requestJson<SocialPost[]>(`/api/social/posts?childId=${childId}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createPost(childId: string, caption: string, mediaEmoji: string | null, token: string): Promise<SocialPost> {
  return requestJson<SocialPost>(`/api/social/children/${childId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ caption, mediaEmoji }),
  });
}

export function likePost(childId: string, postId: string, token: string): Promise<void> {
  return requestVoid(`/api/social/children/${childId}/posts/${postId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function unlikePost(childId: string, postId: string, token: string): Promise<void> {
  return requestVoid(`/api/social/children/${childId}/posts/${postId}/like`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function fetchComments(postId: string, token: string): Promise<SocialComment[]> {
  return requestJson<SocialComment[]>(`/api/social/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createComment(
  childId: string,
  postId: string,
  body: string,
  parentCommentId: string | null,
  token: string,
): Promise<SocialComment> {
  return requestJson<SocialComment>(`/api/social/children/${childId}/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body, parentCommentId }),
  });
}

export function fetchLeaderboard(token: string, limit = 10): Promise<LeaderboardEntry[]> {
  return requestJson<LeaderboardEntry[]>(`/api/social/leaderboard?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
