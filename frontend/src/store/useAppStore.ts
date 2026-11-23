import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import habitsData from '../data/habits.json';
import walletData from '../data/wallet.json';
import leaguesData from '../data/leagues.json';
import animationsData from '../data/animations.json';
import playlistsData from '../data/playlists.json';
import { formatAzDate } from '../lib/date';
import { formatTime } from '../lib/formatTime';
import type { Playlist } from '../lib/contentService';

export interface ChildProfile {
  /** The backend's Child.Id (set by AddChildPage/LoginPage when this child is
   * backed by a real family account) — required by the real habit-completion
   * endpoints (habitsService.ts), which are keyed by childId. Null for a child
   * created via the standalone "davam edə bilərsən" path with no parent
   * account — that one stays local-only, same as everywhere else this split
   * already exists. */
  childId: string | null;
  name: string;
  avatar: string;
  gender: 'boy' | 'girl';
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  city: string;
  age: number;
}

export interface ParentProfile {
  /** From the real backend signup/login response — used as the familyId for
   * the subsequent add-child call. */
  familyId: string;
  parentId: string;
  name: string;
  email: string;
  /** Bearer token from signup/login — sent as `Authorization: Bearer {token}`
   * on addChildAccount. Good for 7 days (see JwtAuthTokenService); nothing
   * refreshes it yet. */
  token: string;
}

export interface WalletTx {
  id: string;
  title: string;
  when: string;
  amount: number;
  direction: 'in' | 'out';
}

/** A child's own note, anchored to a specific minute of a specific video —
 * same idea as Udemy's lecture notes: captured at the real playback
 * position (YoutubePlayerHandle.getCurrentTime), listed in video order (not
 * creation order), and clickable to jump the player straight back there. */
export interface VideoNote {
  id: string;
  timestampSeconds: number;
  /** Pre-formatted "M:SS" (or "H:MM:SS") — see src/lib/formatTime.ts. */
  timestampLabel: string;
  text: string;
  createdAt: number;
}

export interface GameResult {
  gameId: string;
  gameTitle: string;
  icon: string;
  iconBg: string;
  score: number;
  axis: 'attention' | 'logic' | 'memory' | 'reaction' | 'creativity';
  playedAt: number;
}

const initialHabitDone: Record<string, boolean> = {};
habitsData.categories.forEach((cat) => {
  cat.tasks.forEach((t, i) => {
    initialHabitDone[`${cat.key}-${i}`] = t.done;
  });
});

const initialTx: WalletTx[] = walletData.transactions.map((t, i) => ({
  id: `seed-${i}`,
  title: t.title,
  when: t.when,
  amount: Number(t.amount.replace(/[^0-9.]/g, '')),
  direction: t.direction as 'in' | 'out',
}));

// Seed "already watched" progress for the first child-audience video, so the
// animations player opens mid-progress on first load (matches the old demo data).
// Keyed by the real YouTube video ID — the only stable identifier once videos
// come from the actual channel instead of made-up titles.
const firstChildVideo = (playlistsData as Playlist[]).find((p) => p.audience === 'child')?.videos[0];
const seedWatchedPct: Record<string, number> = firstChildVideo
  ? { [firstChildVideo.youtubeId]: animationsData.player.progressPercent }
  : {};

// Same seeding idea as seedWatchedPct above, reusing the old mock note so a
// fresh profile isn't staring at a completely empty notes list.
const seedNote = animationsData.notes[0];
const seedVideoNotes: Record<string, VideoNote[]> = firstChildVideo && seedNote
  ? {
      [firstChildVideo.youtubeId]: [
        {
          id: 'seed-note-0',
          timestampSeconds: 62,
          timestampLabel: seedNote.timestamp,
          text: seedNote.title,
          createdAt: Date.now(),
        },
      ],
    }
  : {};

export interface AppState {
  // identity
  parent: ParentProfile | null;
  child: ChildProfile | null;
  pin: string;
  authedAsParent: boolean;

