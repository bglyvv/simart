import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { useAppStore, useActiveChild } from '../store/useAppStore';
import Modal from './ui/Modal';
import PinPad from './ui/PinPad';

/** Lets a parent switch which child the app is currently acting as — hidden
 *  entirely for a single-child family so the common case stays exactly as
 *  simple as before multi-child support existed. A parent session
 *  (authedAsParent) switches freely, same as always — they already have full
 *  oversight. A plain child session switching into a *different* child who
 *  has their own PIN set (see Child.PinHash) now has to prove it first; this
 *  is the same gap the family gate's child cards had — any sibling could
 *  freely open any other sibling's account via this dropdown with zero
 *  protection before this. */
export default function ChildSwitcher() {
  const children = useAppStore((s) => s.children);
  const setActiveChildId = useAppStore((s) => s.setActiveChildId);
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const verifyChildPinAsync = useAppStore((s) => s.verifyChildPinAsync);
  const active = useActiveChild();
  const [open, setOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<string | null>(null);

  if (children.length <= 1) return null;

  const pinTargetChild = children.find((c) => c.localId === pinTarget);

  function handlePick(localId: string) {
    setOpen(false);
    if (localId === active?.localId) return;

    const target = children.find((c) => c.localId === localId);
    if (!authedAsParent && target?.childId && target.hasPin) {
      setPinTarget(localId);
      return;
    }
    setActiveChildId(localId);
  }

  // Same fail-closed posture as FamilyGatePage's own PIN checks — a network
  // error never counts as "correct."
  async function handlePinComplete(value: string) {
    if (!pinTargetChild?.childId) return undefined;
    try {
      const ok = await verifyChildPinAsync(pinTargetChild.childId, value);
      if (ok) {
        setActiveChildId(pinTargetChild.localId);
        setPinTarget(null);
      } else {
        toast.error('PIN yanlışdır, yenidən cəhd edin.');
      }
      return ok;
    } catch {
      toast.error('Serverə qoşulmaq mümkün olmadı. Yenidən cəhd edin.');
      return undefined;
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-left text-body-sm font-semibold text-text-900 hover:bg-surface-alt"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm">
          {active?.avatar}
        </span>
        <span className="min-w-0 flex-1 truncate">{active?.name}</span>
        <ChevronDown size={14} className={`shrink-0 text-text-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        // Opens upward (bottom-full), not downward — this switcher sits at
        // the very bottom of the sidebar, so a downward-opening panel had no
        // room to render and got clipped against the viewport edge.
        <div className="absolute inset-x-0 bottom-full z-10 mb-1 overflow-hidden rounded-sm border border-border bg-surface shadow-float">
          {children.map((c) => (
            <button
              key={c.localId}
              onClick={() => handlePick(c.localId)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm font-medium transition-colors ${
                c.localId === active?.localId ? 'bg-surface-alt text-text-900' : 'text-text-700 hover:bg-surface-alt'
              }`}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sm">
                {c.avatar}
              </span>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!pinTargetChild} onClose={() => setPinTarget(null)} title={`${pinTargetChild?.name ?? ''} üçün PIN`}>
        <div className="flex flex-col items-center">
          <p className="mb-5 text-center text-body-sm text-text-500">Davam etmək üçün öz PIN-inizi daxil edin.</p>
          <PinPad length={4} dark={false} onComplete={handlePinComplete} />
        </div>
      </Modal>
    </div>
  );
}
