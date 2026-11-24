import { useEffect, useState } from 'react';
import { Flame, Star, Trophy, Check, Clock } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { Icon } from '../lib/icons';
import { useAppStore, useActiveChild, LEAGUE_TIERS } from '../store/useAppStore';
import { fetchHabitStreak, type HabitStreak } from '../lib/habitsService';
import { fetchRewards, type Reward } from '../lib/leaguesService';
import { todayIso } from '../lib/dob';

const AZ_DAY_LABELS = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'];

/** UI_UX_SPEC.md Screen 08 — family/individual goals, progress, completion
 * history, achievement badges — composed entirely from data that already
 * exists elsewhere (habit streak, league XP, reward redemption status), not
 * a new backend concept. "Earned badges" = rewards already approved;
 * there's no dated redemption-history endpoint, so this can only show
 * current status per reward, not a timeline — see root CLAUDE.md's Phase 7
 * note. */
export default function GoalsPage() {
  const openMenu = useOpenMobileMenu();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const useBackend = !!(parent?.familyId && child?.childId);

  const [streak, setStreak] = useState<HabitStreak | null>(null);
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!useBackend || !parent || !child?.childId) return;
    let cancelled = false;
    Promise.all([
      fetchHabitStreak(child.childId, todayIso(), parent.token),
      fetchRewards(child.childId, parent.token),
    ])
      .then(([streakResult, rewardsResult]) => {
        if (cancelled) return;
        setStreak(streakResult);
        setRewards(rewardsResult);
      })
      .catch((err) => {
        console.error('Məqsədlər yüklənmədi:', err);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [useBackend, parent?.familyId, child?.childId]);

  const xp = child?.xp ?? 0;
  const streakDays = useBackend && streak ? streak.consecutiveDays : (child?.streakDays ?? 0);

  const currentTierIdx = [...LEAGUE_TIERS].reverse().findIndex((t) => xp >= t.threshold);
  const tierIdx = currentTierIdx === -1 ? 0 : LEAGUE_TIERS.length - 1 - currentTierIdx;
  const tier = LEAGUE_TIERS[tierIdx];
  const nextTier = LEAGUE_TIERS[Math.min(tierIdx + 1, LEAGUE_TIERS.length - 1)];
  const prevThreshold = tierIdx > 0 ? LEAGUE_TIERS[tierIdx].threshold : 0;
  const tierProgress = ((xp - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100;

  const earnedBadges = (rewards ?? []).filter((r) => r.redemptionStatus === 'approved');
  const pendingRewards = (rewards ?? []).filter((r) => r.redemptionStatus === 'pending');

  return (
    <AppShell>
      <Topbar
        title="Məqsədlər"
        subtitle={`${child?.name ?? 'Uşaq'} üçün nailiyyətlər`}
        onMenuClick={openMenu}
        actions={<AvatarButton initials={child?.name?.slice(0, 2).toUpperCase() ?? 'KB'} />}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="lg" className="flex flex-col items-center text-center">
              <Flame size={22} className="text-sand-text" />
              <p className="mt-2 font-display text-h3 font-semibold text-text-900">{streakDays}</p>
              <p className="text-caption text-text-500">Ardıcıl Gün</p>
            </Card>
            <Card padding="lg" className="flex flex-col items-center text-center">
              <Star size={22} className="text-sand-text" />
              <p className="mt-2 font-display text-h3 font-semibold text-text-900">{xp.toLocaleString('az-AZ')}</p>
              <p className="text-caption text-text-500">Ümumi XP</p>
            </Card>
            <Card padding="lg" className="flex flex-col items-center text-center">
              <Trophy size={22} className="text-sand-text" />
              <p className="mt-2 font-display text-h3 font-semibold text-text-900">{tier.label.split('·')[0].trim()}</p>
              <p className="text-caption text-text-500">Cari Liqa</p>
            </Card>
          </div>

          {useBackend && streak && (
            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">Həftəlik Seriya</h3>
              <div className="flex justify-between gap-1">
                {streak.week.map((d, i) => (
                  <div key={d.date} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                        d.state === 'done'
                          ? 'bg-success text-white'
                          : d.state === 'today'
                            ? 'bg-primary text-white'
                            : 'bg-border text-text-400'
                      }`}
                    >
                      {d.state === 'done' && <Check size={13} />}
                    </div>
                    <span className="text-[11px] text-text-400">{AZ_DAY_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card padding="lg">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display font-semibold text-text-900">Liqa Tərəqqisi</h3>
              <span className="text-body-sm font-bold text-sand-text">{Math.round(tierProgress)}%</span>
            </div>
            <p className="mb-4 text-body-sm text-text-500">
              Növbəti: {nextTier.label.split('·')[0].trim()} liqası — {nextTier.threshold.toLocaleString('az-AZ')} XP
            </p>
            <ProgressBar percent={tierProgress} />
          </Card>

          {loadError && (
            <Card padding="lg">
              <p className="text-body-sm text-error">Nailiyyətlər yüklənmədi — backend işə düşübmü?</p>
            </Card>
          )}

          {useBackend && (
            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">🏅 Qazanılmış Nişanlar</h3>
              {earnedBadges.length === 0 ? (
                <p className="text-body-sm text-text-500">Hələ təsdiqlənmiş mükafat yoxdur.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {earnedBadges.map((r) => (
                    <div key={r.id} className="flex flex-col items-center gap-2 rounded-xl border border-success/25 bg-success-tint px-3 py-4 text-center">
                      <Icon name={r.icon} size={22} className="text-success" />
                      <p className="text-body-sm font-bold text-text-900">{r.title}</p>
                    </div>
                  ))}
                </div>
              )}

              {pendingRewards.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-caption font-bold tracking-wide text-text-400">TƏSDİQ GÖZLƏNİLİR</p>
                  {pendingRewards.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
                      <Clock size={16} className="shrink-0 text-text-500" />
                      <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text-900">{r.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </main>
    </AppShell>
  );
}