  // progress
  xp: number;
  streakDays: number;
  habitDone: Record<string, boolean>;
  watchedPct: Record<string, number>;
  /** Keyed by youtubeId — see VideoNote. */
  videoNotes: Record<string, VideoNote[]>;
  /** Keyed by youtubeId -> the local 'YYYY-MM-DD' date its first completion
   * happened on (see src/lib/dob.ts's todayIso) — AnimationsPage's own way of
   * counting "how many videos has this child finished today" to decide when
   * to trigger a focus lock, without needing a backend round-trip just to ask. */
  videoCompletionDates: Record<string, string>;
  likedPosts: Record<string, boolean>;
  redeemedRewards: Record<string, boolean>;
  gameHistory: GameResult[];
  focusLockUntil: number | null;
  focusMinutes: number;

  // wallet
  balance: number;
  transactions: WalletTx[];

  // actions
  setParent: (p: ParentProfile) => void;
  setChild: (c: ChildProfile) => void;
  setPin: (pin: string) => void;
  tryPin: (pin: string) => boolean;
  logoutParent: () => void;
  resetAll: () => void;

  addXp: (amount: number) => void;
  toggleHabit: (id: string, xp: number) => void;
  setWatchedPct: (videoId: string, pct: number) => void;
  addVideoNote: (videoId: string, timestampSeconds: number, text: string) => void;
  /** Only records the first time a given video completes — a later re-completion
   * (replaying an already-finished video) doesn't inflate the day's count. */
  recordVideoCompletion: (videoId: string, date: string) => void;
  toggleLike: (postId: string) => void;
  redeemReward: (id: string, costXp: number) => boolean;
  recordGameResult: (r: Omit<GameResult, 'playedAt'>) => void;
  /** Local-only path (no backend child): starts a lock `minutes` from now. */
  startFocusLock: (minutes: number) => void;
  /** Backend-synced path: adopts a lock's real `lockedUntil` (epoch ms) from
   * the server as-is, rather than recomputing it from "minutes from now" on
   * the client — avoids clock-drift between StartFocusLockCommand's
   * DateTimeOffset.UtcNow and this device's own clock. Pass null to clear. */
  syncFocusLockUntil: (until: number | null) => void;
  clearFocusLock: () => void;
  donate: (label: string, xpCost: number, aznAmount: number) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      parent: null,
      child: null,
      pin: '1234',
      authedAsParent: false,

      xp: 1250,
      streakDays: 7,
      habitDone: initialHabitDone,
      watchedPct: seedWatchedPct,
      videoNotes: seedVideoNotes,
      videoCompletionDates: {},
      likedPosts: {},
      redeemedRewards: {},
      gameHistory: [],
      focusLockUntil: null,
      focusMinutes: 15,

      balance: 15.5,
      transactions: initialTx,

      setParent: (p) => set({ parent: p }),
      setChild: (c) => set({ child: c }),
      setPin: (pin) => set({ pin }),
      tryPin: (pin) => {
        const ok = pin === get().pin;
        if (ok) set({ authedAsParent: true });
        return ok;
      },
      logoutParent: () => set({ authedAsParent: false }),
      resetAll: () =>
        set({
          parent: null,
          child: null,
          pin: '1234',
          authedAsParent: false,
          xp: 0,
          streakDays: 0,
          habitDone: {},
          watchedPct: {},
          videoNotes: {},
          videoCompletionDates: {},
          likedPosts: {},
          redeemedRewards: {},
          gameHistory: [],
          focusLockUntil: null,
          balance: 0,
          transactions: [],
        }),

      addXp: (amount) => set((s) => ({ xp: Math.max(0, s.xp + amount) })),

      toggleHabit: (id, xp) =>
        set((s) => {
          const nowDone = !s.habitDone[id];
          return {
            habitDone: { ...s.habitDone, [id]: nowDone },
            xp: Math.max(0, s.xp + (nowDone ? xp : -xp)),
          };
        }),

      setWatchedPct: (videoId, pct) =>
        set((s) => ({ watchedPct: { ...s.watchedPct, [videoId]: pct } })),

