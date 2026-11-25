import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut, Trash2, KeyRound, Check, X, Wallet, Lock, Unlock, Palette, UserCog, Clock } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAppStore, useActiveChild, type ChildProfile } from '../store/useAppStore';
import { useActivityStore } from '../store/useActivityStore';
import {
  fetchPendingRedemptions,
  approveRedemption,
  rejectRedemption,
  type RewardRedemption,
} from '../lib/leaguesService';
import { grantAllowance } from '../lib/walletService';
import {
  requestProfileChange,
  fetchPendingProfileChangeRequest,
  fetchPendingProfileChangeRequests,
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
  type ChildProfileChangeRequest,
} from '../lib/identityService';
import { THEME_OPTIONS, DEFAULT_THEME } from '../lib/themes';
import familyAuthData from '../data/familyAuth.json';

const AVATAR_OPTIONS = familyAuthData.addChild.form.avatarOptions;

export default function SettingsPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const backendChildren = useAppStore((s) => s.children).filter((c) => !!c.childId);
  const changePinAsync = useAppStore((s) => s.changePinAsync);
  const logoutParent = useAppStore((s) => s.logoutParent);
  const resetAll = useAppStore((s) => s.resetAll);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  // Backend-verified now (useAppStore.changePinAsync) — the current PIN is
  // always re-checked (server-side for a backend-synced family, locally
  // otherwise) before anything changes; the current value is never shown
  // anywhere in this UI, only ever typed in to prove it's known.
  async function savePin() {
    if (!/^\d{4}$/.test(currentPin)) {
      toast.error('Cari PIN 4 rəqəmdən ibarət olmalıdır.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('Yeni PIN 4 rəqəmdən ibarət olmalıdır.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Yeni PIN təsdiqi uyğun gəlmir.');
      return;
    }
    setChangingPin(true);
    try {
      await changePinAsync(currentPin, newPin);
      toast.success('PIN yeniləndi.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(
        message.includes('Incorrect current PIN')
          ? 'Cari PIN yanlışdır.'
          : message.includes('4 digits')
            ? 'Yeni PIN 4 rəqəmdən ibarət olmalıdır.'
            : 'PIN yenilənə bilmədi.',
      );
    } finally {
      setChangingPin(false);
    }
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
          {authedAsParent ? (
            <>
              <Card padding="lg">
                <h3 className="mb-4 font-display font-semibold text-text-900">Ailə Profili</h3>
                <div className="flex flex-col gap-3 text-body-sm">
                  <Row label="Valideyn" value={parent?.name ?? '—'} />
                  <Row label="Əlaqə" value={parent?.email ?? '—'} />
                  <Row label="Şəhər" value={child?.city ?? '—'} />
                </div>
              </Card>

              {parent?.familyId && <ProfileChangeRequestsCard familyId={parent.familyId} token={parent.token} />}

              {parent?.familyId && <RewardApprovalsCard familyId={parent.familyId} token={parent.token} />}

              {parent?.familyId && backendChildren.length > 0 && (
                <AllowanceCard childOptions={backendChildren} token={parent.token} />
              )}

              {backendChildren.length > 0 && <ChildPinsCard childOptions={backendChildren} />}

              <Card padding="lg">
                <h3 className="mb-1 font-display font-semibold text-text-900">Master PIN</h3>
                <p className="mb-4 text-body-sm text-text-500">
                  Valideyn Keçid Qapısı üçün PIN-i dəyişin. Dəyişiklik üçün cari PIN-i bilmək tələb olunur.
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    type="password"
                    inputMode="numeric"
                    placeholder="Cari PIN"
                    className="h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
                  />
                  <input
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    type="password"
                    inputMode="numeric"
                    placeholder="Yeni PIN"
                    className="h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
                  />
                  <input
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    type="password"
                    inputMode="numeric"
                    placeholder="Yeni PIN-i təsdiqlə"
                    className="h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
                  />
                  <Button variant="primary" size="sm" onClick={savePin} disabled={changingPin}>
                    <KeyRound size={15} /> {changingPin ? 'Yenilənir...' : 'Yadda Saxla'}
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
            </>
          ) : (
            <ChildSettingsView />
          )}
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

/** Parent-only: the other half of the real "Mükafat Mağazası" (reward store)
 * flow — a child's redeem request on LeaguesPage.tsx debits their XP
 * immediately and lands here as "pending" until a parent approves it (no
 * further change) or rejects it (the XP is refunded). Matches the reward
 * store's own disclaimer text about codes only unlocking after approval. */
function RewardApprovalsCard({ familyId, token }: { familyId: string; token: string }) {
  const addActivity = useActivityStore((s) => s.addEntry);
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
      const row = pending?.find((r) => r.id === redemptionId);
      addActivity({
        type: approve ? 'reward_approved' : 'reward_rejected',
        text: row
          ? `"${row.rewardTitle}" mükafatı (${row.childName}) ${approve ? 'təsdiqləndi' : 'ləğv edildi'}`
          : approve
            ? 'Mükafat sorğusu təsdiqləndi'
            : 'Mükafat sorğusu ləğv edildi',
      });
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

      {loadError && <p className="mb-3 text-body-sm text-error">Yüklənmədi — backend işə düşübmü?</p>}

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
function AllowanceCard({ childOptions, token }: { childOptions: ChildProfile[]; token: string }) {
  const addActivity = useActivityStore((s) => s.addEntry);
  const activeChild = useActiveChild();
  // Defaults to whichever child is currently active in the switcher, but a
  // multi-child family can send allowance to any of their backend-synced
  // children from here, independent of which one is active.
  const [selectedLocalId, setSelectedLocalId] = useState(
    () => (activeChild && childOptions.some((c) => c.localId === activeChild.localId) ? activeChild.localId : childOptions[0].localId),
  );
  const [amount, setAmount] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  const selectedChild = childOptions.find((c) => c.localId === selectedLocalId) ?? childOptions[0];

  async function handleGrant(e: FormEvent) {
    e.preventDefault();
    const amountAzn = Number(amount);
    if (!Number.isFinite(amountAzn) || amountAzn <= 0) {
      toast.error('Düzgün məbləğ daxil edin.');
      return;
    }
    if (!selectedChild.childId) return;
    setSubmitting(true);
    try {
      await grantAllowance(selectedChild.childId, amountAzn, token);
      toast.success(`${amountAzn.toFixed(2)} AZN cib pulu cüzdana əlavə edildi.`);
      addActivity({
        type: 'allowance_granted',
        text: `${selectedChild.name} üçün ${amountAzn.toFixed(2)} AZN cib pulu göndərildi`,
      });
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
      <form onSubmit={handleGrant} className="flex flex-col gap-3">
        {childOptions.length > 1 && (
          <label>
            <span className="mb-1.5 block text-caption font-bold text-text-700">UŞAQ</span>
            <select
              value={selectedLocalId}
              onChange={(e) => setSelectedLocalId(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-primary"
            >
              {childOptions.map((c) => (
                <option key={c.localId} value={c.localId}>{c.avatar} {c.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex gap-3">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={0.01}
            max={500}
            step="0.01"
            className="h-12 w-32 rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Göndərilir...' : <><Wallet size={15} /> AZN Göndər</>}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Parent-only: lets a parent set (or clear) each of their backend-synced
 * children's own, optional PIN (see Child.PinHash's doc comment in the
 * backend) — gates one sibling opening another's account from the family
 * gate or the sidebar ChildSwitcher. Never shows the PIN itself once set,
 * same "write-only, never read back" posture the Master PIN card already
 * has above. */
function ChildPinsCard({ childOptions }: { childOptions: ChildProfile[] }) {
  const setChildPinAsync = useAppStore((s) => s.setChildPinAsync);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busyLocalId, setBusyLocalId] = useState<string | null>(null);

  function startEditing(localId: string) {
    setEditingLocalId(localId);
    setNewPin('');
    setConfirmPin('');
  }

  async function save(child: ChildProfile) {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('PIN 4 rəqəmdən ibarət olmalıdır.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PIN təsdiqi uyğun gəlmir.');
      return;
    }
    if (!child.childId) return;
    setBusyLocalId(child.localId);
    try {
      await setChildPinAsync(child.childId, newPin);
      toast.success(`${child.name} üçün PIN quruldu.`);
      setEditingLocalId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PIN quraşdırıla bilmədi.');
    } finally {
      setBusyLocalId(null);
    }
  }

  async function clear(child: ChildProfile) {
    if (!child.childId) return;
    setBusyLocalId(child.localId);
    try {
      await setChildPinAsync(child.childId, null);
      toast.success(`${child.name} üçün PIN silindi.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PIN silinə bilmədi.');
    } finally {
      setBusyLocalId(null);
    }
  }

  return (
    <Card padding="lg">
      <h3 className="mb-1 font-display font-semibold text-text-900">Uşaq PIN-ləri</h3>
      <p className="mb-4 text-body-sm text-text-500">
        Hər uşağa öz PIN-ini təyin edin — qardaş-bacılar bir-birinin profilinə PIN olmadan keçə bilməyəcək.
      </p>
      <div className="flex flex-col gap-2">
        {childOptions.map((c) => (
          <div key={c.localId} className="rounded-xl bg-surface-alt px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-base">
                {c.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-text-900">{c.name}</p>
                <p className="flex items-center gap-1 text-caption text-text-400">
                  {c.hasPin ? <><Lock size={11} /> PIN qoyulub</> : <><Unlock size={11} /> PIN yoxdur</>}
                </p>
              </div>
              {editingLocalId !== c.localId && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyLocalId === c.localId}
                    onClick={() => startEditing(c.localId)}
                  >
                    {c.hasPin ? 'Dəyiş' : 'Təyin et'}
                  </Button>
                  {c.hasPin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyLocalId === c.localId}
                      onClick={() => clear(c)}
                    >
                      Sil
                    </Button>
                  )}
                </div>
              )}
            </div>

            {editingLocalId === c.localId && (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  type="password"
                  inputMode="numeric"
                  placeholder="Yeni PIN"
                  className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-primary"
                />
                <input
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  type="password"
                  inputMode="numeric"
                  placeholder="Yeni PIN-i təsdiqlə"
                  className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="success" disabled={busyLocalId === c.localId} onClick={() => save(c)}>
                    {busyLocalId === c.localId ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingLocalId(null)}>
                    Ləğv et
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Parent-only: the review queue for a child's own "I want a different
 * name/avatar" request (see ChildSettingsView's ProfileEditSection below) —
 * same approve/reject shape RewardApprovalsCard already uses for reward
 * redemptions. Approving applies the new name/avatar server-side; rejecting
 * leaves the child's profile untouched. Either way the request leaves this
 * queue — there's no "undo" once resolved. */
function ProfileChangeRequestsCard({ familyId, token }: { familyId: string; token: string }) {
  const [pending, setPending] = useState<ChildProfileChangeRequest[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function load() {
    setLoadError(false);
    fetchPendingProfileChangeRequests(familyId, token)
      .then(setPending)
      .catch((err) => {
        console.error('Profil sorğuları yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [familyId]);

  async function resolve(requestId: string, approve: boolean) {
    setResolvingId(requestId);
    try {
      await (approve ? approveProfileChangeRequest : rejectProfileChangeRequest)(requestId, token);
      toast.success(approve ? 'Profil dəyişikliyi təsdiqləndi.' : 'Profil dəyişikliyi ləğv edildi.');
      setPending((rows) => rows?.filter((r) => r.id !== requestId) ?? rows);
    } catch (err) {
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
      <h3 className="mb-1 font-display font-semibold text-text-900">Profil Dəyişiklik Sorğuları</h3>
      <p className="mb-4 text-body-sm text-text-500">
        Uşağınızın təklif etdiyi ad/avatar dəyişiklikləri — təsdiqlədikdə profilə tətbiq olunur.
      </p>

      {loadError && <p className="mb-3 text-body-sm text-error">Yüklənmədi — backend işə düşübmü?</p>}

      {(pending ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          {(pending ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-base">
                {r.newAvatarEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-text-900">
                  {r.currentName} → {r.newName}
                </p>
                <p className="truncate text-caption text-text-400">Yeni avatar: {r.newAvatarEmoji}</p>
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

/** Child-only settings view — everything here is scoped to whichever child
 * is currently active (there's no separate "which child is editing"
 * concept; the active child IS the one using the device right now, same
 * assumption every other child-facing page already makes). */
function ChildSettingsView() {
  const navigate = useNavigate();
  const child = useActiveChild();
  const parent = useAppStore((s) => s.parent);

  function handleLogout() {
    navigate('/aile-qapisi');
  }

  if (!child) return null;

  return (
    <>
      {child.childId && parent?.token && (
        <ProfileEditSection childId={child.childId} name={child.name} avatar={child.avatar} token={parent.token} />
      )}

      {child.childId && <ChildOwnPinSection childId={child.childId} hasPin={!!child.hasPin} />}

      <ThemeSection />

      <Card padding="lg" className="flex flex-col gap-3">
        <h3 className="font-display font-semibold text-text-900">Hesab</h3>
        <Button variant="outline" full onClick={handleLogout}>
          <LogOut size={16} /> Çıxış
        </Button>
      </Card>
    </>
  );
}

/** A child proposing their own new name/avatar — held pending until a
 * parent approves/rejects it from ProfileChangeRequestsCard above. The
 * backend has no way to report *why* a request left the pending queue (only
 * "still pending" or not), so once it's no longer pending this just quietly
 * returns to the edit form rather than guessing approved/rejected. */
function ProfileEditSection({ childId, name, avatar, token }: { childId: string; name: string; avatar: string; token: string }) {
  const [pending, setPending] = useState<ChildProfileChangeRequest | null | undefined>(undefined);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatar);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingProfileChangeRequest(childId, token)
      .then(setPending)
      .catch(() => setPending(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draftName.trim()) {
      toast.error('Ad boş ola bilməz.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestProfileChange(childId, draftName.trim(), draftAvatar, token);
      setPending(result);
      toast.success('Sorğu göndərildi — valideyninizin təsdiqini gözləyir.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(
        message.includes('already has a pending')
          ? 'Artıq gözləyən bir sorğunuz var.'
          : 'Sorğu göndərilə bilmədi.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg">
      <h3 className="mb-1 flex items-center gap-2 font-display font-semibold text-text-900">
        <UserCog size={18} /> Ad və Avatar
      </h3>
      <p className="mb-4 text-body-sm text-text-500">
        Dəyişiklik birbaşa tətbiq olunmur — valideyninizin təsdiqini gözləyir.
      </p>

      {pending === undefined ? null : pending ? (
        <div className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
          <Clock size={18} className="shrink-0 text-text-400" />
          <p className="text-body-sm text-text-700">
            <span className="font-bold">{pending.newName}</span> ({pending.newAvatarEmoji}) — valideyn təsdiqini gözləyir.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Ad"
            className="h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
          />
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDraftAvatar(emoji)}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 text-xl transition-colors ${
                  draftAvatar === emoji ? 'border-primary bg-surface-alt' : 'border-transparent bg-surface-alt hover:bg-border-soft'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {submitting ? 'Göndərilir...' : 'Təsdiq üçün Göndər'}
          </Button>
        </form>
      )}
    </Card>
  );
}

/** A child changing their own PIN directly — no parent approval, and no
 * "current PIN" step either (SetChildPinCommand doesn't ask for one; the
 * bearer token this session already holds is proof enough it's a
 * legitimate member of the family). Mirrors ChildPinsCard's form, just
 * self-service instead of parent-administered. */
function ChildOwnPinSection({ childId, hasPin }: { childId: string; hasPin: boolean }) {
  const setChildPinAsync = useAppStore((s) => s.setChildPinAsync);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('PIN 4 rəqəmdən ibarət olmalıdır.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PIN təsdiqi uyğun gəlmir.');
      return;
    }
    setSaving(true);
    try {
      await setChildPinAsync(childId, newPin);
      toast.success('PIN yeniləndi.');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PIN yenilənə bilmədi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg">
      <h3 className="mb-1 flex items-center gap-2 font-display font-semibold text-text-900">
        <KeyRound size={18} /> Mənim PIN-im
      </h3>
      <p className="mb-4 text-body-sm text-text-500">
        {hasPin
          ? 'Bacı-qardaşlarınızın profilinizə keçməsinin qarşısını alan PIN-i dəyişin.'
          : 'Bacı-qardaşlarınızın profilinizə keçməsinin qarşısını almaq üçün bir PIN qoyun.'}
      </p>
      <div className="flex flex-col gap-3">
        <input
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          type="password"
          inputMode="numeric"
          placeholder="Yeni PIN"
          className="h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
        />
        <input
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          type="password"
          inputMode="numeric"
          placeholder="Yeni PIN-i təsdiqlə"
          className="h-12 w-full rounded-xl border-2 border-border bg-surface px-4 text-body text-text-900 outline-none focus:border-primary"
        />
        <Button variant="primary" size="sm" onClick={save} disabled={saving}>
          <KeyRound size={15} /> {saving ? 'Yenilənir...' : 'Yadda Saxla'}
        </Button>
      </div>
    </Card>
  );
}

/** The same palette grid + hide-toggle ThemeFab's own popup already offers,
 * duplicated here as a non-floating, always-reachable settings section —
 * explicitly requested so a child who has hidden the floating button (or
 * just prefers Settings) still has a way to change themes. Both write to
 * the exact same per-child store fields, so they can never drift apart. */
function ThemeSection() {
  const child = useActiveChild();
  const setChildTheme = useAppStore((s) => s.setChildTheme);
  const setThemeButtonHidden = useAppStore((s) => s.setThemeButtonHidden);

  if (!child) return null;

  const activeTheme = child.theme ?? DEFAULT_THEME;
  const hidden = !!child.themeButtonHidden;

  return (
    <Card padding="lg">
      <h3 className="mb-1 flex items-center gap-2 font-display font-semibold text-text-900">
        <Palette size={18} /> Tema
      </h3>
      <p className="mb-4 text-body-sm text-text-500">Tətbiqin görünüşünü özünüzə uyğun seçin.</p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {THEME_OPTIONS.map((t) => {
          const selected = t.id === activeTheme;
          return (
            <button
              key={t.id}
              onClick={() => setChildTheme(t.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors ${
                selected ? 'border-primary bg-surface-alt' : 'border-border hover:bg-surface-alt'
              }`}
            >
              <span className="relative flex size-10 items-center justify-center rounded-full">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${t.swatch[0]} 0deg 120deg, ${t.swatch[1]} 120deg 240deg, ${t.swatch[2]} 240deg 360deg)`,
                  }}
                />
                {selected && (
                  <span className="relative flex size-5 items-center justify-center rounded-full bg-white text-primary shadow-soft">
                    <Check size={12} />
                  </span>
                )}
              </span>
              <span className="text-caption font-bold text-text-700">{t.label}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-surface-alt px-4 py-3">
        <span className="text-body-sm font-semibold text-text-700">Üzən tema düyməsini göstər</span>
        <input
          type="checkbox"
          checked={!hidden}
          onChange={(e) => setThemeButtonHidden(!e.target.checked)}
          className="size-5 accent-primary"
        />
      </label>
    </Card>
  );
}
