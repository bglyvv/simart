import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Check, X, Pencil, History } from 'lucide-react';
import AdminShell, { useOpenMobileMenu } from '../components/AdminShell';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAdminStore } from '../store/useAdminStore';
import {
  fetchAdminRewardProposals,
  acceptRewardProposal,
  editRewardProposal,
  declineRewardProposal,
  type RewardProposal,
} from '../lib/adminService';

const ICON_OPTIONS = ['gift', 'books', 'ice-cream', 'ticket', 'star', 'trophy', 'paw', 'tree'];

const STATUS_LABEL: Record<RewardProposal['status'], { label: string; tone: string }> = {
  pending_admin_review: { label: 'Baxış Gözləyir', tone: 'bg-amber-100 text-amber-text' },
  admin_edited_pending_partner: { label: 'Tərəfdaş Təsdiqini Gözləyir', tone: 'bg-blue-100 text-blue-700' },
  rejected_by_partner: { label: 'Tərəfdaş Rədd Etdi', tone: 'bg-red-100 text-red-600' },
  approved: { label: 'Təsdiqləndi · Yayımlandı', tone: 'bg-green-100 text-green-700' },
  declined_by_admin: { label: 'Rədd Edildi', tone: 'bg-surface-alt text-text-500' },
};

const EVENT_TYPE_LABEL: Record<RewardProposal['events'][number]['eventType'], string> = {
  submitted: 'Tərəfdaş təklif göndərdi',
  edited_by_admin: 'Admin şərtləri dəyişdi',
  accepted_by_admin: 'Admin olduğu kimi qəbul etdi',
  declined_by_admin: 'Admin rədd etdi',
  approved_by_partner: 'Tərəfdaş dəyişiklikləri təsdiqlədi',
  rejected_by_partner: 'Tərəfdaş dəyişiklikləri rədd etdi',
  published: 'Kataloqda yayımlandı',
};

function azerbaijaniError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('CostXp must be')) return 'XP məbləği 1 ilə 5000 arasında olmalıdır.';
  if (message.includes('Title is required')) return 'Başlıq tələb olunur.';
  if (message.includes('requires status')) return 'Bu əməliyyat hazırkı statusda mümkün deyil.';
  return 'Əməliyyat uğursuz oldu.';
}

