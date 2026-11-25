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
import {
  verifyPin as verifyPinApi,
  changePin as changePinApi,
  verifyChildPin as verifyChildPinApi,
  setChildPin as setChildPinApi,
} from '../lib/identityService';

/** The identity-only fields a caller (LoginPage/AddChildPage) provides when a
 *  child profile is created or refreshed — everything else (progress state)
 *  is seeded fresh by createChildProfile below. */
export interface ChildProfileInput {
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
  /** Whether a parent has set this child's own PIN (see backend's
   * Child.PinHash) — null/omitted for a local-only child (childId null),
   * which has no backend account to carry one. Gates switching into this
   * child's account from the family gate or the sidebar ChildSwitcher
   * whenever the session isn't already authedAsParent. */
  hasPin?: boolean;
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
 *  same idea as Udemy's lecture notes: captured at the real playback
 *  position (YoutubePlayerHandle.getCurrentTime), listed in video order (not
 *  creation order), and clickable to jump the player straight back there. */
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

/** A full child profile: identity fields (from ChildProfileInput) plus all
 *  per-child progress state. Multi-child support (see the approved redesign
 *  plan's §4) moved every progress field that used to live flat on AppState
 *  onto each child individually, keyed by `localId` — a client-generated id
 *  that's stable for both backend-synced and local-only children, used for
 *  routing/switching since `childId` is null for the latter. */
export interface ChildProfile extends ChildProfileInput {
  localId: string;

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

  balance: number;
  transactions: WalletTx[];
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

/** Builds a brand-new child profile: the given identity fields plus the same
 *  demo-seeded progress defaults every single child got before multi-child
 *  support existed (xp/streak/watch-progress/wallet seed) — preserved as-is
 *  rather than reconsidered, since seeding fresh demo progress on every new
 *  profile is existing, deliberate app behavior (see root CLAUDE.md), not
 *  something this migration should change. */
function createChildProfile(input: ChildProfileInput): ChildProfile {
  return {
    ...input,
    localId: crypto.randomUUID(),
    xp: 1250,
    streakDays: 7,
    habitDone: { ...initialHabitDone },
    watchedPct: { ...seedWatchedPct },
    videoNotes: { ...seedVideoNotes },
    videoCompletionDates: {},
    likedPosts: {},
    redeemedRewards: {},
    gameHistory: [],
    focusLockUntil: null,
    focusMinutes: 15,
    balance: 15.5,
    transactions: [...initialTx],
  };
}

/** Applies `updater` to the currently active child and returns the
 *  `{ children }` patch for `set(...)` — or `{}` (a no-op patch) if there is
 *  no active child, which should only happen before any child exists yet. */
function withActiveChild(
  state: Pick<AppState, 'children' | 'activeChildId'>,
  updater: (child: ChildProfile) => Partial<ChildProfile>,
): Partial<AppState> {
  const idx = state.children.findIndex((c) => c.localId === state.activeChildId);
  if (idx === -1) return {};
  const children = [...state.children];
  children[idx] = { ...children[idx], ...updater(children[idx]) };
  return { children };
}

export interface AppState {
  // identity
  parent: ParentProfile | null;
  children: ChildProfile[];
  /** Which of `children` the rest of the app currently reads/writes through
   * `useActiveChild()`/`getActiveChild()`. */
  activeChildId: string | null;
  pin: string;
  authedAsParent: boolean;

