import { AnimatePresence, motion } from 'framer-motion';

export interface XpBurstItem {
  id: number;
  amount: number;
  /** e.g. "🔥 3 gün seriya" — shown under the amount when there's a bonus to call out. */
  note?: string;
}

/** A floating "+N XP" badge that rises and fades — the live feedback for a
 * dynamic XP award (task base + streak bonus). Render this inside a
 * `position: relative` container positioned where the XP itself lives (the
 * XP summary card, a habit row, …); each item removes itself from the caller's
 * state after it finishes animating — see the `onDone` callback. */
export default function XpBurst({ items, onDone }: { items: XpBurstItem[]; onDone: (id: number) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-visible">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: -36, scale: 1 }}
            exit={{ opacity: 0, y: -56 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            onAnimationComplete={() => onDone(item.id)}
            className="absolute flex flex-col items-center gap-0.5"
          >
            <span className="rounded-full bg-amber-400 px-3 py-1 text-body-sm font-bold text-white shadow-lg">
              +{item.amount} XP
            </span>
            {item.note && (
              <span className="rounded-full bg-white px-2 py-0.5 text-caption font-bold text-amber-700 shadow">
                {item.note}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
