import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton, XpPill } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import VoucherQrModal from '../components/ui/VoucherQrModal';
import IconTile from '../components/ui/IconTile';
import { Icon } from '../lib/icons';
import { useAppStore, useActiveChild, LEAGUE_TIERS, EMPTY_RECORD } from '../store/useAppStore';
import { useActivityStore } from '../store/useActivityStore';
import { bigCelebrate } from '../lib/confetti';
import { fetchRewards, redeemReward as redeemRewardRequest, type Reward as BackendReward } from '../lib/leaguesService';
import { fetchHabitStreak } from '../lib/habitsService';
import { todayIso } from '../lib/dob';
import data from '../data/leagues.json';

// Backend rewards have no stored tint (Reward's schema never needed one — it's
// a purely cosmetic IconTile detail) — cycle through the same small palette
// the mock JSON's hand-picked iconBg values happened to use.
const TINT_CYCLE = ['blue-100', 'green-100', 'amber-100', 'purple-100'];

interface RewardRow {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  costXp: number;
  /** null/undefined = never attempted (local path has no concept of
   * "pending"/"rejected", only redeemed-or-not). */
  redemptionStatus?: BackendReward['redemptionStatus'];
}

/** The backend's error text is English by design (see InsufficientXpException's
 * doc comment) — this UI is Azerbaijani throughout, so known cases get a
 * proper translation instead of leaking that string straight to a toast, same
 * pattern LoginPage/SignupPage already use for their own backend errors. */
function azerbaijaniRedeemError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('is available')) return 'Kifayət qədər XP yoxdur.';
  if (message.includes('already been redeemed or is awaiting approval')) {
    return 'Bu mükafat artıq dəyişdirilib və ya təsdiq gözləyir.';
  }
  return 'Mükafat dəyişdirilə bilmədi.';
}