  // actions
  setParent: (p: ParentProfile) => void;
  /** Bulk-hydrates the family's children (LoginPage, after fetching them from
   * the backend). Preserves already-known children's local progress by
   * matching on `childId` — rebuilding every entry from scratch on every
   * login would otherwise silently reset XP/habits/etc. for a returning
   * parent on the same device. Children not already known locally (a new
   * device, or one added elsewhere) get a freshly seeded profile. */
  setChildren: (children: ChildProfileInput[]) => void;
  /** Appends one new child (AddChildPage). Auto-activates it only if it's the
   * family's first child, matching the old zero-friction single-child
   * behavior — adding a second+ child never silently switches who's active. */
  addChild: (c: ChildProfileInput) => void;
  setActiveChildId: (localId: string) => void;
  setPin: (pin: string) => void;
  /** Local-only comparison — the fallback path for a "davam edə bilərsən"
   * profile with no backend account at all (nothing to verify a PIN against
   * server-side). Every real backend-synced family goes through
   * verifyPinAsync instead, which calls this only as that same fallback. */
  tryPin: (pin: string) => boolean;
  /** The real parent-gate check — backend-verified (POST /api/identity/
   * verify-pin) when this is a backend-synced family, otherwise the same
   * local tryPin comparison as before. Throws on a network/server error
   * (callers should fail closed — never treat a thrown error as "PIN
   * correct"), resolves to false on a genuinely wrong PIN. */
  verifyPinAsync: (pin: string) => Promise<boolean>;
  /** Backend-synced: POST /api/identity/change-pin (re-verifies currentPin
   * server-side, throws with the backend's message on a mismatch or a
   * malformed newPin). Local-only: compares currentPin against the local
   * `pin` itself (there's no backend account to verify against), throwing
   * the same shape of error on a mismatch so both paths can be handled
   * identically by the caller. */
  changePinAsync: (currentPin: string, newPin: string) => Promise<void>;
  /** POST /api/identity/children/{childId}/verify-pin — only meaningful for a
   * backend-synced child (childId not null); callers should skip this
   * entirely for a local-only child or one whose hasPin is false, same "no
   * PIN set = open" rule the backend itself also applies as a fallback.
   * Throws on a network/server error, same fail-closed contract as
   * verifyPinAsync — never treat a thrown error as "PIN correct." */
  verifyChildPinAsync: (childId: string, pin: string) => Promise<boolean>;
  /** POST /api/identity/children/{childId}/set-pin — a parent setting (newPin
   * a 4-digit string) or clearing (newPin null) one child's PIN. Updates the
   * matching child's local hasPin on success so the UI reflects it without a
   * full re-fetch. */
  setChildPinAsync: (childId: string, newPin: string | null) => Promise<void>;
  logoutParent: () => void;
  resetAll: () => void;

  addXp: (amount: number) => void;
  /** Overwrites the active child's xp with the real backend ledger total
   * (AppShell calls this on load for a backend-synced child) — reconciles the
   * local, optimistically-updated counter against the number a spend attempt
   * actually checks server-side, so the displayed XP can't silently drift
   * into claiming more than what's really there to spend. */
  syncXp: (amount: number) => void;
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
      children: [],
      activeChildId: null,
      pin: '1234',
      authedAsParent: false,

      setParent: (p) => set({ parent: p }),

      setChildren: (incoming) =>
        set((s) => {
          const children = incoming.map((input) => {
            const existing = s.children.find((c) => c.childId !== null && c.childId === input.childId);
            return existing ? { ...existing, ...input } : createChildProfile(input);
          });
          const activeStillPresent = children.some((c) => c.localId === s.activeChildId);
          // Always fall back to the first real child when the previous
          // active one is gone — previously this only happened for a
          // single-child family (children.length === 1), leaving
          // activeChildId null on a fresh-device login for a multi-child
          // family until a child card was explicitly clicked. Every page
          // keyed off useActiveChild() treats null the same as "no backend
          // account," so this silently fell back to local mock data on
          // Sosial/Analitika for a real, logged-in multi-child family.
          return {
            children,
            activeChildId: activeStillPresent ? s.activeChildId : (children[0]?.localId ?? null),
          };
        }),

      addChild: (input) =>
        set((s) => {
          const profile = createChildProfile(input);
          return {
            children: [...s.children, profile],
            activeChildId: s.children.length === 0 ? profile.localId : s.activeChildId,
          };
        }),

      setActiveChildId: (localId) => set({ activeChildId: localId }),

      setPin: (pin) => set({ pin }),
      tryPin: (pin) => {
        const ok = pin === get().pin;
        if (ok) set({ authedAsParent: true });
        return ok;
      },

