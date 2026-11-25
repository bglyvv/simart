import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useAppStore, useActiveChild } from '../store/useAppStore';
import Modal from './ui/Modal';
import { THEME_OPTIONS, DEFAULT_THEME } from '../lib/themes';

/** A sticky, bottom-right theme picker — entirely a child's own thing. Never
 * rendered while authedAsParent is true: a parent always sees the app's
 * normal look (see AppShell.tsx's useApplyChildTheme), so there's nothing
 * here for them to toggle in the first place. The selected palette lives on
 * the active child's own profile (useAppStore's `theme` field), the same
 * "unique per child, local-only" shape as habitDone/watchedPct/etc. */
export default function ThemeFab() {
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const child = useActiveChild();
  const setChildTheme = useAppStore((s) => s.setChildTheme);
  const setThemeButtonHidden = useAppStore((s) => s.setThemeButtonHidden);
  const [open, setOpen] = useState(false);

  if (authedAsParent || !child) return null;

  const activeTheme = child.theme ?? DEFAULT_THEME;
  const hidden = !!child.themeButtonHidden;

  return (
    <>
      {hidden ? (
        // "Bu düyməni gizlət" shrinks it to a small, unobtrusive edge tab
        // instead of removing it outright — hiding it is a real preference
        // a child can act on, but it should never be a dead end with no way
        // back to the toggle that would un-hide it again.
        <button
          onClick={() => setOpen(true)}
          aria-label="Tema seçimini göstər"
          className="fixed bottom-20 right-0 z-40 flex h-9 w-5 items-center justify-center rounded-l-full bg-primary/50 text-white transition-colors hover:bg-primary md:bottom-6"
        >
          <Palette size={12} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Tema seç"
          className="fixed bottom-20 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-float transition-transform hover:scale-105 md:bottom-6"
        >
          <Palette size={22} />
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Tema Seç">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((t) => {
            const selected = t.id === activeTheme;
            return (
              <button
                key={t.id}
                onClick={() => setChildTheme(t.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors ${
                  selected ? 'border-primary bg-surface-alt' : 'border-border hover:bg-surface-alt'
                }`}
              >
                <span className="relative flex size-10 items-center justify-center rounded-full">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${t.swatch[0]} 0deg 120deg, ${t.swatch[1]} 120deg 240deg, ${t.swatch[2]} 240deg 360deg)`,
                    }}
                  />
                  {selected && (
                    <span className="relative flex size-5 items-center justify-center rounded-full bg-white text-primary shadow-soft">
                      <Check size={12} />
                    </span>
                  )}
                </span>
                <span className="text-caption font-bold text-text-700">{t.label}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-surface-alt px-4 py-3">
          <span className="text-body-sm font-semibold text-text-700">Bu düyməni gizlət</span>
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => {
              setThemeButtonHidden(e.target.checked);
              if (e.target.checked) setOpen(false);
            }}
            className="size-5 accent-primary"
          />
        </label>
      </Modal>
    </>
  );
}