export default function LeaguesPage() {
  const openMenu = useOpenMobileMenu();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const addXp = useAppStore((s) => s.addXp);
  const redeemedRewards = child?.redeemedRewards ?? EMPTY_RECORD;
  const redeemRewardLocal = useAppStore((s) => s.redeemReward);
  const addActivity = useActivityStore((s) => s.addEntry);
  const [pendingReward, setPendingReward] = useState<RewardRow | null>(null);
  const [backendRewards, setBackendRewards] = useState<BackendReward[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [voucher, setVoucher] = useState<{ code: string; title: string } | null>(null);

  const useBackend = !!(parent?.familyId && child?.childId);

  function load() {
    if (!parent?.familyId || !child?.childId) return;
    setLoadError(false);
    Promise.all([
      fetchRewards(child.childId, parent.token),
      fetchHabitStreak(child.childId, todayIso(), parent.token),
    ])
      .then(([rewards, streak]) => {
        setBackendRewards(rewards);
        setStreakDays(streak.consecutiveDays);
      })
      .catch((err) => {
        console.error('Mükafatlar yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (useBackend) load();
  }, [useBackend, parent?.familyId, child?.childId]);

  const rows: RewardRow[] = useBackend
    ? (backendRewards ?? []).map((r, i) => ({
        id: r.id,
        icon: data.rewards.find((m) => m.title === r.title)?.icon ?? 'gift',
        iconBg: TINT_CYCLE[i % TINT_CYCLE.length],
        title: r.title,
        description: r.description ?? '',
        costXp: r.costXp,
        redemptionStatus: r.redemptionStatus,
      }))
    : data.rewards.map((r) => ({
        id: r.title,
        icon: r.icon,
        iconBg: r.iconBg,
        title: r.title,
        description: r.description,
        costXp: Number(r.cost.replace(/[^0-9]/g, '')),
      }));

  const activeTierIdx = [...LEAGUE_TIERS].reverse().findIndex((t) => xp >= t.threshold);
  const currentIdx = activeTierIdx === -1 ? 0 : LEAGUE_TIERS.length - 1 - activeTierIdx;
  const nextTier = LEAGUE_TIERS[Math.min(currentIdx + 1, LEAGUE_TIERS.length - 1)];
  const prevThreshold = currentIdx > 0 ? LEAGUE_TIERS[currentIdx].threshold : 0;
  const progressPercent = ((xp - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100;

  async function confirmRedeem() {
    if (!pendingReward) return;

    if (useBackend && parent && child?.childId) {
      setRedeeming(true);
      try {
        const redemption = await redeemRewardRequest(child.childId, pendingReward.id, parent.token);
        addXp(-pendingReward.costXp);
        bigCelebrate();
        toast.success(`${pendingReward.title} üçün sorğu göndərildi — valideyn təsdiqini gözləyir.`);
        addActivity({
          type: 'reward_redeemed',
          text: `${child?.name ?? 'Uşaq'}: "${pendingReward.title}" üçün mükafat sorğusu göndərildi`,
        });
        if (redemption.voucherCode) setVoucher({ code: redemption.voucherCode, title: pendingReward.title });
        load();
      } catch (err) {
        toast.error(azerbaijaniRedeemError(err));
      } finally {
        setRedeeming(false);
      }
    } else {
      const ok = redeemRewardLocal(pendingReward.title, pendingReward.costXp);
      if (ok) {
        bigCelebrate();
        toast.success(`${pendingReward.title} uğurla dəyişdirildi!`);
      } else {
        toast.error('Kifayət qədər XP yoxdur.');
      }
    }
    setPendingReward(null);
  }

  return (
    <AppShell>
      <Topbar
        title={data.topbar.title}
        subtitle={data.topbar.subtitle}
        onMenuClick={openMenu}
        actions={<><XpPill>⭐ {xp.toLocaleString('az-AZ')} XP</XpPill><AvatarButton /></>}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Card className="bg-primary text-white" padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-h3 font-semibold">
                  Cari Status:
                  <Icon name={LEAGUE_TIERS[currentIdx].icon} size={22} className="text-sand" />
                  {LEAGUE_TIERS[currentIdx].label.split('·')[0].trim()} Liqa
                </h2>
                <p className="mt-1 text-body-sm text-white/75">{data.progressHero.formula}</p>
              </div>
              <span className="rounded-full bg-white/15 px-4 py-2 text-body-sm font-bold">
                {useBackend && streakDays !== null ? `🔥 ${streakDays} GÜNLÜK SERİYA` : data.progressHero.streakBadge}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-4">
              {LEAGUE_TIERS.map((t, i) => {
                const tierColor = ['text-text-500', 'text-text-400', 'text-sand-text', 'text-primary'][i] ?? 'text-text-500';
                return (
                  <div key={t.label} className={`flex items-center gap-2 ${i <= currentIdx ? 'opacity-100' : 'opacity-50'}`}>
                    <span className={`flex size-10 items-center justify-center rounded-full bg-white ${tierColor}`}>
                      <Icon name={t.icon} size={18} />
                    </span>
                    <span className="text-body-sm font-semibold">{t.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5">
              <ProgressBar percent={progressPercent} tone="white-on-dark" trackClassName="bg-white/20" />
            </div>
          </Card>

          <p className="mb-4 mt-8 font-display text-h4 font-semibold text-text-900">🎁 Mükafat Mağazası</p>

          {useBackend && !backendRewards && !loadError && (
            <p className="mb-4 text-body-sm text-text-400">Yüklənir...</p>
          )}
          {loadError && (
            <p className="mb-4 text-body-sm text-error">Mükafatlar yüklənmədi — backend işə düşübmü?</p>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((reward, i) => {
              const redeemed = useBackend
                ? reward.redemptionStatus === 'pending' || reward.redemptionStatus === 'approved'
                : !!redeemedRewards[reward.title];
              const pending = useBackend && reward.redemptionStatus === 'pending';
              const affordable = xp >= reward.costXp;
              return (
                <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card interactive padding="lg" className="flex h-full flex-col">
                    <IconTile icon={<Icon name={reward.icon} size={24} />} tint={reward.iconBg} size="lg" rounded="md" />
                    <h3 className="mt-3 font-display font-semibold text-text-900">{reward.title}</h3>
                    <p className="mt-1 flex-1 text-body-sm text-text-500">{reward.description}</p>
                    <p className="mt-3 text-body-sm font-bold text-sand-text">⭐ {reward.costXp} XP</p>
                    <Button
                      variant={pending ? 'outline' : redeemed ? 'outline' : affordable ? 'success' : 'outline'}
                      size="sm"
                      full
                      className="mt-3"
                      disabled={redeemed}
                      onClick={() => setPendingReward(reward)}
                    >
                      {pending ? <><Clock size={14} /> Təsdiq Gözlənilir</>
                        : redeemed ? <><Check size={14} /> Dəyişdirildi</>
                        : affordable ? 'Xalları Dəyiş →'
                        : <><Lock size={14} /> Valideyn Təsdiqi ilə</>}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-6 rounded-xl bg-sand-tint px-4 py-3 text-body-sm text-sand-text">⚠️ {data.note}</p>
        </div>
      </main>

      <Modal open={!!pendingReward} onClose={() => setPendingReward(null)} title="Mükafatı Dəyiş">
        {pendingReward && (
          <div>
            <p className="text-body text-text-700">
              <b>{pendingReward.title}</b> üçün {pendingReward.costXp} XP xərclənəcək. Davam edilsin?
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" full onClick={() => setPendingReward(null)}>Ləğv et</Button>
              <Button variant="success" full onClick={confirmRedeem} disabled={redeeming}>
                {redeeming ? 'Göndərilir...' : 'Təsdiqlə'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <VoucherQrModal code={voucher?.code ?? null} title={voucher?.title ?? ''} onClose={() => setVoucher(null)} />
    </AppShell>
  );
}
