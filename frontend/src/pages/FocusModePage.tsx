import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Icon } from '../lib/icons';
import { useAppStore, useActiveChild } from '../store/useAppStore';
import { celebrate } from '../lib/confetti';
import { fetchActiveFocusLock } from '../lib/focusService';
import data from '../data/focusMode.json';

export default function FocusModePage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const focusLockUntil = child?.focusLockUntil ?? null;
  const startFocusLock = useAppStore((s) => s.startFocusLock);
  const syncFocusLockUntil = useAppStore((s) => s.syncFocusLockUntil);
  const clearFocusLock = useAppStore((s) => s.clearFocusLock);
  const addXp = useAppStore((s) => s.addXp);
  const [doneSuggestions, setDoneSuggestions] = useState<Record<number, boolean>>({});
  const [, forceTick] = useState(0);

  const useBackend = !!(parent?.familyId && child?.childId);

  // Backend-synced: read the real lock back (so it survives a reload/different
  // device) instead of ever inventing one locally — only AnimationsPage's real
  // "2 videos completed today" trigger is allowed to start one. No active lock
  // means there's nothing to show here, so bounce back rather than stranding
  // the child on an empty countdown.
  //
  // Local-only (no backend account): preserve the original demo behavior —
  // auto-start a short lock so this page is still explorable on its own.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!useBackend) {
      if (!focusLockUntil) startFocusLock(1);
      return;
    }
    if (!parent || !child?.childId) return;
    let cancelled = false;
    fetchActiveFocusLock(child.childId, parent.token)
      .then((lock) => {
        if (cancelled) return;
        if (lock) {
          syncFocusLockUntil(new Date(lock.lockedUntil).getTime());
        } else {
          navigate('/animasiya', { replace: true });
        }
      })
      .catch((err) => {
        console.error('Fokus kilidi yüklənmədi:', err);
        if (!cancelled) navigate('/animasiya', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [useBackend, parent?.familyId, child?.childId]);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = focusLockUntil ? Math.max(0, focusLockUntil - Date.now()) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const unlocked = focusLockUntil !== null && remainingMs <= 0;

  function markSuggestion(i: number, xpLabel: string | null) {
    if (doneSuggestions[i]) return;
    setDoneSuggestions((d) => ({ ...d, [i]: true }));
    if (xpLabel) {
      addXp(Number(xpLabel.replace(/[^0-9]/g, '')));
      celebrate();
    }
  }

  function goWatch() {
    clearFocusLock();
    toast.success('Pleyerin kilidi açıldı!');
    navigate('/animasiya');
  }

  return (
    <AppShell>
      <Topbar
        title={`${child?.name ?? 'Uşaq'} (${child?.age ?? 6} yaş)`}
        subtitle={unlocked ? 'İstirahət tamamlandı' : '2 Video Limitinə Çatıldı'}
        onMenuClick={openMenu}
        actions={
          <>
            <Badge tone={unlocked ? 'green' : 'red'}>{unlocked ? '🔓 AÇIQDIR' : data.topbar.badge}</Badge>
            <AvatarButton initials={child?.name?.slice(0, 2).toUpperCase() ?? 'KB'} />
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center justify-center bg-surface-alt px-4 py-12">
        <div className="flex w-full max-w-xl flex-col items-center gap-6">
          <motion.div
            animate={unlocked ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.6 }}
            className={`flex size-48 items-center justify-center rounded-full border-4 sm:size-56 ${unlocked ? 'border-success bg-success-tint' : 'border-primary bg-surface'}`}
          >
            <div className="flex size-40 flex-col items-center justify-center gap-1 rounded-full bg-surface sm:size-48">
              <p className="font-display text-[clamp(28px,5vw,40px)] font-semibold text-text-900">
                {unlocked ? '✓' : `${mins}:${String(secs).padStart(2, '0')}`}
              </p>
              <p className="text-body-sm text-text-500">{data.panel.countdownLabel}</p>
            </div>
          </motion.div>

          <p className="text-center font-display text-[clamp(22px,3.5vw,30px)] font-semibold text-text-900">
            {unlocked ? 'Əla! Gözlərin istirahət etdi 🎉' : data.panel.title}
          </p>
          <p className="max-w-md text-center text-base text-text-500">{data.panel.description}</p>

          <div className="flex w-full flex-col gap-2.5">
            <p className="text-body-sm font-bold text-text-500">{data.panel.suggestionsLabel}</p>
            {data.panel.suggestions.map((s, i) => {
              const done = !!doneSuggestions[i];
              return (
                <motion.button
                  key={s.text}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => markSuggestion(i, s.xp)}
                  className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    done ? 'border-success/40 bg-success-tint' : 'border-border bg-surface hover:bg-border-soft'
                  }`}
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-alt ${done ? 'text-success' : 'text-text-700'}`}>
                    <Icon name={done ? 'check-circle' : s.icon} size={18} />
                  </span>
                  <span className="flex-1 text-body font-bold text-text-900">{s.text}</span>
                  {s.xp && <span className="text-body-sm font-bold text-success">{s.xp}</span>}
                </motion.button>
              );
            })}
          </div>

          {unlocked ? (
            <Button variant="success" full size="lg" onClick={goWatch}>
              <Unlock size={18} /> Animasiyaya Qayıt
            </Button>
          ) : (
            <div className="flex h-15 w-full items-center justify-center gap-2 rounded-xl border border-border text-text-500">
              <Lock size={16} /> Video Pleyer Kilidlidir ({mins}:{String(secs).padStart(2, '0')})
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