      verifyPinAsync: async (pin) => {
        const { parent } = get();
        if (parent?.token) {
          const ok = await verifyPinApi(pin, parent.token);
          if (ok) set({ authedAsParent: true });
          return ok;
        }
        return get().tryPin(pin);
      },

      changePinAsync: async (currentPin, newPin) => {
        const { parent } = get();
        if (parent?.token) {
          await changePinApi(currentPin, newPin, parent.token);
          return;
        }
        if (currentPin !== get().pin) {
          throw new Error('Incorrect current PIN.');
        }
        get().setPin(newPin);
      },

      verifyChildPinAsync: async (childId, pin) => {
        const { parent } = get();
        if (!parent?.token) return true;
        return verifyChildPinApi(childId, pin, parent.token);
      },

      setChildPinAsync: async (childId, newPin) => {
        const { parent } = get();
        if (!parent?.token) return;
        await setChildPinApi(childId, newPin, parent.token);
        set((s) => ({
          children: s.children.map((c) => (c.childId === childId ? { ...c, hasPin: newPin !== null } : c)),
        }));
      },

      logoutParent: () => set({ authedAsParent: false }),
      resetAll: () =>
        set({
          parent: null,
          children: [],
          activeChildId: null,
          pin: '1234',
          authedAsParent: false,
        }),

      addXp: (amount) =>
        set((s) => withActiveChild(s, (c) => ({ xp: Math.max(0, c.xp + amount) }))),

      syncXp: (amount) => set((s) => withActiveChild(s, () => ({ xp: amount }))),

      toggleHabit: (id, xp) =>
        set((s) =>
          withActiveChild(s, (c) => {
            const nowDone = !c.habitDone[id];
            return {
              habitDone: { ...c.habitDone, [id]: nowDone },
              xp: Math.max(0, c.xp + (nowDone ? xp : -xp)),
            };
          }),
        ),

      setWatchedPct: (videoId, pct) =>
        set((s) => withActiveChild(s, (c) => ({ watchedPct: { ...c.watchedPct, [videoId]: pct } }))),

      addVideoNote: (videoId, timestampSeconds, text) =>
        set((s) =>
          withActiveChild(s, (c) => {
            const note: VideoNote = {
              id: `note-${Date.now()}`,
              timestampSeconds,
              timestampLabel: formatTime(timestampSeconds),
              text,
              createdAt: Date.now(),
            };
            const existing = c.videoNotes[videoId] ?? [];
            // Udemy-style: shown by video position, not add order.
            const next = [...existing, note].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
            return { videoNotes: { ...c.videoNotes, [videoId]: next } };
          }),
        ),

      recordVideoCompletion: (videoId, date) =>
        set((s) =>
          withActiveChild(s, (c) =>
            c.videoCompletionDates[videoId]
              ? {}
              : { videoCompletionDates: { ...c.videoCompletionDates, [videoId]: date } },
          ),
        ),

      toggleLike: (postId) =>
        set((s) => withActiveChild(s, (c) => ({ likedPosts: { ...c.likedPosts, [postId]: !c.likedPosts[postId] } }))),

      redeemReward: (id, costXp) => {
        const s = get();
        const active = s.children.find((c) => c.localId === s.activeChildId);
        if (!active || active.redeemedRewards[id] || active.xp < costXp) return false;
        set((s2) =>
          withActiveChild(s2, (c) => ({
            redeemedRewards: { ...c.redeemedRewards, [id]: true },
            xp: c.xp - costXp,
          })),
        );
        return true;
      },

      recordGameResult: (r) =>
        set((s) =>
          withActiveChild(s, (c) => ({
            gameHistory: [{ ...r, playedAt: Date.now() }, ...c.gameHistory].slice(0, 30),
          })),
        ),

      startFocusLock: (minutes) =>
        set((s) => withActiveChild(s, () => ({ focusLockUntil: Date.now() + minutes * 60_000, focusMinutes: minutes }))),
      syncFocusLockUntil: (until) => set((s) => withActiveChild(s, () => ({ focusLockUntil: until }))),
      clearFocusLock: () => set((s) => withActiveChild(s, () => ({ focusLockUntil: null }))),

