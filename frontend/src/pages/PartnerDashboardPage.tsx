import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, ScanLine, Search, Check, Clock, Gift, HeartHandshake, Plus, History, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import QrScanner from '../components/QrScanner';
import { usePartnerStore } from '../store/usePartnerStore';
import {
  fetchVoucher,
  fulfillVoucher,
  submitRewardProposal,
  fetchPartnerRewardProposals,
  approveRewardProposal,
  rejectRewardProposal,
  type Voucher,
  type RewardProposal,
} from '../lib/partnerService';
import data from '../data/partnerAuth.json';

const { dashboard } = data;

const ICON_OPTIONS = ['gift', 'books', 'ice-cream', 'ticket', 'star', 'trophy', 'paw', 'tree'];

const PROPOSAL_STATUS_LABEL: Record<RewardProposal['status'], { label: string; tone: string }> = {
  pending_admin_review: { label: 'Admin Baxışını Gözləyir', tone: 'bg-amber-100 text-amber-text' },
  admin_edited_pending_partner: { label: 'Təsdiqinizi Gözləyir', tone: 'bg-blue-100 text-blue-700' },
  rejected_by_partner: { label: 'Rədd Etdiniz · Admin Baxacaq', tone: 'bg-red-100 text-red-600' },
  approved: { label: 'Təsdiqləndi · Yayımlandı', tone: 'bg-green-100 text-green-700' },
  declined_by_admin: { label: 'Admin Rədd Etdi', tone: 'bg-surface-alt text-text-500' },
};

const EVENT_TYPE_LABEL: Record<RewardProposal['events'][number]['eventType'], string> = {
  submitted: 'Təklif göndərildi',
  edited_by_admin: 'Admin şərtləri dəyişdi',
  accepted_by_admin: 'Admin olduğu kimi qəbul etdi',
  declined_by_admin: 'Admin rədd etdi',
  approved_by_partner: 'Siz dəyişiklikləri təsdiqlədiniz',
  rejected_by_partner: 'Siz dəyişiklikləri rədd etdiniz',
  published: 'Kataloqda yayımlandı',
};

/** The backend's error text is English by design — same known-substring
 * mapping azerbaijaniVoucherError already uses. */
function azerbaijaniProposalError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('CostXp must be')) return 'XP məbləği 1 ilə 5000 arasında olmalıdır.';
  if (message.includes('Title is required')) return 'Başlıq tələb olunur.';
  if (message.includes('requires status')) return 'Bu əməliyyat hazırkı statusda mümkün deyil.';
  return 'Əməliyyat uğursuz oldu.';
}

/** The backend's error text is English by design — this UI is Azerbaijani
 * throughout, same known-substring mapping every other page's own backend
 * errors already use. */
