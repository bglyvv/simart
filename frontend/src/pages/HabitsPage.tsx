import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, Bell, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton, XpPill, IconButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import IconTile from '../components/ui/IconTile';
import Button from '../components/ui/Button';
import XpBurst, { type XpBurstItem } from '../components/ui/XpBurst';
import { Icon } from '../lib/icons';
import { useAppStore, LEAGUE_TIERS } from '../store/useAppStore';
import { celebrate, bigCelebrate } from '../lib/confetti';
import { todayIso } from '../lib/dob';
import { fetchScreenTime } from '../lib/focusService';
import {
  fetchHabitCategories,
  fetchHabitCompletions,
  fetchHabitStreak,
  completeHabitTask,
  uncompleteHabitTask,
  type HabitCategory as BackendHabitCategory,
  type HabitStreak,
} from '../lib/habitsService';
import habitsData from '../data/habits.json';
import { useNavigate } from 'react-router-dom';

function xpFromLabel(label: string) {
  return Number(label.replace(/[^0-9]/g, '')) || 0;
}

// Matches habits.json's static "1s 40dq" style — real now for a backend-synced
// child (see screenTimeSeconds below), via ScreenTimeEntry, a genuinely
// separate mechanism from the focus lock (see "Focus Mode" in root CLAUDE.md).
function formatScreenTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}s ${minutes}dq` : `${minutes}dq`;
}

const GROUP_TINTS = ['blue-100', 'purple-100', 'green-100', 'amber-100'];
// Monday-first, matching GetHabitStreakQueryHandler's week ordering.
const AZ_DAY_LABELS = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];

interface HabitRow {
  id: string;
  title: string;
  note: string;
  xpValue: number;
  done: boolean;
}

interface HabitGroup {
  key: string;
  icon: string;
  iconBg: string;
  title: string;
  rows: HabitRow[];
}

export default function HabitsPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const child = useAppStore((s) => s.child);
  const xp = useAppStore((s) => s.xp);
  const addXp = useAppStore((s) => s.addXp);
  const habitDone = useAppStore((s) => s.habitDone);
  const toggleHabit = useAppStore((s) => s.toggleHabit);
  const streakDays = useAppStore((s) => s.streakDays);

  // A child added through the real signup/login flow has both a familyId (on
  // the parent) and a childId (on the child) — only then do real catalog +
  // completions exist to read from. A child added via the standalone "davam
  // edə bilərsən" path has neither, and keeps the exact old mock-JSON
  // behavior below, same split AddChildPage already made for signup itself.
  const useBackend = !!(parent?.familyId && child?.childId);
  const today = todayIso();

  const [categories, setCategories] = useState<BackendHabitCategory[] | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  // How much XP each currently-completed task actually granted (base + whatever
  // streak bonus applied at the moment it was completed) — needed so
  // un-completing it later subtracts the real amount, not the task's current
  // static xpValue (which the streak bonus can push above).
  const [completedXp, setCompletedXp] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  // "Həftəlik Seriya" — was entirely static mock data before, even in backend
  // mode. Null until the first fetch resolves; stays null for the mock path,
  // which keeps using habitsData.weeklyStreak/useAppStore.streakDays below.
  const [streak, setStreak] = useState<HabitStreak | null>(null);
  // Real for a backend-synced child (AnimationsPage.tsx is what actually
  // accumulates it, via YoutubePlayer's onElapsedSeconds) — null until the
  // first fetch resolves, same "stays null, mock path untouched" shape as
  // `streak` above.
  const [screenTimeSeconds, setScreenTimeSeconds] = useState<number | null>(null);

  const [xpBursts, setXpBursts] = useState<XpBurstItem[]>([]);
  const burstIdRef = useRef(0);
  function fireXpBurst(amount: number, note?: string) {
    burstIdRef.current += 1;
    setXpBursts((prev) => [...prev, { id: burstIdRef.current, amount, note }]);
  }
  function clearXpBurst(id: number) {
    setXpBursts((prev) => prev.filter((b) => b.id !== id));
  }

  // The AI camera card is a flashy standalone demo (a fake progress timer, not
  // real computer vision) — in the mock path it happens to double as the
  // "Səhər/axşam diş fırçalamaq" row (same id, same habitDone entry); the real
  // catalog has no guaranteed equivalent task to tie it to, so in that mode it
  // just awards XP locally and doesn't persist across a reload.
  const [cameraLocalDone, setCameraLocalDone] = useState(false);
  const [cameraProgress, setCameraProgress] = useState(30);
  const [cameraRunning, setCameraRunning] = useState(false);

  function loadFromBackend() {
    if (!parent?.familyId || !child?.childId) return;
    setLoadError(false);
    Promise.all([
      fetchHabitCategories({ familyId: parent.familyId, token: parent.token }),
      fetchHabitCompletions(child.childId, today, parent.token),
      fetchHabitStreak(child.childId, today, parent.token),
    ])
      .then(([cats, completions, streakResult]) => {
        setCategories(cats);
        setCompletedTaskIds(new Set(completions.map((c) => c.taskId)));
        setCompletedXp(
          Object.fromEntries(completions.map((c) => [c.taskId, c.xpAwarded ?? 0])),
        );
        setStreak(streakResult);
      })
      .catch((err) => {
        console.error('Vərdişlər yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // Completing/un-completing a task can change today's streak state (e.g. the
  // first completion of the day flips today from "not yet counted" to part of
  // the streak) — refetch just the streak after each toggle rather than the
  // whole page, so the day-circles/badge stay accurate without a full reload.
  function refreshStreak() {
    if (!parent?.familyId || !child?.childId) return;
    fetchHabitStreak(child.childId, today, parent.token)
      .then(setStreak)
      .catch((err) => console.error('Seriya yenilənmədi:', err));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (useBackend) loadFromBackend();
  }, [useBackend, parent?.familyId, child?.childId]);

  useEffect(() => {
    if (!useBackend || !parent?.familyId || !child?.childId) return;
    let cancelled = false;
    fetchScreenTime(child.childId, today, parent.token)
      .then((result) => {
        if (!cancelled) setScreenTimeSeconds(result.totalSeconds);
      })
      .catch((err) => console.error('Ekran vaxtı yüklənmədi:', err));
    return () => {
      cancelled = true;
    };
  }, [useBackend, parent?.familyId, child?.childId, today]);

  const groups: HabitGroup[] = useMemo(() => {
    if (useBackend) {
      return (categories ?? []).map((cat, i) => ({
        key: cat.id,
        icon: cat.icon,
        iconBg: GROUP_TINTS[i % GROUP_TINTS.length],
        title: cat.title,
        rows: cat.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          note: t.note ?? (t.isCustom ? 'Ailənizin fərdi vərdişi' : ''),
          xpValue: t.xpValue,
          done: completedTaskIds.has(t.id),
        })),
      }));
    }
    return habitsData.categories.map((cat) => ({
      key: cat.key,
      icon: cat.icon,
      iconBg: cat.iconBg,
      title: cat.title,
      rows: cat.tasks.map((t, i) => ({
        id: `${cat.key}-${i}`,
        title: t.title,
        note: t.note,
        xpValue: xpFromLabel(t.xp),
        done: !!habitDone[`${cat.key}-${i}`],
      })),
    }));
  }, [useBackend, categories, completedTaskIds, habitDone]);

  // Real for backend-mode families once the first streak fetch resolves;
  // "missed" (a past day with no completion — a case the old static mock
  // never had to represent) renders identically to "upcoming", same plain
  // gray circle, no new visual state needed for it.
  const weeklyStreakDisplay = useMemo(() => {
    if (useBackend && streak) {
      return {
        badgeDays: streak.consecutiveDays,
        days: streak.week.map((d, i) => ({
          label: AZ_DAY_LABELS[i],
          state: d.state === 'missed' ? 'upcoming' : d.state,
        })),
      };
    }
    return { badgeDays: streakDays, days: habitsData.weeklyStreak.days };
  }, [useBackend, streak, streakDays]);

  const { todayDone, todayTotal } = useMemo(() => {
    let done = 0, total = 0;
    groups.forEach((g) => g.rows.forEach((r) => {
      total += 1;
      if (r.done) done += 1;
    }));
    return { todayDone: done, todayTotal: total };
  }, [groups]);

  const nextTier = LEAGUE_TIERS.find((t) => t.threshold > xp) ?? LEAGUE_TIERS[LEAGUE_TIERS.length - 1];
  const currentTierIdx = LEAGUE_TIERS.findIndex((t) => t === nextTier);
  const prevThreshold = currentTierIdx > 0 ? LEAGUE_TIERS[currentTierIdx - 1].threshold : 0;
  const progressPercent = ((xp - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100;

  const cameraDone = useBackend ? cameraLocalDone : !!habitDone['physical-1'];

  function runCamera() {
    if (cameraRunning || cameraDone) return;
    setCameraRunning(true);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(60, 30 + elapsed * 6);
      setCameraProgress(pct);
      if (pct >= 60) {
        clearInterval(timer);
        setCameraRunning(false);
        const xpAward = xpFromLabel(habitsData.categories[0].tasks[1].xp);
        if (useBackend) {
          setCameraLocalDone(true);
          addXp(xpAward);
        } else if (!habitDone['physical-1']) {
          toggleHabit('physical-1', xpAward);
        }
        celebrate();
        fireXpBurst(xpAward);
        toast.success(`Diş fırçalama təsdiqləndi! +${xpAward} XP`);
      }
    }, 200);
  }

  async function handleToggle(row: HabitRow) {
    if (useBackend) {
      if (!parent || !child?.childId || pendingTaskId) return;
      const wasDone = row.done;
      setPendingTaskId(row.id);
      try {
        if (wasDone) {
          await uncompleteHabitTask(child.childId, row.id, today, parent.token);
          setCompletedTaskIds((prev) => {
            const next = new Set(prev);
            next.delete(row.id);
            return next;
          });
          const awarded = completedXp[row.id] ?? row.xpValue;
          addXp(-awarded);
          setCompletedXp((prev) => {
            const next = { ...prev };
            delete next[row.id];
            return next;
          });
          refreshStreak();
        } else {
          const result = await completeHabitTask(child.childId, row.id, today, parent.token);
          setCompletedTaskIds((prev) => new Set(prev).add(row.id));
          setCompletedXp((prev) => ({ ...prev, [row.id]: result.xpAwarded }));
          addXp(result.xpAwarded);
          celebrate();
          const bonusNote = result.bonusXp > 0 ? `🔥 ${result.streakDays} gün seriya +${result.bonusXp} XP` : undefined;
          fireXpBurst(result.xpAwarded, bonusNote);
          toast.success(
            result.bonusXp > 0
              ? `${row.title} tamamlandı! +${result.xpAwarded} XP (${result.streakDays} günlük seriya bonusu!)`
              : `${row.title} tamamlandı! +${result.xpAwarded} XP`,
          );
          refreshStreak();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Əməliyyat uğursuz oldu.');
      } finally {
        setPendingTaskId(null);
      }
      return;
    }

    const wasDone = row.done;
    toggleHabit(row.id, row.xpValue);
    if (!wasDone) {
      celebrate();
      fireXpBurst(row.xpValue);
      toast.success(`${row.title} tamamlandı! +${row.xpValue} XP`);
    }
  }

  return (
    <AppShell>
      <Topbar
        title={habitsData.topbar.title}
        subtitle={`${child?.name ?? 'Uşaq'} üçün bugünkü tapşırıq matrisi`}
        onMenuClick={openMenu}
        actions={
          <>
            <XpPill>⭐ {xp.toLocaleString('az-AZ')} XP</XpPill>
            <IconButton><Bell size={17} /></IconButton>
            <IconButton onClick={() => navigate('/tənzimləmələr')}><SettingsIcon size={17} /></IconButton>
            <AvatarButton initials={child?.name?.slice(0, 2).toUpperCase() ?? 'KB'} />
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <Card className="bg-grad-primary text-white" padding="lg">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-caption font-bold uppercase tracking-wide">
                {cameraRunning ? 'AI Kamera İzləyir…' : 'AI Kamera Aktiv'}
              </span>
              <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-white/40">
                  <Camera size={26} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-h4 font-semibold">{habitsData.aiCameraTask.title}</h3>
                  <p className="mt-1 text-body-sm text-white/80">{habitsData.aiCameraTask.description}</p>
                </div>
                <Button variant="white" size="sm" onClick={runCamera} disabled={cameraDone}>
                  {cameraDone ? 'Təsdiqləndi ✓' : cameraRunning ? 'İzlənilir…' : 'Kameranı Aç'}
                </Button>
              </div>
              <div className="mt-4">
                <ProgressBar percent={(cameraProgress / 60) * 100} tone="white-on-dark" trackClassName="bg-white/20" />
                <p className="mt-2 text-body-sm text-white/70">{Math.round(cameraProgress)} / 60 saniyə</p>
              </div>
            </Card>

            {useBackend && !categories && !loadError && (
              <Card padding="lg"><p className="text-body-sm text-text-400">Yüklənir...</p></Card>
            )}
            {useBackend && loadError && (
              <Card padding="lg">
                <p className="text-body-sm text-red-600">Vərdişlər yüklənmədi — backend işə düşübmü?</p>
              </Card>
            )}
            {useBackend && categories && categories.length === 0 && (
              <Card padding="lg">
                <p className="text-body-sm text-text-400">Hələ heç bir vərdiş kateqoriyası yoxdur.</p>
              </Card>
            )}

            {groups.map((group) => {
              const doneInCat = group.rows.filter((r) => r.done).length;
              return (
                <Card key={group.key} padding="lg">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconTile icon={<Icon name={group.icon} size={20} />} tint={group.iconBg} />
                      <h3 className="font-display text-h4 font-semibold text-text-900">{group.title}</h3>
                    </div>
                    <span className="text-body-sm font-bold text-text-500">
                      {doneInCat} / {group.rows.length} tamamlandı
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.rows.map((row) => (
                      <motion.button
                        key={row.id}
                        whileTap={{ scale: 0.99 }}
                        disabled={pendingTaskId === row.id}
                        onClick={() => handleToggle(row)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                          row.done ? 'bg-green-50' : 'hover:bg-surface-alt'
                        }`}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            row.done ? 'border-green-600 bg-green-600 text-white' : 'border-border'
                          }`}
                        >
                          {row.done && <Check size={14} />}
                        </span>
                        <span className="flex-1">
                          <span className={`block text-body font-semibold ${row.done ? 'text-text-500 line-through' : 'text-text-900'}`}>
                            {row.title}
                          </span>
                          {row.note && <span className="block text-caption text-text-400">{row.note}</span>}
                        </span>
                        <span className={`text-body-sm font-bold ${row.done ? 'text-green-600' : 'text-text-400'}`}>
                          +{row.xpValue} XP
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col gap-6">
            <Card padding="lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display font-semibold text-text-900">Həftəlik Seriya</h3>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-caption font-bold text-amber-text">🔥 {weeklyStreakDisplay.badgeDays} GÜN</span>
              </div>
              <div className="flex justify-between gap-1">
                {weeklyStreakDisplay.days.map((d) => (
                  <div key={d.label} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                        d.state === 'done'
                          ? 'bg-green-600 text-white'
                          : d.state === 'today'
                            ? 'bg-grad-primary text-white'
                            : 'bg-border text-text-400'
                      }`}
                    >
                      {d.state === 'done' && <Icon name="check" size={13} />}
                    </div>
                    <span className="text-[11px] text-text-400">{d.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="relative overflow-visible bg-grad-primary text-white" padding="lg">
              <XpBurst items={xpBursts} onDone={clearXpBurst} />
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white">
                  <Icon name="star" size={20} />
                </span>
                <div>
                  <p className="font-display text-h4 font-semibold">{xp.toLocaleString('az-AZ')} XP</p>
                  <p className="text-body-sm text-white/75">Növbəti: {nextTier.threshold.toLocaleString('az-AZ')} XP</p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar percent={progressPercent} tone="white-on-dark" trackClassName="bg-white/20" />
              </div>
            </Card>

            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">Bugünkü Xülasə</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <IconTile icon={<Icon name="check-circle" size={20} />} tint="green-100" />
                  <div>
                    <p className="font-bold text-text-900">{todayDone} / {todayTotal}</p>
                    <p className="text-caption text-text-500">Tamamlanan tapşırıq</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <IconTile icon={<Icon name="timer" size={20} />} tint="blue-100" />
                  <div>
                    <p className="font-bold text-text-900">
                      {useBackend
                        ? screenTimeSeconds !== null
                          ? formatScreenTime(screenTimeSeconds)
                          : '...'
                        : habitsData.todayStats[1].value}
                    </p>
                    <p className="text-caption text-text-500">Bugünkü ekran vaxtı</p>
                  </div>
                </div>
              </div>
              {todayTotal > 0 && todayDone === todayTotal && (
                <Button
                  variant="success"
                  full
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    bigCelebrate();
                    toast.success('Bütün tapşırıqlar tamamlandı! Əla iş! 🎉');
                  }}
                >
                  Hamısı tamam — kutlanılsın! 🎉
                </Button>
              )}
            </Card>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