      addVideoNote: (videoId, timestampSeconds, text) =>
        set((s) => {
          const note: VideoNote = {
            id: `note-${Date.now()}`,
            timestampSeconds,
            timestampLabel: formatTime(timestampSeconds),
            text,
            createdAt: Date.now(),
          };
          const existing = s.videoNotes[videoId] ?? [];
          // Udemy-style: shown by video position, not add order.
          const next = [...existing, note].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
          return { videoNotes: { ...s.videoNotes, [videoId]: next } };
        }),

      recordVideoCompletion: (videoId, date) =>
        set((s) =>
          s.videoCompletionDates[videoId]
            ? s
            : { videoCompletionDates: { ...s.videoCompletionDates, [videoId]: date } },
        ),

      toggleLike: (postId) => set((s) => ({ likedPosts: { ...s.likedPosts, [postId]: !s.likedPosts[postId] } })),

      redeemReward: (id, costXp) => {
        const s = get();
        if (s.redeemedRewards[id] || s.xp < costXp) return false;
        set({
          redeemedRewards: { ...s.redeemedRewards, [id]: true },
          xp: s.xp - costXp,
        });
        return true;
      },

      recordGameResult: (r) =>
        set((s) => ({
          gameHistory: [{ ...r, playedAt: Date.now() }, ...s.gameHistory].slice(0, 30),
        })),

      startFocusLock: (minutes) =>
        set({ focusLockUntil: Date.now() + minutes * 60_000, focusMinutes: minutes }),
      syncFocusLockUntil: (until) => set({ focusLockUntil: until }),
      clearFocusLock: () => set({ focusLockUntil: null }),

      donate: (label, xpCost, aznAmount) => {
        const s = get();
        if (s.xp < xpCost) return false;
        const tx: WalletTx = {
          id: `tx-${Date.now()}`,
          title: label,
          when: formatAzDate(new Date()),
          amount: aznAmount,
          direction: 'out',
        };
        set({ xp: s.xp - xpCost, transactions: [tx, ...s.transactions] });
        return true;
      },
    }),
    {
      name: 'simart-app-state',
      // v6: ChildProfile gained childId (required by the real habit-completion
      // endpoints) — bump so stale v5 localStorage (no childId) gets discarded
      // instead of HabitsPage silently treating a real backend child as local-only.
      version: 6,
    },
  ),
);

export const GAME_CATALOG: { id: string; title: string; icon: string; iconBg: string; axis: GameResult['axis']; description: string }[] = [
  { id: 'memory', title: 'Memory Match', icon: 'cards', iconBg: 'purple-100', axis: 'memory', description: 'Vizual Yaddaş Oyunu — cütləri tapıb yaddaşını gücləndir.' },
  { id: 'tangram', title: 'Tangram', icon: 'triangle', iconBg: 'red-100', axis: 'creativity', description: 'Fiqurları düzərək məkan təfəkkürünü inkişaf etdir.' },
  { id: 'sudoku', title: 'Sudoku for Kids', icon: 'grid', iconBg: 'green-100', axis: 'logic', description: 'Sadələşdirilmiş sudoku ilə məntiqi düşün.' },
  { id: 'sequence', title: 'Puzzle Logic', icon: 'link', iconBg: 'blue-100', axis: 'logic', description: 'Ardıcıllığı tapıb məntiqi zənciri tamamla.' },
  { id: 'colors', title: 'Rənglərin Sehri', icon: 'palette', iconBg: 'amber-100', axis: 'attention', description: 'Rəng ardıcıllığını təkrarla, diqqətini sınaqdan keçir.' },
  { id: 'words', title: 'Söz Tapmacası', icon: 'text', iconBg: 'purple-100', axis: 'reaction', description: 'Hərfləri birləşdirərək yeni sözlər kəşf et.' },
];

export const LEAGUE_TIERS = leaguesData.progressHero.tiers.map((t, i) => ({
  ...t,
  threshold: [1000, 2000, 4000, 8000][i],
}));