function azerbaijaniVoucherError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('was not found')) return 'Bu kodla heç bir qeydiyyat tapılmadı.';
  if (message.includes('does not belong to your account')) return 'Bu kod sizin hesabınıza aid deyil.';
  if (message.includes('already been fulfilled')) return 'Bu kod artıq təhvil verilib.';
  if (message.includes('hasn\'t been approved')) return 'Bu sorğu hələ valideyn tərəfindən təsdiqlənməyib.';
  return 'Kod yoxlanıla bilmədi.';
}

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  const partner = usePartnerStore((s) => s.partner);
  const logoutPartner = usePartnerStore((s) => s.logoutPartner);

  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [error, setError] = useState('');

  function handleLogout() {
    logoutPartner();
    navigate('/partners/login');
  }

  async function lookup(rawCode: string) {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed || !partner) return;
    setLoading(true);
    setError('');
    setVoucher(null);
    try {
      const result = await fetchVoucher(trimmed, partner.token);
      setVoucher(result);
      setScanning(false);
    } catch (err) {
      setError(azerbaijaniVoucherError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    void lookup(code);
  }

  function handleScan(scannedCode: string) {
    setCode(scannedCode);
    void lookup(scannedCode);
  }

  async function handleFulfill() {
    if (!voucher || !partner) return;
    setFulfilling(true);
    try {
      const result = await fulfillVoucher(voucher.code, partner.token);
      setVoucher(result);
      toast.success('Təhvil təsdiqləndi.');
    } catch (err) {
      toast.error(azerbaijaniVoucherError(err));
    } finally {
      setFulfilling(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="flex items-center justify-between border-b border-border-soft bg-surface px-4 py-4 sm:px-8">
        <LogoMark height={28} />
        <div className="flex items-center gap-3">
          <span className="text-body-sm font-semibold text-text-700">{partner?.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut size={14} /> Çıxış
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-8">
        <h1 className="font-display text-h3 font-semibold text-text-900">{dashboard.title}</h1>
        <p className="mt-1 text-body-sm text-text-500">{dashboard.subtitle}</p>

        <Card padding="lg" className="mt-6">
          {!scanning ? (
            <Button variant="primary" full onClick={() => setScanning(true)}>
              <ScanLine size={16} /> Kamera ilə Oxut
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <QrScanner onScan={handleScan} />
              <Button variant="outline" full onClick={() => setScanning(false)}>
                Kamera Skanını Dayandır
              </Button>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Kodu əllə daxil et"
              className="h-12 flex-1 rounded-xl border-2 border-border bg-surface px-4 font-display text-body font-bold uppercase tracking-widest text-text-900 outline-none focus:border-purple-600"
            />
            <Button type="submit" variant="secondary" disabled={loading || !code.trim()}>
              <Search size={16} /> Axtar
            </Button>
          </form>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-body-sm font-medium text-red-600"
            >
              {error}
            </motion.p>
          )}
        </Card>

        {voucher && (
          <Card padding="lg" className="mt-6">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                {voucher.sourceType === 'donation' ? <HeartHandshake size={20} /> : <Gift size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-text-900">{voucher.title}</p>
                <p className="text-body-sm text-text-500">{voucher.childName}</p>
              </div>
              {voucher.status === 'fulfilled' ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-caption font-bold text-green-700">
                  <Check size={14} /> Təhvil verilib
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-caption font-bold text-amber-text">
                  <Clock size={14} /> Gözləyir
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-border-soft pt-4 text-body-sm">
              <div className="flex justify-between">
                <span className="text-text-500">Kod</span>
                <span className="font-bold tracking-widest text-text-900">{voucher.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-500">Yaradılıb</span>
                <span className="text-text-700">{new Date(voucher.createdAt).toLocaleString('az-AZ')}</span>
              </div>
              {voucher.fulfilledAt && (
                <div className="flex justify-between">
                  <span className="text-text-500">Təhvil tarixi</span>
                  <span className="text-text-700">{new Date(voucher.fulfilledAt).toLocaleString('az-AZ')}</span>
                </div>
              )}
            </div>

            {voucher.status !== 'fulfilled' && (
              <Button variant="success" full className="mt-4" onClick={handleFulfill} disabled={fulfilling}>
                {fulfilling ? 'Təsdiqlənir...' : 'Təhvil Verildi'}
              </Button>
            )}
          </Card>
        )}

        {partner && <RewardProposalsSection token={partner.token} />}
      </main>
    </div>
  );
}

/** "Partner can create something that can be redeemed using XP" — a partner
 * proposes a new reward; admin accepts it as-is (publishes immediately) or
 * edits it (sends the new terms back here for the partner to approve/
 * reject); approving publishes it too. Every proposal shows its full event
 * history — explicitly requested, not an afterthought. */
function RewardProposalsSection({ token }: { token: string }) {
  const [proposals, setProposals] = useState<RewardProposal[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costXp, setCostXp] = useState('100');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    setLoadError(false);
    fetchPartnerRewardProposals(token)
      .then(setProposals)
      .catch((err) => {
        console.error('Təkliflər yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Başlıq tələb olunur.');
      return;
    }
    const xp = Number(costXp);
    if (!Number.isFinite(xp) || xp < 1 || xp > 5000) {
      toast.error('XP məbləği 1 ilə 5000 arasında olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      await submitRewardProposal({ title: title.trim(), description: description.trim() || undefined, costXp: xp, icon }, token);
      toast.success('Təklif göndərildi — admin baxışını gözləyir.');
      setTitle('');
      setDescription('');
      setCostXp('100');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(azerbaijaniProposalError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(proposalId: string, approve: boolean) {
    setRespondingId(proposalId);
    try {
      const result = approve ? await approveRewardProposal(proposalId, token) : await rejectRewardProposal(proposalId, undefined, token);
      toast.success(approve ? 'Dəyişikliklər təsdiqləndi — mükafat yayımlandı.' : 'Dəyişikliklər rədd edildi.');
      setProposals((prev) => prev?.map((p) => (p.id === proposalId ? result : p)) ?? prev);
    } catch (err) {
      toast.error(azerbaijaniProposalError(err));
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <Card padding="lg" className="mt-6">
      <h3 className="font-display font-semibold text-text-900">Mükafat Təklifləri</h3>
      <p className="mb-4 text-body-sm text-text-500">
        Kataloqa XP ilə alına bilən yeni bir mükafat təklif edin — admin baxıb qəbul edə, dəyişə və ya rədd edə bilər.
      </p>

      {loadError && <p className="mb-3 text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}

      {(proposals ?? []).length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {(proposals ?? []).map((p) => {
            const status = PROPOSAL_STATUS_LABEL[p.status];
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="rounded-xl border border-border-soft">
                <div className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold text-text-900">{p.title}</p>
                    <p className="text-caption text-text-400">{p.costXp} XP</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-bold ${status.tone}`}>{status.label}</span>
                </div>

                {p.status === 'admin_edited_pending_partner' && (
                  <div className="flex gap-2 border-t border-border-soft p-3">
                    <Button size="sm" variant="success" disabled={respondingId === p.id} onClick={() => respond(p.id, true)}>
                      <ThumbsUp size={14} /> Təsdiqlə
                    </Button>
                    <Button size="sm" variant="outline" disabled={respondingId === p.id} onClick={() => respond(p.id, false)}>
                      <ThumbsDown size={14} /> Rədd Et
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="flex w-full items-center gap-2 border-t border-border-soft p-3 text-caption font-semibold text-text-500 hover:bg-surface-alt"
                >
                  <History size={13} /> Tarixçə ({p.events.length})
                </button>
                {isExpanded && (
                  <div className="flex flex-col gap-2 border-t border-border-soft bg-surface-alt/60 p-3">
                    {p.events.map((e, i) => (
                      <div key={i} className="text-caption">
                        <p className="font-semibold text-text-700">
                          {EVENT_TYPE_LABEL[e.eventType]} · {new Date(e.occurredAt).toLocaleString('az-AZ')}
                        </p>
                        {e.note && <p className="text-text-400">{e.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!open && (
        <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
          <Plus size={15} /> Yeni Təklif
        </Button>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label>
            <span className="mb-1.5 block text-caption font-bold text-text-700">BAŞLIQ</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mükafatın adı"
              className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-caption font-bold text-text-700">TƏSVİR (OPSİONAL)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qısa təsvir"
              className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="mb-1.5 block text-caption font-bold text-text-700">XP DƏYƏRİ</span>
              <input
                value={costXp}
                onChange={(e) => setCostXp(e.target.value)}
                type="number"
                min={1}
                max={5000}
                className="h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1.5 block text-caption font-bold text-text-700">İKONA</span>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
              >
                {ICON_OPTIONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="success" disabled={submitting}>
              {submitting ? 'Göndərilir...' : 'Göndər'}
            </Button>
            <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="sm">
              Ləğv et
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