      donate: (label, xpCost, aznAmount) => {
        const s = get();
        const active = s.children.find((c) => c.localId === s.activeChildId);
        if (!active || active.xp < xpCost) return false;
        const tx: WalletTx = {
          id: `tx-${Date.now()}`,
          title: label,
          when: formatAzDate(new Date()),
          amount: aznAmount,
          direction: 'out',
        };
        set((s2) => withActiveChild(s2, (c) => ({ xp: c.xp - xpCost, transactions: [tx, ...c.transactions] })));
        return true;
      },
    }),
    {
      name: 'simart-app-state',
      // v7: multi-child support — `child: ChildProfile | null` became
      // `children: ChildProfile[]` + `activeChildId`, with every per-child
      // progress field (xp, habitDone, watchedPct, …) moving off flat
      // top-level state onto each ChildProfile. Unlike the v5->v6 bump (which
      // discarded stale state outright), this one migrates a single existing
      // child forward into the new shape instead of losing their progress.
      version: 7,
      migrate: (persisted, version) => {
        const p = persisted as Record<string, unknown> | null;
        if (version >= 7 || !p) return persisted as AppState;

        const children: ChildProfile[] = [];
        const oldChild = p.child as (ChildProfileInput & Record<string, unknown>) | null | undefined;
        if (oldChild) {
          children.push({
            localId: crypto.randomUUID(),
            childId: oldChild.childId ?? null,
            name: oldChild.name as string,
            avatar: oldChild.avatar as string,
            gender: oldChild.gender as 'boy' | 'girl',
            dobDay: oldChild.dobDay as string,
            dobMonth: oldChild.dobMonth as string,
            dobYear: oldChild.dobYear as string,
            city: oldChild.city as string,
            age: oldChild.age as number,
            xp: (p.xp as number) ?? 1250,
            streakDays: (p.streakDays as number) ?? 7,
            habitDone: (p.habitDone as Record<string, boolean>) ?? {},
            watchedPct: (p.watchedPct as Record<string, number>) ?? {},
            videoNotes: (p.videoNotes as Record<string, VideoNote[]>) ?? {},
            videoCompletionDates: (p.videoCompletionDates as Record<string, string>) ?? {},
            likedPosts: (p.likedPosts as Record<string, boolean>) ?? {},
            redeemedRewards: (p.redeemedRewards as Record<string, boolean>) ?? {},
            gameHistory: (p.gameHistory as GameResult[]) ?? [],
            focusLockUntil: (p.focusLockUntil as number | null) ?? null,
            focusMinutes: (p.focusMinutes as number) ?? 15,
            balance: (p.balance as number) ?? 15.5,
            transactions: (p.transactions as WalletTx[]) ?? [],
          });
        }

        return {
          parent: (p.parent as AppState['parent']) ?? null,
          children,
          activeChildId: children[0]?.localId ?? null,
          pin: (p.pin as string) ?? '1234',
          authedAsParent: (p.authedAsParent as boolean) ?? false,
        } as AppState;
      },
    },
  ),
);

// Stable fallback references for pages reading a per-child field with
// `child?.field ?? ...` before any child exists — a literal `{}`/`[]` there
// would be a new object every render, which trips exhaustive-deps lint rules
// on any useMemo/useEffect that depends on it.
export const EMPTY_RECORD: Record<string, never> = {};
export const EMPTY_ARRAY: readonly never[] = [];

/** Reads the currently active child inside a React component (re-renders on
 *  change, like any other store selector). Returns null before any child
 *  exists or while the active selection hasn't settled. */
export function useActiveChild(): ChildProfile | null {
  return useAppStore((s) => s.children.find((c) => c.localId === s.activeChildId) ?? null);
}

/** Same as useActiveChild, but a plain function for use outside React render
 *  (event handlers, effects, one-off reads) — mirrors useAppStore.getState(). */
export function getActiveChild(): ChildProfile | null {
  const s = useAppStore.getState();
  return s.children.find((c) => c.localId === s.activeChildId) ?? null;
}

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
