import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Flame, Trophy, Gamepad2, ArrowLeft } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import Tabs from '../components/ui/Tabs';
import { useAppStore, LEAGUE_TIERS } from '../store/useAppStore';
import { formatAzTime } from '../lib/date';

type TabKey = 'overview' | 'activity' | 'goals' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Ümumi baxış' },
  { key: 'activity', label: 'Fəaliyyət' },
  { key: 'goals', label: 'Məqsədlər' },
  { key: 'settings', label: 'Parametrlər' },
];

/** A single child's own profile (UI_UX_SPEC.md Screen 06), reached from
 *  FamilyPage — addressed by `localId` (not the nullable backend `childId`)
 *  so it works for local-only children too. Deliberately shows the routed
 *  child's own data regardless of which child is currently "active," so a
 *  parent can glance at any child without switching context. */
export default function ChildProfilePage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const { localId } = useParams<{ localId: string }>();
  const children = useAppStore((s) => s.children);
  const setActiveChildId = useAppStore((s) => s.setActiveChildId);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const [tab, setTab] = useState<TabKey>('overview');

  const child = children.find((c) => c.localId === localId);

  if (!child) {
    return (
      <AppShell>
        <Topbar title="Uşaq Profili" subtitle="Tapılmadı" onMenuClick={openMenu} actions={<AvatarButton />} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl">
            <Card padding="lg">
              <p className="text-body-sm text-text-500">Bu profil tapılmadı.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/ailə-üzvləri')}>
                <ArrowLeft size={16} /> Ailə Üzvlərinə Qayıt
              </Button>
            </Card>
          </div>
        </main>
      </AppShell>
    );
  }

  const currentTierIdx = [...LEAGUE_TIERS].reverse().findIndex((t) => child.xp >= t.threshold);
  const tierIdx = currentTierIdx === -1 ? 0 : LEAGUE_TIERS.length - 1 - currentTierIdx;
  const tier = LEAGUE_TIERS[tierIdx];
  const nextTier = LEAGUE_TIERS[Math.min(tierIdx + 1, LEAGUE_TIERS.length - 1)];
  const prevThreshold = tierIdx > 0 ? LEAGUE_TIERS[tierIdx].threshold : 0;
  const tierProgress = ((child.xp - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100;

  const redeemedCount = Object.values(child.redeemedRewards).filter(Boolean).length;
  const isActive = child.localId === activeChildId;

  return (
    <AppShell>
      <Topbar
        title={child.name}
        subtitle={`${child.age} yaş · ${child.city}`}
        onMenuClick={openMenu}
        actions={<AvatarButton initials={child.name.slice(0, 2).toUpperCase()} />}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <Card padding="lg" className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-3xl">
              {child.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-h4 font-display font-semibold text-text-900">{child.name}</p>
              <p className="text-body-sm text-text-500">{child.gender === 'boy' ? 'Oğlan' : 'Qız'} · {child.age} yaş</p>
            </div>
            {!isActive && (
              <Button variant="secondary" size="sm" onClick={() => setActiveChildId(child.localId)}>
                Bu Profilə Keç
              </Button>
            )}
          </Card>

          <div className="mb-6">
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
          </div>

          {tab === 'overview' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat icon={<Star size={18} />} label="Ümumi XP" value={child.xp.toLocaleString('az-AZ')} />
              <Stat icon={<Flame size={18} />} label="Ardıcıl Seriya" value={`${child.streakDays} gün`} />
              <Stat icon={<Trophy size={18} />} label="Liqa" value={tier.label.split('·')[0].trim()} />
            </div>
          )}

          {tab === 'activity' && (
            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">Son Oyun Nəticələri</h3>
              {child.gameHistory.length === 0 ? (
                <p className="text-body-sm text-text-500">Hələ heç bir oyun oynanmayıb.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {child.gameHistory.slice(0, 6).map((g, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-700">
                        <Gamepad2 size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-bold text-text-900">{g.gameTitle}</p>
                        <p className="text-caption text-text-400">{formatAzTime(new Date(g.playedAt))}</p>
                      </div>
                      <span className="text-body-sm font-bold text-success">{g.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'goals' && (
            <Card padding="lg">
              <h3 className="font-display font-semibold text-text-900">Liqa Tərəqqisi</h3>
              <p className="mt-1 text-body-sm text-text-500">
                Növbəti: {nextTier.label.split('·')[0].trim()} liqası — {nextTier.threshold.toLocaleString('az-AZ')} XP
              </p>
              <div className="mt-4">
                <ProgressBar percent={tierProgress} />
              </div>
              <p className="mt-5 text-body-sm text-text-700">
                Dəyişdirilmiş mükafatlar: <b>{redeemedCount}</b>
              </p>
            </Card>
          )}

          {tab === 'settings' && (
            <Card padding="lg" className="flex flex-col gap-3 text-body-sm">
              <Row label="Ad" value={child.name} />
              <Row label="Yaş" value={`${child.age}`} />
              <Row label="Cins" value={child.gender === 'boy' ? 'Oğlan' : 'Qız'} />
              <Row label="Şəhər" value={child.city} />
              <Row label="Hesab növü" value={child.childId ? 'Real hesab' : 'Lokal profil'} />
            </Card>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card padding="lg" className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <span className="flex size-10 items-center justify-center rounded-sm bg-surface-alt text-text-700">{icon}</span>
      <p className="mt-3 font-display text-h4 font-semibold text-text-900">{value}</p>
      <p className="text-caption text-text-500">{label}</p>
    </Card>
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
