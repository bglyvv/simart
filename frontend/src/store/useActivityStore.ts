import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** A small, local "recent activity" log — real events this device actually
 *  saw succeed (habit completions, reward redemptions/approvals, allowance
 *  grants), not a synced cross-device notification system. There is no
 *  backend notifications table (see root CLAUDE.md's Phase 7 note): this is
 *  explicitly scoped to real, already-available events rather than inventing
 *  one. Capped at 50 entries, newest first. */
export type ActivityType =
  | 'habit_completed'
  | 'reward_redeemed'
  | 'reward_approved'
  | 'reward_rejected'
  | 'allowance_granted';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  text: string;
  timestamp: number;
}

interface ActivityState {
  entries: ActivityEntry[];
  /** Entries with timestamp > lastSeenAt render as unread. A localStorage-only
   *  shim, not a real backend read/unread flag. */
  lastSeenAt: number;
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
  markAllSeen: () => void;
}

const MAX_ENTRIES = 50;

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      entries: [],
      lastSeenAt: 0,
      addEntry: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() }, ...s.entries].slice(
            0,
            MAX_ENTRIES,
          ),
        })),
      markAllSeen: () => set({ lastSeenAt: Date.now() }),
    }),
    { name: 'simart-activity-state', version: 1 },
  ),
);
