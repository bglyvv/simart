import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Check, Settings as SettingsIcon, Plus, Sparkles, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton, XpPill, IconButton, NotificationBell } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import IconTile from '../components/ui/IconTile';
import Button from '../components/ui/Button';
import XpBurst, { type XpBurstItem } from '../components/ui/XpBurst';
import { Icon } from '../lib/icons';
import { KidWithClipboard } from '../components/illustrations/Illustrations';
import { useAppStore, useActiveChild, LEAGUE_TIERS, EMPTY_RECORD } from '../store/useAppStore';
import { useActivityStore } from '../store/useActivityStore';
import { celebrate } from '../lib/confetti';
import { todayIso } from '../lib/dob';
import { fetchScreenTime } from '../lib/focusService';
import {
  fetchHabitCategories,
  fetchHabitCompletions,
  fetchHabitStreak,
  completeHabitTask,
  uncompleteHabitTask,
  createFamilyHabitTask,
  MAX_FAMILY_TASKS,
  MAX_TASK_XP,
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

type HabitDayState = 'done' | 'today' | 'upcoming' | 'missed';

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
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const addXp = useAppStore((s) => s.addXp);
  const habitDone = child?.habitDone ?? EMPTY_RECORD;
  const toggleHabit = useAppStore((s) => s.toggleHabit);
  const streakDays = child?.streakDays ?? 0;
  const addActivity = useActivityStore((s) => s.addEntry);

  // A child added through the real signup/login flow has both a familyId (on
  // the parent) and a childId (on the child) — only then do real catalog +
  // completions exist to read from. A child added via the standalone "davam
  // edə bilərsən" path has neither, and keeps the exact old mock-JSON
  // behavior below, same split AddChildPage already made for signup itself.
  const useBackend = !!(parent?.familyId && child?.childId);
  // Creating/configuring a habit (title, XP value, which sibling it goes to)
  // is a parent action — this page itself isn't PIN-gated (a child uses it
  // every day), so the create-habit entry point only renders once the parent
  // has actually unlocked the dashboard this session, same session flag
  // Liqalar's redeem lock already uses in the other direction.
  const authedAsParent = useAppStore((s) => s.authedAsParent);
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

  function loadFromBackend() {
    if (!parent?.familyId || !child?.childId) return;
    setLoadError(false);
    Promise.all([
      fetchHabitCategories({ familyId: parent.familyId, token: parent.token, childId: child.childId }),
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

  // Real for backend-mode families once the first streak fetch resolves.
  // "today" and "missed" now each get their own icon+treatment below instead
  // of collapsing into a plain color-only circle — color alone isn't enough
  // to tell a past miss apart from a day that simply hasn't happened yet.
  const weeklyStreakDisplay = useMemo(() => {
    if (useBackend && streak) {
      return {
        badgeDays: streak.consecutiveDays,
        days: streak.week.map((d, i) => ({ label: AZ_DAY_LABELS[i], state: d.state })),
      };
    }
    return {
      badgeDays: streakDays,
      days: habitsData.weeklyStreak.days.map((d) => ({ ...d, state: d.state as HabitDayState })),
    };
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
          addActivity({
            type: 'habit_completed',
            text: `${child?.name ?? 'Uşaq'}: "${row.title}" tamamlandı (+${result.xpAwarded} XP)`,
          });
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
            <NotificationBell />
            <IconButton onClick={() => navigate('/tənzimləmələr')}><SettingsIcon size={17} /></IconButton>
            <AvatarButton initials={child?.name?.slice(0, 2).toUpperCase() ?? 'KB'} />
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <Card variant="soft" padding="lg" className="flex items-center justify-between gap-6 overflow-hidden">
            <div>
              <h2 className="font-display text-h3 font-semibold text-text-900">Gündəlik Vərdişlər</h2>
              <p className="mt-1 text-body-sm text-text-500">
                {child?.name ?? 'Uşaq'} üçün bugünkü tapşırıq matrisini tamamla!
              </p>
            </div>
            <KidWithClipboard className="hidden h-24 w-auto shrink-0 sm:block" />
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <Card className="bg-primary text-white" padding="lg">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-h4 font-semibold">Bugünkü Tərəqqi</h3>
                <span className="text-body-sm font-bold text-white/80">{todayDone} / {todayTotal}</span>
              </div>
              <div className="mt-4">
                <ProgressBar
                  percent={todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}
                  tone="white-on-dark"
                  trackClassName="bg-white/20"
                />
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon="star" tint="purple-100" value={xp.toLocaleString('az-AZ')} label="Ümumi xal" />
              <StatTile icon="target" tint="blue-100" value={todayTotal} label="Aktiv vərdiş" />
              <StatTile icon="check" tint="green-100" value={todayDone} label="Tamamlanan" />
              <StatTile icon="flame" tint="amber-100" value={`${weeklyStreakDisplay.badgeDays} gün`} label="Ardıcıl seriya" />
            </div>

            {useBackend && authedAsParent && parent?.familyId && child?.childId && (
              <NewHabitCard
                familyId={parent.familyId}
                token={parent.token}
                activeChildId={child.childId}
                onCreated={loadFromBackend}
              />
            )}

            {useBackend && !categories && !loadError && (
              <Card padding="lg"><p className="text-body-sm text-text-400">Yüklənir...</p></Card>
            )}
            {useBackend && loadError && (
              <Card padding="lg">
                <p className="text-body-sm text-error">Vərdişlər yüklənmədi — backend işə düşübmü?</p>
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
                          row.done ? 'bg-success-tint' : 'hover:bg-surface-alt'
                        }`}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            row.done ? 'border-success bg-success text-white' : 'border-border'
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
                        <span className={`text-body-sm font-bold ${row.done ? 'text-success' : 'text-text-400'}`}>
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
                <span className="rounded-full bg-sand-tint px-3 py-1 text-caption font-bold text-sand-text">🔥 {weeklyStreakDisplay.badgeDays} GÜN</span>
              </div>
              <div className="flex justify-between gap-1">
                {weeklyStreakDisplay.days.map((d) => (
                  <div key={d.label} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                        d.state === 'done'
                          ? 'bg-success text-white'
                          : d.state === 'today'
                            ? 'bg-primary text-white'
                            : d.state === 'missed'
                              ? 'bg-error-tint text-error'
                              : 'bg-border text-text-400'
                      }`}
                    >
                      {d.state === 'done' && <Icon name="check" size={13} />}
                      {d.state === 'today' && <Clock size={13} />}
                      {d.state === 'missed' && <X size={13} />}
                    </div>
                    <span className="text-[11px] text-text-400">{d.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="relative overflow-visible bg-primary text-white" padding="lg">
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
            </Card>
          </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

/** A small colorful stat tile — the "Ümumi xal / Aktiv vərdiş / Tamamlanan /
 * Ardıcıl seriya" row the PDF's primary Habits mockup shows under "Bugünkü
 * Tərəqqi", built entirely from values this page already computes (no new
 * data fetch). */
function StatTile({ icon, tint, value, label }: { icon: string; tint: string; value: string | number; label: string }) {
  return (
    <Card padding="sm" className="flex flex-col gap-2">
      <IconTile icon={<Icon name={icon} size={16} />} tint={tint} size="sm" />
      <div>
        <p className="font-display text-h4 font-semibold text-text-900">{value}</p>
        <p className="text-caption text-text-500">{label}</p>
      </div>
    </Card>
  );
}

/** Moved here from SettingsPage.tsx — "there should be places to add habits"
 * for the family itself, now with a per-child assignment picker
 * (HabitTaskAssignment, see backend/README.md) instead of silently going to
 * every child in the family. Capped at MAX_FAMILY_TASKS/family and
 * MAX_TASK_XP/task — enforced again server-side, this is just so the form
 * can disable itself instead of waiting on a 409/400 round trip. */
function NewHabitCard({
  familyId,
  token,
  activeChildId,
  onCreated,
}: {
  familyId: string;
  token: string;
  activeChildId: string;
  onCreated: () => void;
}) {
  const allChildren = useAppStore((s) => s.children).filter((c) => !!c.childId);
  const [categories, setCategories] = useState<BackendHabitCategory[] | null>(null);
  const [customCount, setCustomCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [xpValue, setXpValue] = useState('5');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(() => [activeChildId]);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetchHabitCategories({ familyId, token })
      .then((cats) => {
        setCategories(cats);
        setCategoryId((current) => current || cats[0]?.id || '');
        setCustomCount(cats.flatMap((c) => c.tasks.filter((t) => t.isCustom)).length);
      })
      .catch((err) => console.error('Vərdişlər yüklənmədi:', err));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [familyId]);

  const atLimit = customCount >= MAX_FAMILY_TASKS;

  function toggleChild(childId: string) {
    setSelectedChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      toast.error('Kateqoriya seçin.');
      return;
    }
    if (!title.trim()) {
      toast.error('Vərdişin başlığı tələb olunur.');
      return;
    }
    const xp = Number(xpValue);
    if (!Number.isFinite(xp) || xp <= 0 || xp > MAX_TASK_XP) {
      toast.error(`XP 1 ilə ${MAX_TASK_XP} arasında olmalıdır.`);
      return;
    }
    if (selectedChildIds.length === 0) {
      toast.error('Ən azı bir uşaq seçin.');
      return;
    }
    setSubmitting(true);
    try {
      await createFamilyHabitTask(
        familyId,
        { categoryId, title: title.trim(), note: note.trim() || undefined, xpValue: xp, childIds: selectedChildIds },
        token,
      );
      toast.success(`"${title.trim()}" vərdişi əlavə edildi.`);
      setTitle('');
      setNote('');
      setXpValue('5');
      setSelectedChildIds([activeChildId]);
      setOpen(false);
      load();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vərdiş əlavə edilə bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm" disabled={atLimit || !categories}>
        <Plus size={15} /> {atLimit ? `Limitə çatdınız (${customCount}/${MAX_FAMILY_TASKS})` : 'Yeni Vərdiş'}
      </Button>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display font-semibold text-text-900">Yeni Vərdiş</h3>
        <span className="text-caption font-bold text-text-400">{customCount} / {MAX_FAMILY_TASKS}</span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">KATEQORİYA</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-primary"
          >
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">BAŞLIQ</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Otağı yığışdırmaq"
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-primary"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">QEYD (OPSİONAL)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Qeyd"
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-primary"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">XP (maks. {MAX_TASK_XP})</span>
          <input
            value={xpValue}
            onChange={(e) => setXpValue(e.target.value)}
            type="number"
            min={1}
            max={MAX_TASK_XP}
            className="h-11 w-28 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-primary"
          />
        </label>
        {allChildren.length > 1 && (
          <fieldset>
            <legend className="mb-1.5 block text-caption font-bold text-text-700">KİMƏ AİD OLSUN</legend>
            <div className="flex flex-wrap gap-2">
              {allChildren.map((c) => {
                const selected = selectedChildIds.includes(c.childId!);
                return (
                  <button
                    key={c.localId}
                    type="button"
                    onClick={() => toggleChild(c.childId!)}
                    aria-pressed={selected}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-body-sm font-semibold transition-colors ${
                      selected ? 'border-success bg-success-tint text-success' : 'border-border text-text-500'
                    }`}
                  >
                    <span>{c.avatar}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" variant="success" disabled={submitting}>
            {submitting ? 'Yaradılır...' : <><Sparkles size={14} /> Yarat</>}
          </Button>
          <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="sm">
            Ləğv et
          </Button>
        </div>
      </form>
    </Card>
  );
}
