export type Audience = 'parent' | 'child';

export interface PlaylistVideo {
  /** The real YouTube video ID — the video is never stored on our own server, only linked/embedded. */
  youtubeId: string;
  title: string;
  /** m:ss, mm:ss, or h:mm:ss, exactly as YouTube displays it */
  duration: string;
}

export interface Playlist {
  /** The public-facing identifier: the real YouTube playlist ID, or — for a
   * playlist created without one — the backend's internal database id as a
   * string. Always set; use `youtubePlaylistId` to tell which case this is. */
  id: string;
  /** The real YouTube playlist ID (one of them is technically a YouTube "podcast",
   * not a classic playlist) — null if this playlist isn't tied to one. */
  youtubePlaylistId: string | null;
  title: string;
  audience: Audience;
  description?: string;
  colorFrom: string;
  colorTo: string;
  videos: PlaylistVideo[];
}

/**
 * CONTENT SERVICE — backed by the real SimartBackend.Api
 * --------------------------------------------------------
 * `GET /api/content/playlists[?audience=parent|child]`, served by
 * `backend/src/SimartBackend.Api` off the Neon database. That database is kept
 * in sync with the real SİMART YouTube channel through a real YouTube Data API
 * v3-backed review flow (see "discoverNewContent"/"assignVideo" below and
 * backend/README.md's "Content (admin review sync)") — not an automatic upsert.
 *
 * Videos are never uploaded to or stored on our own server — every video is
 * played straight from YouTube (an embedded player keyed by `youtubeId`, or a
 * link out to youtube.com). `VITE_API_BASE_URL` (see `.env.development`)
 * points this at the backend; it has no default in production builds, since
 * there isn't a deployed backend yet.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchPlaylists(audience?: Audience): Promise<Playlist[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL('/api/content/playlists', API_BASE_URL);
  if (audience) url.searchParams.set('audience', audience);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Playlist[];
}

export interface DiscoveredVideo {
  youtubeVideoId: string;
  title: string;
  duration: string;
  /** Filled in when the video was found inside one of our already-known
   * playlists — a default for the review form, not applied automatically. */
  suggestedPlaylistId: string | null;
  suggestedPlaylistTitle: string | null;
  suggestedAudience: Audience | null;
}

/** POST /api/content/sync — calls the real YouTube Data API v3 for the SİMART
 * channel and returns every video that isn't in our database yet (whether it's
 * in a known playlist or not in any playlist at all). Writes nothing — see
 * `assignVideo` for the action that actually adds one. Requires an admin bearer
 * token (see adminService.ts's `loginAdmin`). */
export async function discoverNewContent(token: string): Promise<DiscoveredVideo[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL('/api/content/sync', API_BASE_URL);
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DiscoveredVideo[];
}

export interface AssignVideoInput {
  youtubeVideoId: string;
  title: string;
  duration: string;
  /** The real YouTube playlist id (matches Playlist.id / DiscoveredVideo.suggestedPlaylistId)
   * — null is a deliberate "no playlist" choice. The backend resolves this to its
   * own internal database id; nothing on the frontend ever needs to know that one. */
  youtubePlaylistId: string | null;
  audience: Audience;
}

export interface AssignedVideo {
  id: string;
  youtubeVideoId: string;
  title: string;
  playlistId: string | null;
  audience: Audience;
}

/** POST /api/content/videos — commits one discovered video with the playlist/
 * audience an admin chose in the review UI. Admin bearer token required. */
export async function assignVideo(input: AssignVideoInput, token: string): Promise<AssignedVideo> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/content/videos', API_BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST /api/content/videos failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as AssignedVideo;
}

/** DELETE /api/content/videos/{youtubeVideoId} — soft delete: the row stays in
 * Postgres (IsDeleted/DeletedAt/DeletedBy), it just stops showing up anywhere in
 * the family app from that point on (the backend's global query filter handles
 * that). Admin bearer token required. */
export async function deleteVideo(youtubeVideoId: string, token: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/videos/${youtubeVideoId}`, API_BASE_URL);
  const response = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `DELETE ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }
}

export interface CreatePlaylistInput {
  /** Omit (or leave empty) to create a playlist that isn't tied to any real
   * YouTube playlist at all — see "create playlist without a YouTube id" in
   * root CLAUDE.md. */
  youtubePlaylistId?: string;
  title: string;
  audience: Audience;
  description?: string;
  colorFrom: string;
  colorTo: string;
}

export interface CreatedPlaylist {
  id: string;
  /** The playlist's public-facing identifier — same convention as Playlist.id. */
  publicId: string;
  youtubePlaylistId: string | null;
  title: string;
  audience: Audience;
  description: string | null;
  colorFrom: string;
  colorTo: string;
}

