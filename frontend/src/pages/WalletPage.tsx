import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Button from '../components/ui/Button';
import IconTile from '../components/ui/IconTile';
import VoucherQrModal from '../components/ui/VoucherQrModal';
import { Icon } from '../lib/icons';
import { useAppStore, useActiveChild, LEAGUE_TIERS, EMPTY_ARRAY } from '../store/useAppStore';
import { celebrate } from '../lib/confetti';
import {
  fetchDonationCampaigns,
  fetchWalletBalance,
  fetchWalletTransactions,
  donate as donateRequest,
  type DonationCampaign,
  type WalletTransaction as BackendWalletTx,
} from '../lib/walletService';
import data from '../data/wallet.json';

/** The backend's error text is English by design (InsufficientXpException is
 * shared with Leagues' redeem flow) — this UI is Azerbaijani throughout, same
 * known-substring mapping LoginPage/LeaguesPage already use for their own
 * backend errors. */
function azerbaijaniDonateError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('is available')) return 'Kifayət qədər XP yoxdur.';
  return 'İanə edilə bilmədi.';
}

export default function WalletPage() {
  const openMenu = useOpenMobileMenu();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const addXp = useAppStore((s) => s.addXp);
  const localBalance = child?.balance ?? 0;
  const localTransactions = child?.transactions ?? EMPTY_ARRAY;
  const donateLocal = useAppStore((s) => s.donate);

  // A child added through the real signup/login flow has both a familyId and
  // a childId — only then does a real balance/transaction history exist to
  // read from/write to. A child added via the standalone "davam edə bilərsən"
  // path keeps the exact old local-only Zustand behavior.
  const useBackend = !!(parent?.familyId && child?.childId);

  // The donation campaign catalog is a real, open (unauthenticated) backend
  // read now for every child, backend-synced or not — replaces
  // src/data/wallet.json's static `donations` list entirely.
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchDonationCampaigns()
      .then((result) => {
        if (!cancelled) setCampaigns(result);
      })
      .catch((err) => console.error('İanə kampaniyaları yüklənmədi:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const [backendBalance, setBackendBalance] = useState(0);
  const [backendTransactions, setBackendTransactions] = useState<BackendWalletTx[]>([]);
  const [voucher, setVoucher] = useState<{ code: string; title: string } | null>(null);
  function loadBackendWallet() {
    if (!child?.childId || !parent) return;
    Promise.all([fetchWalletBalance(child.childId, parent.token), fetchWalletTransactions(child.childId, parent.token)])
      .then(([balanceAzn, transactions]) => {
        setBackendBalance(balanceAzn);
        setBackendTransactions(transactions);
      })
      .catch((err) => console.error('Cüzdan yüklənmədi:', err));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (useBackend) loadBackendWallet();
  }, [useBackend, child?.childId, parent?.familyId]);

  const diamondThreshold = LEAGUE_TIERS[3].threshold;
  const progressToDiamond = Math.min(100, (xp / diamondThreshold) * 100);

  const balance = useBackend ? backendBalance : localBalance;
  const transactions = useBackend
    ? backendTransactions.map((t) => ({ id: t.id, title: t.title, when: t.occurredAt, amount: t.amountAzn, direction: t.direction }))
    : localTransactions;

  const monthly = useMemo(() => {
    const income = transactions.filter((t) => t.direction === 'in').reduce((a, t) => a + t.amount, 0);
    const donated = transactions.filter((t) => t.direction === 'out').reduce((a, t) => a + t.amount, 0);
    return { income, donated };
  }, [transactions]);

  async function handleDonate(campaign: DonationCampaign) {
    if (useBackend && child?.childId && parent) {
      try {
        const result = await donateRequest(child.childId, campaign.id, parent.token);
        setBackendBalance(result.newBalanceAzn);
        setBackendTransactions((prev) => [
          { id: result.transactionId, title: result.campaignTitle, direction: 'out', amountAzn: result.aznAmount, occurredAt: new Date().toISOString() },
          ...prev,
        ]);
        addXp(-result.xpCost);
        celebrate();
        toast.success(`${result.campaignTitle} üçün ${result.aznAmount} AZN ianə edildi! Təşəkkürlər 💜`);
        if (result.voucherCode) setVoucher({ code: result.voucherCode, title: result.campaignTitle });
      } catch (err) {
        toast.error(azerbaijaniDonateError(err));
      }
      return;
    }

    const ok = donateLocal(campaign.title, campaign.xpCost, campaign.aznAmount);
    if (ok) {
      celebrate();
      toast.success(`${campaign.title} üçün ${campaign.aznAmount} AZN ianə edildi! Təşəkkürlər 💜`);
    } else {
      toast.error('Kifayət qədər XP yoxdur.');
    }
  }

  return (
    <AppShell>
      <Topbar
        title={data.topbar.title}
        subtitle={data.topbar.subtitle}
        onMenuClick={openMenu}
        actions={<AvatarButton />}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Card className="relative overflow-hidden bg-primary text-white" padding="lg">
              <div className="absolute -right-8 -top-8 flex size-32 items-center justify-center rounded-full border border-white/20 text-5xl">
                {child?.avatar ?? '🐰'}
              </div>
              <p className="text-body-sm font-bold uppercase tracking-wide text-white/70">{data.balanceHero.label}</p>
              <p className="mt-2 font-display text-[clamp(32px,5vw,44px)] font-semibold">{balance.toFixed(2)} AZN</p>
              <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-body-sm font-bold">
                ⭐ {xp.toLocaleString('az-AZ')} XP
              </span>
            </Card>

            <Card padding="lg">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display font-semibold text-text-900">💰 Valideyn Şərti Cib Pulu</h3>
                <span className="text-body-sm font-bold text-sand-text">{Math.round(progressToDiamond)}%</span>
              </div>
              <p className="mb-3 text-body-sm text-text-500">"Almaz liqasına keçsən → 10 AZN cüzdana yüklənəcək"</p>
              <ProgressBar percent={progressToDiamond} />
            </Card>

            <div className="flex flex-col gap-4">
              {campaigns.map((c, i) => (
                <Card key={c.id} padding="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <IconTile icon={<Icon name={c.icon} size={22} />} tint={i % 2 === 0 ? 'green-100' : 'blue-100'} size="lg" rounded="md" />
                  <div className="flex-1">
                    <h4 className="font-bold text-text-900">{c.title}</h4>
                    <p className="text-caption text-text-400">{c.sponsor}</p>
                  </div>
                  <Button variant={i % 2 === 0 ? 'success' : 'outline'} size="sm" onClick={() => handleDonate(c)}>
                    {c.xpCost} XP İanə Et ({c.aznAmount} AZN Real Pul Köçürüləcək)
                  </Button>
                </Card>
              ))}
            </div>

            <p className="rounded-xl bg-sand-tint px-4 py-3 text-center text-body-sm font-medium text-sand-text">{data.tip}</p>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">Əməliyyat Tarixçəsi</h3>
              <div className="scrollbar-thin flex max-h-96 flex-col gap-3 overflow-y-auto">
                {transactions.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                        t.direction === 'in' ? 'bg-success-tint text-success' : 'bg-error-tint text-error'
                      }`}
                    >
                      {t.direction === 'in' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-bold text-text-900">{t.title}</p>
                      <p className="text-caption text-text-400">
                        {useBackend ? new Date(t.when).toLocaleString('az-AZ') : t.when}
                      </p>
                    </div>
                    <span className={`shrink-0 text-body-sm font-bold ${t.direction === 'in' ? 'text-success' : 'text-error'}`}>
                      {t.direction === 'in' ? '+' : '−'}
                      {t.amount.toFixed(2)} AZN
                    </span>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card variant="soft" padding="lg">
              <h3 className="mb-3 font-display font-semibold text-text-900">Bu Ayın Xülasəsi</h3>
              <div className="flex items-center justify-between py-1">
                <span className="text-body-sm text-text-500">Daxil olan</span>
                <span className="font-bold text-success">+{monthly.income.toFixed(2)} AZN</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-body-sm text-text-500">İanə edilən</span>
                <span className="font-bold text-error">−{monthly.donated.toFixed(2)} AZN</span>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <VoucherQrModal code={voucher?.code ?? null} title={voucher?.title ?? ''} onClose={() => setVoucher(null)} />
    </AppShell>
  );
}
