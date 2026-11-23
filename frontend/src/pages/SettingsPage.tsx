import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, Trash2, KeyRound, Plus, Sparkles, Check, X, Wallet } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import {
  fetchHabitCategories,
  createFamilyHabitTask,
  MAX_FAMILY_TASKS,
  MAX_TASK_XP,
  type HabitCategory,
} from '../lib/habitsService';
import {
  fetchPendingRedemptions,
  approveRedemption,
  rejectRedemption,
  type RewardRedemption,
} from '../lib/leaguesService';
import { grantAllowance } from '../lib/walletService';

export default function SettingsPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const child = useAppStore((s) => s.child);
  const pin = useAppStore((s) => s.pin);
  const setPin = useAppStore((s) => s.setPin);
  const logoutParent = useAppStore((s) => s.logoutParent);
  const resetAll = useAppStore((s) => s.resetAll);

  const [newPin, setNewPin] = useState('');

  function savePin() {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('PIN 4 rəqəmdən ibarət olmalıdır.');
      return;
    }
    setPin(newPin);
    setNewPin('');
    toast.success('PIN yeniləndi.');
  }

  function handleLogout() {
    logoutParent();
    navigate('/aile-qapisi');
  }

  function handleReset() {
    if (confirm('Bütün ailə məlumatını və tərəqqini silmək istədiyinizə əminsiniz?')) {
      resetAll();
      navigate('/qeydiyyat');
    }
  }

  return (
    <AppShell>
      <Topbar title="Tənzimləmələr" subtitle="Hesab və təhlükəsizlik" onMenuClick={openMenu} actions={<AvatarButton />} />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <Card padding="lg">
            <h3 className="mb-4 font-display font-semibold text-text-900">Ailə Profili</h3>
            <div className="flex flex-col gap-3 text-body-sm">
              <Row label="Valideyn" value={parent?.name ?? '—'} />
              <Row label="Əlaqə" value={parent?.email ?? '—'} />
              <Row label="Uşaq" value={child ? `${child.avatar} ${child.name} · ${child.age} yaş` : '—'} />
              <Row label="Şəhər" value={child?.city ?? '—'} />
            </div>
          </Card>

          {parent?.familyId && <CustomHabitsCard familyId={parent.familyId} token={parent.token} />}

          {parent?.familyId && <RewardApprovalsCard familyId={parent.familyId} token={parent.token} />}

          {parent?.familyId && child?.childId && <AllowanceCard childId={child.childId} token={parent.token} />}

          <Card padding="lg">
            <h3 className="mb-1 font-display font-semibold text-text-900">Master PIN</h3>
            <p className="mb-4 text-body-sm text-text-500">Cari PIN: <b>{pin}</b></p>
            <div className="flex gap-3">
              <input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Yeni 4 rəqəmli PIN"
                className="h-12 flex-1 rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-purple-600"
              />
              <Button variant="primary" size="sm" onClick={savePin}>
                <KeyRound size={15} /> Yadda Saxla
              </Button>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col gap-3">
            <h3 className="font-display font-semibold text-text-900">Hesab</h3>
            <Button variant="outline" full onClick={handleLogout}>
              <LogOut size={16} /> Valideyn Panelindən Çıx
            </Button>
            <Button variant="danger" full onClick={handleReset}>
              <Trash2 size={16} /> Bütün Məlumatları Sıfırla
            </Button>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft pb-2.5 last:border-0">
      <span className="text-text-500">{label}</span>
      <span className="font-semibold text-text-900">{value}</span>
    </div>
  );
}

/** Parent-only: "there should be places to add habits" for the family itself, not
 * just the admin catalog. Capped at MAX_FAMILY_TASKS/family and MAX_TASK_XP/task —
 * enforced again server-side (CreateFamilyHabitTaskCommand), this is just so the
 * form can disable itself instead of waiting on a 409/400 round trip to explain
 * the limit. A custom task shows up in HabitsPage's normal category list, tagged
 * "Ailənizin fərdi vərdişi" (HabitsPage reads HabitTaskDto.isCustom/note for that). */