/** POST /api/content/playlists — registers a playlist, either tied to a real
 * YouTube playlist (an id the admin types in, not one that was already
 * discovered) or, with youtubePlaylistId omitted, a purely internal grouping.
 * Either way it carries the audience/color metadata YouTube itself has no
 * concept of. Admin bearer token required. */
export async function createPlaylist(input: CreatePlaylistInput, token: string): Promise<CreatedPlaylist> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/content/playlists', API_BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST /api/content/playlists failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as CreatedPlaylist;
}

/** DELETE /api/content/playlists/{youtubePlaylistId} — soft delete, same as
 * `deleteVideo`. Its videos aren't touched individually; they just stop being
 * reachable once their parent playlist is filtered out. Admin bearer token
 * required. */
export async function deletePlaylist(youtubePlaylistId: string, token: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/playlists/${youtubePlaylistId}`, API_BASE_URL);
  const response = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `DELETE ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }
}

export interface DeletedPlaylist {
  /** The public-facing identifier — what restore/expand actually address. */
  id: string;
  youtubePlaylistId: string | null;
  title: string;
  audience: Audience;
  colorFrom: string;
  colorTo: string;
  /** ISO datetime, or null (shouldn't happen in practice — every soft delete sets it). */
  deletedAt: string | null;
  /** Only the playlist's own still-real (non-deleted) videos — how many would come
   * back if this playlist were restored, on top of whichever videos were
   * cascade-deleted along with it. */
  videoCount: number;
}

/** GET /api/content/deleted-playlists — the admin dashboard's "Silinmiş" tab,
 * read-only. Admin bearer token required. */
export async function fetchDeletedPlaylists(token: string): Promise<DeletedPlaylist[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/content/deleted-playlists', API_BASE_URL), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`GET /api/content/deleted-playlists failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DeletedPlaylist[];
}

export interface DeletedVideo {
  youtubeId: string;
  title: string;
  duration: string;
  audience: Audience;
  /** Whichever playlist the video was in when deleted, even if that playlist has
   * since been deleted too — null if it never had one. */
  playlistTitle: string | null;
  /** That playlist's own public identifier (for a "restore the playlist too"
   * shortcut, or to pre-select it when moving the video elsewhere) — null only
   * when the video never had a playlist. */
  playlistId: string | null;
  /** True means restoring this video alone won't make it visible anywhere until
   * its playlist is also restored (or the video is moved to a different, active
   * playlist) — the warning this flag drives in the UI. */
  isPlaylistDeleted: boolean;
  deletedAt: string | null;
}

/** GET /api/content/deleted-videos — the admin dashboard's "Silinmiş" tab,
 * read-only. Admin bearer token required. */
export async function fetchDeletedVideos(token: string): Promise<DeletedVideo[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/content/deleted-videos', API_BASE_URL), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`GET /api/content/deleted-videos failed: ${response.status} ${response.statusText}`);
  }

  const raw = (await response.json()) as {
    youtubeVideoId: string;
    title: string;
    duration: string;
    audience: Audience;
    playlistTitle: string | null;
    playlistId: string | null;
    isPlaylistDeleted: boolean;
    deletedAt: string | null;
  }[];
  return raw.map((v) => ({
    youtubeId: v.youtubeVideoId,
    title: v.title,
    duration: v.duration,
    audience: v.audience,
    playlistTitle: v.playlistTitle,
    playlistId: v.playlistId,
    isPlaylistDeleted: v.isPlaylistDeleted,
    deletedAt: v.deletedAt,
  }));
}

/** POST /api/content/videos/{youtubeVideoId}/restore — the "Silinmiş" tab's
 * restore button. Reverses a soft delete; the video reappears in its old
 * playlist (or with no playlist, same as before) immediately. Admin bearer
 * token required. */
export async function restoreVideo(youtubeVideoId: string, token: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/videos/${youtubeVideoId}/restore`, API_BASE_URL);
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }
}

/** POST /api/content/playlists/{youtubePlaylistId}/restore — same as
 * `restoreVideo`, for a playlist. Its videos were never individually touched
 * by the delete, so they come back into view too. Admin bearer token
 * required. */
export async function restorePlaylist(youtubePlaylistId: string, token: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/playlists/${youtubePlaylistId}/restore`, API_BASE_URL);
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }
}

export interface PlaylistVideoStatus {
  youtubeId: string;
  title: string;
  duration: string;
  audience: Audience;
  isDeleted: boolean;
  deletedAt: string | null;
}

/** GET /api/content/playlists/{id}/videos — every video in a playlist, deleted
 * or not. Used to expand a deleted playlist in the "Silinmiş" tab so an admin
 * can see which of its videos would come back on restore and which were
 * deleted separately. Admin bearer token required. */
