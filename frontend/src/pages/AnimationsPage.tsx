import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Play } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { XpPill, IconButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import YoutubePlayer, { type YoutubePlayerHandle } from '../components/YoutubePlayer';
import { useAppStore, useActiveChild, getActiveChild, EMPTY_RECORD } from '../store/useAppStore';
import { celebrate } from '../lib/confetti';
import { fetchPlaylists, fetchWatchProgress, upsertWatchProgress, youtubeThumbnailUrl, type Playlist } from '../lib/contentService';
import { addScreenTime, startFocusLock as startFocusLockRequest } from '../lib/focusService';
import { todayIso } from '../lib/dob';
import data from '../data/animations.json';

// Matches the original mock copy ("2 Video Limitinə Çatdı" / "15 dəqiqəlik
// ... istirahət rejiminə keçdi") — this is what finally wires that copy up to
// a real, repeating trigger: every VIDEOS_PER_LOCK completions in a day starts
// a LOCK_MINUTES focus lock, real and persisted for a backend-synced child,
// local-only otherwise (see FocusModePage.tsx / RequireNotFocusLocked).
const VIDEOS_PER_LOCK = 2;
const LOCK_MINUTES = 15;

export default function AnimationsPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const watchedPct = child?.watchedPct ?? EMPTY_RECORD;
  const setWatchedPct = useAppStore((s) => s.setWatchedPct);
  const addXp = useAppStore((s) => s.addXp);
  const videoNotes = child?.videoNotes ?? EMPTY_RECORD;
  const addVideoNote = useAppStore((s) => s.addVideoNote);
  const videoCompletionDates = child?.videoCompletionDates ?? EMPTY_RECORD;
  const recordVideoCompletion = useAppStore((s) => s.recordVideoCompletion);
  const startFocusLockLocal = useAppStore((s) => s.startFocusLock);
  const syncFocusLockUntil = useAppStore((s) => s.syncFocusLockUntil);
  const playerRef = useRef<YoutubePlayerHandle>(null);
  const useBackend = !!(parent?.familyId && child?.childId);

  // Child-facing page — only playlists tagged "child" are ever requested here.
  // The parent-only "Valideyn Bələdçisi" playlist lives on the Analitika panel instead.
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchPlaylists('child')
      .then((result) => {
        if (!cancelled) setPlaylists(result);
      })
      .catch((err) => {
        console.error('Animasiyalar yüklənmədi:', err);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real watch progress for a backend-synced child — merges in on top of
  // whatever's already in the local store (seedWatchedPct's static seed, or
  // progress from an earlier session on this same device) via the same
  // monotonic "only move up" rule handleProgress/handleCompleted already use,
  // so a stale/slow fetch can never erase progress just recorded locally.
  useEffect(() => {
    if (!useBackend || !child?.childId || !parent) return;
    let cancelled = false;
    fetchWatchProgress(child.childId, parent.token)
      .then((rows) => {
        if (cancelled) return;
        const current = getActiveChild()?.watchedPct ?? {};
        for (const row of rows) {
          if (row.watchedPct > (current[row.youtubeId] ?? 0)) setWatchedPct(row.youtubeId, row.watchedPct);
        }
      })
      .catch((err) => console.error('İzləmə faizi yüklənmədi:', err));
    return () => {
      cancelled = true;
    };
  }, [useBackend, child?.childId, parent?.token, setWatchedPct]);

  // Library panel groups videos by their playlist, collapsed until clicked — see
  // expandedPlaylistId below. Every video still only ever plays straight from
  // YouTube via an embed, never a locally-hosted file.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (activeId || playlists.length === 0) return;
    const first = playlists.find((p) => p.videos.length > 0);
    if (first) {
      setActiveId(first.videos[0].youtubeId);
      setExpandedPlaylistId(first.id);
    }
  }, [playlists, activeId]);

  const activePlaylist = playlists.find((p) => p.videos.some((v) => v.youtubeId === activeId));
  const activeVideoRaw = activePlaylist?.videos.find((v) => v.youtubeId === activeId);
  const activeVideo = activeVideoRaw
    ? {
        ...activeVideoRaw,
        playlistTitle: activePlaylist!.title,
        colorFrom: activePlaylist!.colorFrom,
        colorTo: activePlaylist!.colorTo,
      }
    : null;

  function togglePlaylist(id: string) {
    setExpandedPlaylistId((cur) => (cur === id ? null : id));
  }

  // The YouTube iframe shows its own branding (title/channel overlay, a "Watch
  // on YouTube" link) before it's clicked into — showing our own poster + play
  // button instead until the child actually chooses to play skips all of that.
  // Resets per video so switching videos doesn't carry over an autoplaying embed.
  const [isPlaying, setIsPlaying] = useState(false);
  // Set by jumpToNote below when a note is clicked before the player has
  // ever been started — consumed once, as the embed's own `start` param, by
  // the YoutubePlayer instance that mounts right after. Cleared alongside
  // isPlaying so switching videos never carries a stale jump target into an
  // unrelated video.
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  useEffect(() => {
    setIsPlaying(false);
    setPendingSeekSeconds(null);
    // Flushes on every video switch (so a partial, not-yet-10s chunk of watch
    // time isn't dropped when the child jumps to a different video) and on
    // unmount (leaving the page entirely) — same cleanup, both cases.
    return () => {
      flushScreenTime();
    };
  }, [activeId]);

  const [note, setNote] = useState('');
  const notesForActiveVideo = activeVideo ? videoNotes[activeVideo.youtubeId] ?? [] : [];

  // Real playback progress, reported by YoutubePlayer from the actual IFrame
  // API position — replaces the old manual "Tamamladım" button. Monotonic:
  // scrubbing backward never erases progress already recorded. For a
  // backend-synced child this also persists to watch_progress — the backend
  // applies its own Math.Max merge too, so an out-of-order network response
  // can't regress what's already stored there either.
  function persistProgress(youtubeId: string, pct: number) {
    setWatchedPct(youtubeId, pct);
    if (useBackend && child?.childId && parent) {
      upsertWatchProgress(child.childId, youtubeId, pct, parent.token).catch((err) => {
        console.error('İzləmə faizi backend-ə yazıla bilmədi:', err);
      });
    }
  }

  function handleProgress(pct: number) {
    if (!activeVideo) return;
    const current = watchedPct[activeVideo.youtubeId] ?? 0;
    if (pct > current) persistProgress(activeVideo.youtubeId, pct);
  }

  // Real elapsed wall-clock playback seconds (YoutubePlayer's onElapsedSeconds),
  // accumulated here and flushed to /api/focus/.../screen-time every ~10s —
  // HabitsPage.tsx's "Bugünkü ekran vaxtı" stat reads this back. Local-only
  // (no backend child) just drops it: there's no local equivalent to persist
  // to, same split as every other backend-only feature in this app.
  const screenTimeAccumRef = useRef(0);
  function flushScreenTime() {
    const seconds = Math.floor(screenTimeAccumRef.current);
    if (seconds <= 0) return;
    screenTimeAccumRef.current -= seconds;
    if (!useBackend || !child?.childId || !parent) return;
    addScreenTime(child.childId, todayIso(), Math.min(seconds, 300), parent.token).catch((err) => {
      console.error('Ekran vaxtı backend-ə yazıla bilmədi:', err);
    });
  }
  function handleElapsedSeconds(delta: number) {
    screenTimeAccumRef.current += delta;
    if (screenTimeAccumRef.current >= 10) flushScreenTime();
  }

  function handleCompleted() {
    if (!activeVideo) return;
    const alreadyCompleted = (watchedPct[activeVideo.youtubeId] ?? 0) >= 100;
    persistProgress(activeVideo.youtubeId, 100);
    if (alreadyCompleted) return;

    addXp(3);
    celebrate();
    toast.success(`${activeVideo.title} tamamlandı! +3 XP`);

    const today = todayIso();
    const completedTodayBefore = Object.values(videoCompletionDates).filter((d) => d === today).length;
    recordVideoCompletion(activeVideo.youtubeId, today);
    const completedTodayAfter = completedTodayBefore + 1;

    // Fires every VIDEOS_PER_LOCK-th completion in a day (2, 4, 6, ...), not
    // just once — an ongoing cooldown rule, not a one-time daily cap.
    if (completedTodayAfter % VIDEOS_PER_LOCK === 0) {
      void triggerFocusLock();
    }
  }

  async function triggerFocusLock() {
    if (useBackend && parent && child?.childId) {
      try {
        const lock = await startFocusLockRequest(child.childId, LOCK_MINUTES, 'video_limit', parent.token);
        syncFocusLockUntil(new Date(lock.lockedUntil).getTime());
      } catch (err) {
        console.error('Fokus kilidi başladıla bilmədi:', err);
        // Backend call failed — still lock locally so the cooldown isn't
        // silently skipped; FocusModePage will just show a local-only lock
        // this time instead of one that'd survive a reload elsewhere.
        startFocusLockLocal(LOCK_MINUTES);
      }
    } else {
      startFocusLockLocal(LOCK_MINUTES);
    }
    navigate('/focus-mode');
  }

  function selectVideo(youtubeId: string) {
    setActiveId(youtubeId);
  }

  // Udemy-style lecture notes: captured at the real playback position
  // (YoutubePlayerHandle.getCurrentTime, not a guess), not available until
  // the player has actually been started at least once this session.
  function saveNote() {
    if (!note.trim() || !activeVideo || !isPlaying) return;
    const seconds = Math.floor(playerRef.current?.getCurrentTime() ?? 0);
    addVideoNote(activeVideo.youtubeId, seconds, note.trim());
    setNote('');
    toast.success('Qeyd saxlanıldı.');
  }

  // Clicking a note jumps the player straight to that minute — if the
  // player's already mounted, seek in place; if the child hasn't pressed
  // play yet, mount it starting there instead (see pendingSeekSeconds).
  function jumpToNote(seconds: number) {
    if (!activeVideo) return;
    if (isPlaying && playerRef.current) {
      playerRef.current.seekTo(seconds);
    } else {
      setPendingSeekSeconds(seconds);
      setIsPlaying(true);
    }
  }

  return (
    <AppShell>
      <Topbar
        title={data.topbar.title}
        subtitle={`Cari seriya: Animasiya — ${activeVideo?.title ?? '...'}`}
        onMenuClick={openMenu}
        actions={
          <>
            <XpPill>⭐ {xp.toLocaleString('az-AZ')} XP</XpPill>
            <IconButton>🔔</IconButton>
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Card padding="none" className="overflow-hidden">
              <div className="aspect-video bg-primary">
                {activeVideo && !isPlaying && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="group relative size-full"
                    aria-label={`${activeVideo.title} videosunu oynat`}
                  >
                    <img
                      src={youtubeThumbnailUrl(activeVideo.youtubeId, 'hq')}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg transition-transform group-hover:scale-105">
                        <Play size={28} className="ml-1" fill="currentColor" />
                      </span>
                    </span>
                    <span className="absolute inset-x-0 bottom-0 truncate p-4 text-left text-body-sm font-bold text-white">
                      {activeVideo.title}
                    </span>
                  </button>
                )}
                {activeVideo && isPlaying && (
                  <YoutubePlayer
                    key={activeVideo.youtubeId}
                    ref={playerRef}
                    youtubeId={activeVideo.youtubeId}
                    title={activeVideo.title}
                    onProgress={handleProgress}
                    onCompleted={handleCompleted}
                    onElapsedSeconds={handleElapsedSeconds}
                    startAtSeconds={pendingSeekSeconds ?? undefined}
                  />
                )}
              </div>
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-bold text-text-900">{activeVideo?.title}</p>
                  <p className="text-caption text-text-400">{activeVideo?.playlistTitle} · YouTube-da izlənilir</p>
                </div>
                {/* Real playback progress (YoutubePlayer's onProgress/onCompleted,
                    driven by the actual IFrame API position) — no more manual
                    "mark as watched" click. */}
                {activeVideo && (watchedPct[activeVideo.youtubeId] ?? 0) >= 100 ? (
                  <span className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-success px-5 font-semibold text-white">
                    <Check size={16} /> Tamamlandı
                  </span>
                ) : activeVideo && (watchedPct[activeVideo.youtubeId] ?? 0) > 0 ? (
                  <span className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-surface-alt px-5 font-semibold text-text-400">
                    İzlənilib: {Math.round(watchedPct[activeVideo.youtubeId])}%
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 border-t border-border-soft p-5 sm:flex-row sm:items-center">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveNote()}
                  placeholder={isPlaying ? data.noteInput.placeholder : 'Qeyd əlavə etmək üçün əvvəlcə videonu başladın'}
                  disabled={!isPlaying}
                  className="h-12 flex-1 rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  onClick={saveNote}
                  disabled={!isPlaying || !note.trim()}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-60"
                >
                  <Check size={16} /> Yadda Saxla
                </button>
              </div>
            </Card>

            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">Mənim Dəqiqə Qeydlərim</h3>
              <div className="flex flex-col gap-3">
                {notesForActiveVideo.length === 0 && (
                  <p className="text-body-sm text-text-400">
                    Bu video üçün hələ qeyd yoxdur — videonu izləyərkən maraqlı anları qeyd et.
                  </p>
                )}
                {notesForActiveVideo.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => jumpToNote(n.timestampSeconds)}
                    className="flex items-start gap-3 rounded-xl bg-surface-alt px-4 py-3 text-left transition-colors hover:bg-sand-tint"
                  >
                    <span className="shrink-0 rounded-md bg-sand-tint px-2 py-1 text-caption font-bold tabular-nums text-sand-text">
                      {n.timestampLabel}
                    </span>
                    <p className="text-body-sm font-semibold text-text-900">{n.text}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card padding="lg" className="h-fit min-w-0">
            <h3 className="mb-4 font-display font-semibold text-text-900">Animasiya Kitabxanası</h3>
            <div className="flex flex-col gap-2">
              {playlists.length === 0 && !loadError && (
                <p className="text-body-sm text-text-400">Yüklənir...</p>
              )}
              {loadError && (
                <p className="text-body-sm text-error">
                  Animasiyalar yüklənmədi — backend işə düşübmü?
                </p>
              )}
              {playlists.map((playlist) => {
                const isExpanded = expandedPlaylistId === playlist.id;
                const watchedCount = playlist.videos.filter(
                  (v) => (watchedPct[v.youtubeId] ?? 0) >= 100,
                ).length;
                return (
                  <div key={playlist.id} className="overflow-hidden rounded-xl border border-border-soft">
                    <button
                      onClick={() => togglePlaylist(playlist.id)}
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-alt"
                    >
                      <div
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${playlist.colorFrom}, ${playlist.colorTo})`,
                          backgroundSize: 'cover',
                        }}
                        className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white"
                      >
                        {playlist.videos[0] && (
                          <img
                            src={youtubeThumbnailUrl(playlist.videos[0].youtubeId)}
                            alt=""
                            className="absolute inset-0 size-full object-cover opacity-80"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-bold text-text-900">{playlist.title}</p>
                        <p className="truncate text-caption text-text-400">
                          {watchedCount > 0
                            ? `${watchedCount}/${playlist.videos.length} tamamlandı`
                            : `${playlist.videos.length} video`}
                        </p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-text-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto border-t border-border-soft bg-surface-alt/60 p-2">
                        {playlist.videos.map((video) => {
                          const pct = Math.round(watchedPct[video.youtubeId] ?? 0);
                          const isActive = video.youtubeId === activeId;
                          return (
                            <button
                              key={video.youtubeId}
                              onClick={() => selectVideo(video.youtubeId)}
                              className={`flex items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                                isActive ? 'bg-surface-alt ring-2 ring-primary' : 'hover:bg-surface'
                              }`}
                            >
                              <div className="relative size-9 shrink-0 overflow-hidden rounded-md">
                                <img
                                  src={youtubeThumbnailUrl(video.youtubeId)}
                                  alt=""
                                  className="size-full object-cover"
                                  loading="lazy"
                                />
                                {pct >= 100 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Check size={14} className="text-white" />
                                  </div>
                                )}
                              </div>
                              <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text-900">
                                {video.title}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
