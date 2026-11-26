import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Check, Clock, Info, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton, XpPill, NotificationBell, IconButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import VoucherQrModal from '../components/ui/VoucherQrModal';
import IconTile from '../components/ui/IconTile';
import Tooltip from '../components/ui/Tooltip';
import { Icon } from '../lib/icons';
import { TrophyCup, IceCreamArt, BooksArt, ControllerArt, ParkArt } from '../components/illustrations/Illustrations';
import ThemeArt from '../components/illustrations/ThemeArt';
import { REWARD_ART, TIER_ART } from '../components/illustrations/themeArtAssets';
import { useIsIllustratedTheme } from '../lib/useActiveTheme';

const REWARD_ILLUSTRATIONS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  'ice-cream': IceCreamArt,
  books: BooksArt,
  gift: ControllerArt,
  ticket: ParkArt,
};
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
  const illustrated = useIsIllustratedTheme();
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const addXp = useAppStore((s) => s.addXp);
  const redeemedRewards = child?.redeemedRewards ?? EMPTY_RECORD;
  const redeemRewardLocal = useAppStore((s) => s.redeemReward);
  // A parent who just unlocked the dashboard this session shouldn't be able
  // to redeem on the child's behalf — "Bu əməliyyatı yalnız uşaqlar özləri
  // edə bilər." Reuses the existing PIN-gate session flag, no backend change.
  const authedAsParent = useAppStore((s) => s.authedAsParent);
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
        actions={
          <>
            <XpPill>⭐ {xp.toLocaleString('az-AZ')} XP</XpPill>
            <NotificationBell />
            <IconButton onClick={() => navigate('/tənzimləmələr')}><SettingsIcon size={17} /></IconButton>
            <AvatarButton />
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Card className="th-dark-card th-league-hero relative overflow-hidden bg-primary text-white" padding="lg">
            {illustrated ? (
              <ThemeArt name="trophy" className="pointer-events-none absolute bottom-4 right-4 hidden h-40 w-auto lg:block" />
            ) : (
              <TrophyCup className="pointer-events-none absolute -right-4 -top-4 hidden h-40 w-auto opacity-90 sm:block" />
            )}
            <div className={`relative flex flex-wrap items-center justify-between gap-3 ${illustrated ? 'lg:pr-60' : 'sm:pr-32'}`}>
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

            <div className={`relative mt-6 flex flex-wrap justify-between gap-4 ${illustrated ? 'lg:pr-60' : 'sm:pr-32'}`}>
              {LEAGUE_TIERS.map((t, i) => {
                const tierColor = ['text-text-500', 'text-text-400', 'text-sand-text', 'text-primary'][i] ?? 'text-text-500';
                return (
                  <div key={t.label} className={`flex items-center gap-2 ${i <= currentIdx ? 'opacity-100' : 'opacity-50'}`}>
                    {illustrated && TIER_ART[i] ? (
                      <img src={TIER_ART[i]} alt="" aria-hidden="true" className="h-12 w-auto drop-shadow" />
                    ) : (
                      <span className={`flex size-10 items-center justify-center rounded-full bg-white ${tierColor}`}>
                        <Icon name={t.icon} size={18} />
                      </span>
                    )}
                    <span className="text-body-sm font-semibold">{t.label}</span>
                  </div>
                );
              })}
            </div>
            <div className={`relative mt-5 ${illustrated ? 'lg:pr-60' : ''}`}>
              <ProgressBar percent={progressPercent} tone="white-on-dark" trackClassName="bg-white/20" />
            </div>
          </Card>

          <p className="mb-4 mt-8 flex items-center gap-2 font-display text-h4 font-semibold text-text-900">
            {illustrated ? <ThemeArt name="giftBig" className="h-8 w-auto" /> : '🎁'} Mükafat Mağazası
            <Tooltip label={data.note}>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded-full text-text-400 hover:bg-surface-alt hover:text-text-700"
                aria-label="Mükafat mağazası haqqında"
              >
                <Info size={16} />
              </button>
            </Tooltip>
          </p>

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
              // A parent who unlocked the dashboard this session can look, but
              // the redeem action itself is the child's own to make — the
              // button isn't just disabled, it's not rendered at all for a
              // parent (only a plain status note in its place).
              const parentLocked = authedAsParent && !redeemed;
              const redeemButton = (
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
              );
              const RewardIllustration = REWARD_ILLUSTRATIONS[reward.icon];
              return (
                <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card interactive padding="lg" className="flex h-full flex-col">
                    {illustrated && REWARD_ART[reward.icon] ? (
                      <div
                        className="-mx-2 -mt-2 flex h-32 items-center justify-center rounded-xl sm:-mx-4 sm:-mt-4"
                        style={{ backgroundColor: REWARD_ART[reward.icon].tile }}
                      >
                        <img src={REWARD_ART[reward.icon].src} alt="" aria-hidden="true" className="h-24 w-auto drop-shadow-md" />
                      </div>
                    ) : RewardIllustration ? (
                      <div className="-mx-6 -mt-6 flex h-28 items-center justify-center overflow-hidden rounded-t-md bg-surface-alt sm:-mx-8 sm:-mt-8">
                        <RewardIllustration className="h-20 w-auto" />
                      </div>
                    ) : (
                      <IconTile icon={<Icon name={reward.icon} size={24} />} tint={reward.iconBg} size="lg" rounded="md" />
                    )}
                    <h3 className="mt-3 font-display font-semibold text-text-900">{reward.title}</h3>
                    <p className="mt-1 flex-1 text-body-sm text-text-500">{reward.description}</p>
                    <p className="mt-3 text-body-sm font-bold text-sand-text">⭐ {reward.costXp} XP</p>
                    {parentLocked ? (
                      <p className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-sm bg-surface-alt text-body-sm font-semibold text-text-500">
                        <Lock size={14} /> Yalnız Uşaq Üçün
                      </p>
                    ) : (
                      redeemButton
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
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