function CustomHabitsCard({ familyId, token }: { familyId: string; token: string }) {
  const [categories, setCategories] = useState<HabitCategory[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [xpValue, setXpValue] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoadError(false);
    fetchHabitCategories({ familyId, token })
      .then((cats) => {
        setCategories(cats);
        setCategoryId((current) => current || cats[0]?.id || '');
      })
      .catch((err) => {
        console.error('Vərdişlər yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [familyId]);

  const customTasks = (categories ?? []).flatMap((c) =>
    c.tasks.filter((t) => t.isCustom).map((t) => ({ ...t, categoryTitle: c.title })),
  );
  const atLimit = customTasks.length >= MAX_FAMILY_TASKS;

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
    setSubmitting(true);
    try {
      await createFamilyHabitTask(familyId, { categoryId, title: title.trim(), note: note.trim() || undefined, xpValue: xp }, token);
      toast.success(`"${title.trim()}" vərdişi əlavə edildi.`);
      setTitle('');
      setNote('');
      setXpValue('5');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vərdiş əlavə edilə bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display font-semibold text-text-900">Fərdi Vərdişlər</h3>
        <span className="text-caption font-bold text-text-400">{customTasks.length} / {MAX_FAMILY_TASKS}</span>
      </div>
      <p className="mb-4 text-body-sm text-text-500">
        Ailəniz üçün öz vərdişlərinizi yaradın — maksimum {MAX_FAMILY_TASKS} ədəd, hər biri ən çox {MAX_TASK_XP} XP.
      </p>

      {loadError && <p className="mb-3 text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}

      {customTasks.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {customTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-text-900">{t.title}</p>
                <p className="truncate text-caption text-text-400">{t.categoryTitle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-caption font-bold text-amber-text">
                +{t.xpValue} XP
              </span>
            </div>
          ))}
        </div>
      )}

      {!open && (
        <Button onClick={() => setOpen(true)} variant="secondary" size="sm" disabled={atLimit || !categories}>
          <Plus size={15} /> {atLimit ? 'Limitə çatdınız' : 'Yeni Vərdiş'}
        </Button>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label>
            <span className="mb-1.5 block text-caption font-bold text-text-700">KATEQORİYA</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
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
              className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-caption font-bold text-text-700">QEYD (OPSİONAL)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Qeyd"
              className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
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
              className="h-11 w-28 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="success" disabled={submitting}>
              {submitting ? 'Yaradılır...' : <><Sparkles size={14} /> Yarat</>}
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

/** Parent-only: the other half of the real "Mükafat Mağazası" (reward store)
 * flow — a child's redeem request on LeaguesPage.tsx debits their XP
 * immediately and lands here as "pending" until a parent approves it (no
 * further change) or rejects it (the XP is refunded). Matches the reward
 * store's own disclaimer text about codes only unlocking after approval. */
function RewardApprovalsCard({ familyId, token }: { familyId: string; token: string }) {
  const [pending, setPending] = useState<RewardRedemption[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function load() {
    setLoadError(false);
    fetchPendingRedemptions(familyId, token)
      .then(setPending)
      .catch((err) => {
        console.error('Mükafat sorğuları yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [familyId]);

  async function resolve(redemptionId: string, approve: boolean) {
    setResolvingId(redemptionId);
    try {
      await (approve ? approveRedemption : rejectRedemption)(redemptionId, token);
      toast.success(approve ? 'Mükafat təsdiqləndi.' : 'Mükafat ləğv edildi, XP geri qaytarıldı.');
      setPending((rows) => rows?.filter((r) => r.id !== redemptionId) ?? rows);
    } catch (err) {
      // Same reasoning as LoginPage/LeaguesPage: the backend's error text is
      // English by design, this UI isn't.
      const message = err instanceof Error ? err.message : '';
      toast.error(
        message.includes('already been resolved')
          ? 'Bu sorğu artıq həll edilib.'
          : 'Əməliyyat uğursuz oldu.',
      );
    } finally {
      setResolvingId(null);
    }
  }

  if (pending !== null && pending.length === 0 && !loadError) return null;

  return (
    <Card padding="lg">
      <h3 className="mb-1 font-display font-semibold text-text-900">Mükafat Təsdiqləri</h3>
      <p className="mb-4 text-body-sm text-text-500">
        Uşağınızın mükafat mağazasından etdiyi sorğular — təsdiqlədikdə xal geri qaytarılmır, ləğv etdikdə xal geri qaytarılır.
      </p>

      {loadError && <p className="mb-3 text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}

      {(pending ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          {(pending ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-text-900">{r.rewardTitle}</p>
                <p className="truncate text-caption text-text-400">{r.childName} · {r.costXp} XP</p>
              </div>
              <Button
                size="sm"
                variant="success"
                disabled={resolvingId === r.id}
                onClick={() => resolve(r.id, true)}
              >
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resolvingId === r.id}
                onClick={() => resolve(r.id, false)}
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Parent-only: the real version of "Valideyn Cib Pulu" — WalletPage.tsx's
 * "💰 Valideyn Şərti Cib Pulu" card only ever showed a progress bar toward
 * the Diamond league, with nothing anywhere that actually credited the
 * wallet. This is a direct, manual grant — a parent decides the amount and
 * sends it, same trust level as CustomHabitsCard above (a parent acting on
 * their own family, not an admin-gated action). Deliberately NOT built:
 * automatic AZN credits tied to a league-tier change or a weekly streak —
 * see GrantAllowanceCommand's doc comment in the backend for why. */
function AllowanceCard({ childId, token }: { childId: string; token: string }) {
  const [amount, setAmount] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  async function handleGrant(e: FormEvent) {
    e.preventDefault();
    const amountAzn = Number(amount);
    if (!Number.isFinite(amountAzn) || amountAzn <= 0) {
      toast.error('Düzgün məbləğ daxil edin.');
      return;
    }
    setSubmitting(true);
    try {
      await grantAllowance(childId, amountAzn, token);
      toast.success(`${amountAzn.toFixed(2)} AZN cib pulu cüzdana əlavə edildi.`);
      setAmount('5');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cib pulu əlavə edilə bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg">
      <h3 className="mb-1 font-display font-semibold text-text-900">Cib Pulu Göndər</h3>
      <p className="mb-4 text-body-sm text-text-500">
        Uşağınızın real cüzdan balansına birbaşa cib pulu yükləyin.
      </p>
      <form onSubmit={handleGrant} className="flex gap-3">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min={0.01}
          max={500}
          step="0.01"
          className="h-12 w-32 rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-purple-600"
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Göndərilir...' : <><Wallet size={15} /> AZN Göndər</>}
        </Button>
      </form>
    </Card>
  );
}