export async function fetchPlaylistVideos(playlistId: string, token: string): Promise<PlaylistVideoStatus[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/playlists/${playlistId}/videos`, API_BASE_URL);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `GET ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }

  const raw = (await response.json()) as {
    youtubeVideoId: string;
    title: string;
    duration: string;
    audience: Audience;
    isDeleted: boolean;
    deletedAt: string | null;
  }[];
  return raw.map((v) => ({
    youtubeId: v.youtubeVideoId,
    title: v.title,
    duration: v.duration,
    audience: v.audience,
    isDeleted: v.isDeleted,
    deletedAt: v.deletedAt,
  }));
}

/** POST /api/content/videos/{youtubeVideoId}/move — changes which playlist a
 * video belongs to (youtubePlaylistId null removes it from any playlist).
 * Works on both an active video (the "change playlist" control on its row)
 * and a soft-deleted one (the restore-warning's "move instead of restoring
 * its old playlist" option). Admin bearer token required. */
export async function moveVideo(youtubeVideoId: string, youtubePlaylistId: string | null, token: string): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/videos/${youtubeVideoId}/move`, API_BASE_URL);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ youtubePlaylistId }),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }
}

export interface YoutubePlaylistPreview {
  youtubePlaylistId: string;
  title: string;
  videoCount: number;
}

/** POST /api/content/playlists/verify-youtube — the create-playlist modal's
 * "Yoxla" (check) button: a dry-run against the real YouTube Data API v3,
 * writes nothing. Returns null (not thrown) when the id/URL isn't a real,
 * public playlist, so the form can show an inline "not found" state rather
 * than a toast. Admin bearer token required. */
export async function verifyYoutubePlaylist(youtubePlaylistId: string, token: string): Promise<YoutubePlaylistPreview | null> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/content/playlists/verify-youtube', API_BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ youtubePlaylistId }),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST /api/content/playlists/verify-youtube failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as YoutubePlaylistPreview;
}

export interface ImportYoutubePlaylistInput {
  youtubePlaylistId: string;
  title: string;
  audience: Audience;
  description?: string;
  colorFrom: string;
  colorTo: string;
}

export interface ImportYoutubePlaylistResult {
  playlist: CreatedPlaylist;
  importedVideoCount: number;
  skippedExistingCount: number;
}

/** POST /api/content/playlists/import-youtube — the create-playlist modal's
 * submit once "Yoxla" confirmed the playlist is real: registers it and pulls
 * in every one of its videos in one go, all tagged with the chosen audience.
 * A video already in our database (under any playlist, or none) is skipped,
 * never moved — counted in skippedExistingCount. Admin bearer token required. */
export async function importYoutubePlaylist(
  input: ImportYoutubePlaylistInput,
  token: string,
): Promise<ImportYoutubePlaylistResult> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const response = await fetch(new URL('/api/content/playlists/import-youtube', API_BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST /api/content/playlists/import-youtube failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ImportYoutubePlaylistResult;
}

export interface WatchProgress {
  youtubeId: string;
  watchedPct: number;
}

/** GET /api/content/children/{childId}/watch-progress — every video this child
 * has any real watch progress on. Family bearer token required. */
export async function fetchWatchProgress(childId: string, token: string): Promise<WatchProgress[]> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/children/${childId}/watch-progress`, API_BASE_URL);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`GET ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }

  const raw = (await response.json()) as { youtubeVideoId: string; watchedPct: number }[];
  return raw.map((r) => ({ youtubeId: r.youtubeVideoId, watchedPct: r.watchedPct }));
}

/** POST /api/content/children/{childId}/watch-progress — reports real YouTube
 * playback position as a percentage. The backend merges this with whatever's
 * already stored via Math.Max, so an out-of-order or stale report can never
 * erase progress already recorded. Returns the merged (possibly higher) value.
 * Family bearer token required. */
export async function upsertWatchProgress(
  childId: string,
  youtubeVideoId: string,
  watchedPct: number,
  token: string,
): Promise<number> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  }

  const url = new URL(`/api/content/children/${childId}/watch-progress`, API_BASE_URL);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ youtubeVideoId, watchedPct }),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `POST ${url.pathname} failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as { watchedPct: number };
  return result.watchedPct;
}

export function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + (part || 0);
  return seconds;
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

/** Thumbnail YouTube hosts for every video — used for our own poster/play-button
 * screen instead of YouTube's default one (which shows their branding and a
 * "Watch on YouTube" link before the iframe is even clicked). */
export function youtubeThumbnailUrl(youtubeId: string, size: 'default' | 'hq' = 'default'): string {
  const prefix = size === 'hq' ? 'hq' : '';
  return `https://i.ytimg.com/vi/${youtubeId}/${prefix}default.jpg`;
}