export default function AdminRewardProposalsPage() {
  const openMenu = useOpenMobileMenu();
  const admin = useAdminStore((s) => s.admin);

  const [proposals, setProposals] = useState<RewardProposal[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<RewardProposal | null>(null);
  const [declineTarget, setDeclineTarget] = useState<RewardProposal | null>(null);
  const [declineNote, setDeclineNote] = useState('');

  function load() {
    if (!admin) return;
    setLoadError(false);
    fetchAdminRewardProposals(admin.token)
      .then(setProposals)
      .catch((err) => {
        console.error('Təkliflər yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [admin]);

  function replaceProposal(updated: RewardProposal) {
    setProposals((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? prev);
  }

  async function handleAccept(proposal: RewardProposal) {
    if (!admin) return;
    setBusyId(proposal.id);
    try {
      const result = await acceptRewardProposal(proposal.id, admin.token);
      replaceProposal(result);
      toast.success(`"${proposal.title}" qəbul edildi və kataloqda yayımlandı.`);
    } catch (err) {
      toast.error(azerbaijaniError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline() {
    if (!admin || !declineTarget) return;
    setBusyId(declineTarget.id);
    try {
      const result = await declineRewardProposal(declineTarget.id, declineNote.trim() || undefined, admin.token);
      replaceProposal(result);
      toast.success(`"${declineTarget.title}" rədd edildi.`);
      setDeclineTarget(null);
      setDeclineNote('');
    } catch (err) {
      toast.error(azerbaijaniError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <Topbar title="Mükafat Təklifləri" subtitle="Tərəfdaşların XP mükafat təklifləri" onMenuClick={openMenu} />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {loadError && <p className="text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}
          {proposals !== null && proposals.length === 0 && !loadError && (
            <p className="text-body-sm text-text-400">Hələ heç bir təklif yoxdur.</p>
          )}

          {(proposals ?? []).map((p) => {
            const status = STATUS_LABEL[p.status];
            const isExpanded = expandedId === p.id;
            const canAct = p.status === 'pending_admin_review' || p.status === 'rejected_by_partner';
            const canEdit = p.status !== 'approved' && p.status !== 'declined_by_admin';
            return (
              <Card key={p.id} padding="lg">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-text-900">{p.title}</p>
                    <p className="text-body-sm text-text-500">{p.partnerName} · {p.costXp} XP</p>
                    {p.description && <p className="mt-1 text-body-sm text-text-400">{p.description}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-bold ${status.tone}`}>{status.label}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {canAct && (
                    <Button size="sm" variant="success" disabled={busyId === p.id} onClick={() => handleAccept(p)}>
                      <Check size={14} /> Qəbul Et
                    </Button>
                  )}
                  {canEdit && (
                    <Button size="sm" variant="secondary" disabled={busyId === p.id} onClick={() => setEditTarget(p)}>
                      <Pencil size={14} /> Düzəliş Et
                    </Button>
                  )}
                  {canAct && (
                    <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => setDeclineTarget(p)}>
                      <X size={14} /> Rədd Et
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                    <History size={14} /> Tarixçə ({p.events.length})
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface-alt px-4 py-3">
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
              </Card>
            );
          })}
        </div>
      </main>

      {editTarget && (
        <EditProposalModal
          proposal={editTarget}
          token={admin?.token ?? ''}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            replaceProposal(updated);
            setEditTarget(null);
          }}
        />
      )}

      <Modal open={!!declineTarget} onClose={() => setDeclineTarget(null)} title="Təklifi Rədd Et">
        {declineTarget && (
          <div>
            <p className="text-body text-text-700">
              <b>{declineTarget.title}</b> təklifini rədd etmək istədiyinizə əminsiniz? Bu, geri dönülməzdir.
            </p>
            <textarea
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="Səbəb (opsional)"
              rows={3}
              className="mt-3 w-full rounded-xl border-2 border-border bg-surface px-4 py-2.5 text-body-sm text-text-900 outline-none focus:border-purple-600"
            />
            <div className="mt-4 flex gap-3">
              <Button variant="outline" full onClick={() => setDeclineTarget(null)}>Ləğv et</Button>
              <Button variant="danger" full onClick={handleDecline} disabled={busyId === declineTarget.id}>
                {busyId === declineTarget.id ? 'Göndərilir...' : 'Rədd Et'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

/** Admin changing a proposal's terms — sends it back to the partner's own
 * panel to approve/reject, it doesn't publish directly. */
function EditProposalModal({
  proposal,
  token,
  onClose,
  onSaved,
}: {
  proposal: RewardProposal;
  token: string;
  onClose: () => void;
  onSaved: (updated: RewardProposal) => void;
}) {
  const [title, setTitle] = useState(proposal.title);
  const [description, setDescription] = useState(proposal.description ?? '');
  const [costXp, setCostXp] = useState(String(proposal.costXp));
  const [icon, setIcon] = useState(proposal.icon);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const xp = Number(costXp);
    if (!title.trim() || !Number.isFinite(xp) || xp < 1 || xp > 5000) {
      toast.error('Başlıq tələb olunur və XP 1-5000 arasında olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await editRewardProposal(
        proposal.id,
        { title: title.trim(), description: description.trim() || undefined, costXp: xp, icon },
        token,
      );
      toast.success('Dəyişikliklər göndərildi — tərəfdaşın təsdiqini gözləyir.');
      onSaved(result);
    } catch (err) {
      toast.error(azerbaijaniError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Təklifi Düzəliş Et">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">BAŞLIQ</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">TƏSVİR</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <Button type="submit" variant="success" full disabled={submitting}>
            {submitting ? 'Göndərilir...' : 'Dəyişiklikləri Göndər'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Ləğv et</Button>
        </div>
      </form>
    </Modal>
  );
}
