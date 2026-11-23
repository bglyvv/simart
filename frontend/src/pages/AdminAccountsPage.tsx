import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Pencil, Check, X, UserX, RotateCcw, Archive, Users } from 'lucide-react';
import AdminShell, { useOpenMobileMenu } from '../components/AdminShell';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAdminStore } from '../store/useAdminStore';
import {
  fetchFamilies,
  fetchDeactivatedFamilies,
  deactivateFamily,
  reactivateFamily,
  updateParent,
  updateChild,
  type FamilySummary,
} from '../lib/adminService';
import { formatAzDate } from '../lib/date';

export default function AdminAccountsPage() {
  const openMenu = useOpenMobileMenu();
  const admin = useAdminStore((s) => s.admin);

  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [families, setFamilies] = useState<FamilySummary[] | null>(null);
  const [deactivated, setDeactivated] = useState<FamilySummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<FamilySummary | null>(null);
  const [busyFamilyId, setBusyFamilyId] = useState<string | null>(null);

  function loadActive() {
    if (!admin) return;
    setLoadError(false);
    fetchFamilies(admin.token)
      .then(setFamilies)
      .catch((err) => {
        console.error('Hesablar yüklənmədi:', err);
        setLoadError(true);
      });
  }

  function loadDeactivated() {
    if (!admin) return;
    setLoadError(false);
    fetchDeactivatedFamilies(admin.token)
      .then(setDeactivated)
      .catch((err) => {
        console.error('Deaktiv hesablar yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadActive, [admin]);

  function handleSelectTab(tab: 'active' | 'deactivated') {
    setActiveTab(tab);
    if (tab === 'deactivated' && deactivated === null) loadDeactivated();
  }

  async function confirmDeactivate() {
    if (!deactivateTarget || !admin) return;
    setBusyFamilyId(deactivateTarget.familyId);
    try {
      await deactivateFamily(deactivateTarget.familyId, admin.token);
      setFamilies((rows) => rows?.filter((f) => f.familyId !== deactivateTarget.familyId) ?? rows);
      setDeactivated(null);
      toast.success('Hesab deaktiv edildi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deaktiv etmək mümkün olmadı.');
    } finally {
      setBusyFamilyId(null);
      setDeactivateTarget(null);
    }
  }

  async function handleReactivate(family: FamilySummary) {
    if (!admin) return;
    setBusyFamilyId(family.familyId);
    try {
      await reactivateFamily(family.familyId, admin.token);
      setDeactivated((rows) => rows?.filter((f) => f.familyId !== family.familyId) ?? rows);
      setFamilies(null);
      loadActive();
      toast.success('Hesab bərpa edildi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bərpa etmək mümkün olmadı.');
    } finally {
      setBusyFamilyId(null);
    }
  }

  const totalParents = families?.reduce((sum, f) => sum + f.parents.length, 0) ?? 0;
  const totalChildren = families?.reduce((sum, f) => sum + f.children.length, 0) ?? 0;

  return (
    <AdminShell>
      <Topbar title="Hesablar" subtitle="Qeydiyyatdan keçmiş ailələr" onMenuClick={openMenu} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <StatCard label="Ailələr" value={families?.length ?? '—'} />
          <StatCard label="Valideynlər" value={totalParents || '—'} />
          <StatCard label="Uşaqlar" value={totalChildren || '—'} />
        </div>

        <div className="mb-5 inline-flex rounded-xl bg-surface-alt p-1">
          <TabButton active={activeTab === 'active'} onClick={() => handleSelectTab('active')}>
            <Users size={14} /> Aktiv
          </TabButton>
          <TabButton active={activeTab === 'deactivated'} onClick={() => handleSelectTab('deactivated')}>
            <Archive size={14} /> Deaktiv edilmiş
          </TabButton>
        </div>

        {loadError && <p className="text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}

        {activeTab === 'active' && (
          <>
            {!families && !loadError && <p className="text-body-sm text-text-400">Yüklənir...</p>}
            {families && families.length === 0 && (
              <p className="text-body-sm text-text-400">Hələ heç bir ailə qeydiyyatdan keçməyib.</p>
            )}
            <div className="flex flex-col gap-3">
              {families?.map((family) => (
                <FamilyCard
                  key={family.familyId}
                  family={family}
                  token={admin?.token ?? ''}
                  busy={busyFamilyId === family.familyId}
                  onDeactivate={() => setDeactivateTarget(family)}
                  onParentSaved={(parentId, fullName) =>
                    setFamilies((rows) =>
                      rows?.map((f) =>
                        f.familyId !== family.familyId
                          ? f
                          : { ...f, parents: f.parents.map((p) => (p.parentId === parentId ? { ...p, fullName } : p)) },
                      ) ?? rows,
                    )
                  }
                  onChildSaved={(childId, name, city) =>
                    setFamilies((rows) =>
                      rows?.map((f) =>
                        f.familyId !== family.familyId
                          ? f
                          : { ...f, children: f.children.map((c) => (c.childId === childId ? { ...c, name, city } : c)) },
                      ) ?? rows,
                    )
                  }
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'deactivated' && (
          <>
            {!deactivated && !loadError && <p className="text-body-sm text-text-400">Yüklənir...</p>}
            {deactivated && deactivated.length === 0 && (
              <p className="text-body-sm text-text-400">Deaktiv edilmiş hesab yoxdur.</p>
            )}
            <div className="flex flex-col gap-3">
              {deactivated?.map((family) => (
                <Card key={family.familyId} padding="lg">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      {family.parents.map((p) => (
                        <p key={p.parentId} className="text-body-sm font-bold text-text-900">
                          {p.fullName} <span className="font-normal text-text-400">· {p.email}</span>
                        </p>
                      ))}
                      <p className="mt-1 text-caption text-text-400">
                        {family.children.length} uşaq ·{' '}
                        {family.deactivatedAt ? formatAzDate(new Date(family.deactivatedAt)) : '—'} tarixində deaktiv edilib
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="success"
                      disabled={busyFamilyId === family.familyId}
                      onClick={() => handleReactivate(family)}
                    >
                      <RotateCcw size={14} /> {busyFamilyId === family.familyId ? 'Bərpa olunur...' : 'Bərpa et'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      <Modal open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Hesabı deaktiv et">
        {deactivateTarget && (
          <div>
            <p className="text-body text-text-700">
              <b>{deactivateTarget.parents.map((p) => p.fullName).join(', ') || 'Bu ailə'}</b> hesabı deaktiv edilsin?
              Valideyn(lər) daxil ola bilməyəcək və {deactivateTarget.children.length} uşaq profili müvəqqəti
              gizlədiləcək. İstənilən vaxt "Deaktiv edilmiş" bölməsindən bərpa edilə bilər.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" full onClick={() => setDeactivateTarget(null)}>Ləğv et</Button>
              <Button variant="danger" full onClick={confirmDeactivate} disabled={!!busyFamilyId}>
                <UserX size={15} /> Deaktiv et
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding="md">
      <p className="text-caption font-bold tracking-wide text-text-400">{label}</p>
      <p className="mt-1 text-h3 font-display font-semibold text-text-900">{value}</p>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-body-sm font-bold transition-colors ${
        active ? 'bg-white text-purple-700 shadow-sm' : 'text-text-500 hover:text-text-900'
      }`}
    >
      {children}
    </button>
  );
}

function FamilyCard({
  family,
  token,
  busy,
  onDeactivate,
  onParentSaved,
  onChildSaved,
}: {
  family: FamilySummary;
  token: string;
  busy: boolean;
  onDeactivate: () => void;
  onParentSaved: (parentId: string, fullName: string) => void;
  onChildSaved: (childId: string, name: string, city: string) => void;
}) {
  return (
    <Card padding="lg">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          {family.parents.map((parent) => (
            <ParentRow key={parent.parentId} parent={parent} token={token} onSaved={onParentSaved} />
          ))}
          {family.parents.length === 0 && <p className="text-body-sm text-text-400">Valideyn tapılmadı</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-caption text-text-400">Qeydiyyat: {formatAzDate(new Date(family.createdAt))}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={onDeactivate}>
            <UserX size={14} /> Deaktiv et
          </Button>
        </div>
      </div>

      {family.children.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {family.children.map((child) => (
            <ChildRow key={child.childId} child={child} token={token} onSaved={onChildSaved} />
          ))}
        </div>
      ) : (
        <p className="text-caption text-text-400">Hələ uşaq profili əlavə edilməyib.</p>
      )}
    </Card>
  );
}

function ParentRow({
  parent,
  token,
  onSaved,
}: {
  parent: FamilySummary['parents'][number];
  token: string;
  onSaved: (parentId: string, fullName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(parent.fullName);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error('Ad boş ola bilməz.');
      return;
    }
    setSaving(true);
    try {
      await updateParent(parent.parentId, trimmed, token);
      onSaved(parent.parentId, trimmed);
      setEditing(false);
      toast.success('Yeniləndi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yenilənmədi.');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="h-9 rounded-lg border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
          autoFocus
        />
        <button onClick={save} disabled={saving} className="text-green-600" aria-label="Yadda saxla">
          <Check size={16} />
        </button>
        <button onClick={() => { setDraft(parent.fullName); setEditing(false); }} className="text-text-400" aria-label="Ləğv et">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <p className="text-body-sm font-bold text-text-900">{parent.fullName}</p>
      <p className="text-caption text-text-400">· {parent.email}</p>
      <button
        onClick={() => setEditing(true)}
        className="text-text-300 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Redaktə et"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

function ChildRow({
  child,
  token,
  onSaved,
}: {
  child: FamilySummary['children'][number];
  token: string;
  onSaved: (childId: string, name: string, city: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(child.name);
  const [city, setCity] = useState(child.city);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    if (!trimmedName || !trimmedCity) {
      toast.error('Ad və şəhər boş ola bilməz.');
      return;
    }
    setSaving(true);
    try {
      await updateChild(child.childId, trimmedName, trimmedCity, token);
      onSaved(child.childId, trimmedName, trimmedCity);
      setEditing(false);
      toast.success('Yeniləndi.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yenilənmədi.');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-32 rounded-lg border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
          autoFocus
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="h-9 w-28 rounded-lg border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
        />
        <button onClick={save} disabled={saving} className="text-green-600" aria-label="Yadda saxla">
          <Check size={16} />
        </button>
        <button
          onClick={() => { setName(child.name); setCity(child.city); setEditing(false); }}
          className="text-text-400"
          aria-label="Ləğv et"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <span className="rounded-full bg-purple-100 px-3 py-1.5 text-caption font-bold text-purple-700">
        {child.name} · {child.city}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="text-text-300 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Redaktə et"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}
