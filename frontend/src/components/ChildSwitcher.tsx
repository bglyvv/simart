import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppStore, useActiveChild } from '../store/useAppStore';

/** Lets a parent switch which child the app is currently acting as — hidden
 *  entirely for a single-child family so the common case stays exactly as
 *  simple as before multi-child support existed. */
export default function ChildSwitcher() {
  const children = useAppStore((s) => s.children);
  const setActiveChildId = useAppStore((s) => s.setActiveChildId);
  const active = useActiveChild();
  const [open, setOpen] = useState(false);

  if (children.length <= 1) return null;

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
        <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-sm border border-border bg-surface shadow-float">
          {children.map((c) => (
            <button
              key={c.localId}
              onClick={() => {
                setActiveChildId(c.localId);
                setOpen(false);
              }}
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
    </div>
  );
}
