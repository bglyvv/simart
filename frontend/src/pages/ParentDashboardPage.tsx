import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Columns2, User } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import RadarChart from '../components/RadarChart';
import IconTile from '../components/ui/IconTile';
import { Icon } from '../lib/icons';
import { useAppStore, useActiveChild, EMPTY_ARRAY, type ChildProfile, type GameResult } from '../store/useAppStore';
import data from '../data/parentDashboard.json';
import { formatAzTime } from '../lib/date';

const AXIS_LABEL: Record<string, string> = {
  attention: 'Diqqət',
  logic: 'Məntiq',
  memory: 'Yaddaş',
  reaction: 'Reaksiya',
  creativity: 'Yaradıcılıq',
};
const SEED_AXIS: Record<string, number> = Object.fromEntries(
  data.radar.axes.map((a) => [
    Object.keys(AXIS_LABEL).find((k) => AXIS_LABEL[k] === a.label) ?? a.label,
    a.value,
  ]),
);

type Range = 'daily' | 'weekly' | 'monthly';
const RANGE_LABEL: Record<Range, string> = { daily: 'Gündəlik', weekly: 'Həftəlik', monthly: 'Aylıq' };
// Game-play history (gameHistory) already carries a real per-play timestamp
// (playedAt) — this is genuine client-side filtering of real data, not a
// new backend query. See root CLAUDE.md's Phase 5 note on why this stays a
// simple time-window filter rather than a new aggregate endpoint.
const RANGE_MS: Record<Range, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

/** Pure, hook-free so it can run once per child in the multi-child comparison
 * view (§7) as well as once for the single active child — same math either
 * way, just called from a loop instead of wrapped in its own useMemo. */
function computeChildAnalytics(gameHistory: readonly GameResult[], range: Range, now: number) {
  const cutoff = now - RANGE_MS[range];
  const filteredHistory = gameHistory.filter((g) => g.playedAt >= cutoff);

  const usingSeedAxes = filteredHistory.length === 0;
  const axesWithRealFlag = Object.keys(AXIS_LABEL).map((axisKey) => {
    const plays = filteredHistory.filter((g) => g.axis === axisKey);
    const real = plays.length > 0;
    const value = real
      ? Math.round(plays.reduce((a, g) => a + g.score, 0) / plays.length)
      : SEED_AXIS[axisKey] ?? 50;
    return { label: AXIS_LABEL[axisKey], value, real };
  });
  const axes = axesWithRealFlag.map(({ label, value }) => ({ label, value }));

  // "Strongest/weakest" should reflect genuinely-measured axes when any exist
  // for the selected period — otherwise a seed fallback number (not real
  // data) could get crowned "strongest," which is exactly the kind of
  // honesty gap root CLAUDE.md asks to avoid introducing.
  const realAxes = axesWithRealFlag.filter((a) => a.real);
  const rankingPool = realAxes.length > 0 ? realAxes : axesWithRealFlag;
  const strongest = [...rankingPool].sort((a, b) => b.value - a.value)[0];
  const weakest = [...rankingPool].sort((a, b) => a.value - b.value)[0];

  return { filteredHistory, axes, usingSeedAxes, strongest, weakest };
}

export default function ParentDashboardPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const child = useActiveChild();
  const allChildren = useAppStore((s) => s.children);
  const gameHistory = child?.gameHistory ?? EMPTY_ARRAY;
  const logoutParent = useAppStore((s) => s.logoutParent);
  const [range, setRange] = useState<Range>('weekly');
  // A one-time snapshot, not a live clock — this page doesn't need the
  // filter boundary to tick in real time, and computing it during render
  // (e.g. inside the useMemo below) would call the impure Date.now() there.
  const [now] = useState(() => Date.now());
  // Hidden entirely for a single-child family, same as the sidebar's own
  // ChildSwitcher — there's nothing to compare yet.
  const [mode, setMode] = useState<'single' | 'compare'>('single');

  const analytics = useMemo(() => computeChildAnalytics(gameHistory, range, now), [gameHistory, range, now]);
  const { filteredHistory, axes, usingSeedAxes, strongest, weakest } = analytics;

  function handleLogout() {
    logoutParent();
    navigate('/aile-qapisi');
  }

  return (
    <AppShell>
      <Topbar
        title={data.topbar.title}
        subtitle={data.topbar.subtitle}
        onMenuClick={openMenu}
        actions={
          <>
            <button
              onClick={handleLogout}
              className="flex size-11 items-center justify-center rounded-full border border-border text-text-500 hover:bg-surface-alt"
              aria-label="Çıxış"
            >
              <LogOut size={17} />
            </button>
            <AvatarButton />
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {/* UI_UX_SPEC.md Screen 09's daily/weekly/monthly filters, applied
                to this page's real per-play game data (see RANGE_MS above). */}
            <div className="flex gap-2">
              {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors ${
                    range === r ? 'border-primary bg-primary text-white' : 'border-border text-text-700 hover:bg-surface-alt'
                  }`}
                >
                  {RANGE_LABEL[r]}
                </button>
              ))}
            </div>

            {allChildren.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('single')}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors ${
                    mode === 'single' ? 'border-primary bg-primary text-white' : 'border-border text-text-700 hover:bg-surface-alt'
                  }`}
                >
                  <User size={14} /> Tək
                </button>
                <button
                  onClick={() => setMode('compare')}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors ${
                    mode === 'compare' ? 'border-primary bg-primary text-white' : 'border-border text-text-700 hover:bg-surface-alt'
                  }`}
                >
                  <Columns2 size={14} /> Müqayisə et
                </button>
              </div>
            )}
          </div>

          {mode === 'compare' && allChildren.length > 1 ? (
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-8 sm:px-8">
              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${allChildren.length}, minmax(260px, 1fr))` }}>
                {allChildren.map((c) => (
                  <ChildAnalyticsColumn key={c.localId} childProfile={c} range={range} now={now} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr_300px]">
              <Card padding="lg" className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col items-center text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary text-3xl">
                    {child?.avatar ?? data.profile.avatarEmoji}
                  </span>
                  <p className="mt-3 font-bold text-text-900">{child?.name ?? data.profile.name}</p>
                  <p className="text-caption text-text-500">{child?.age ?? 6} yaş · İzlənən profil</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Stat label={`${RANGE_LABEL[range].toUpperCase()} OYNANAN OYUN`} value={`${filteredHistory.length} sessiya`} />
                  <Stat label="ƏN GÜCLÜ SAHƏ" value={strongest.label} accent />
                  <Stat label="GÜCLƏNDİRİLMƏLİ SAHƏ" value={weakest.label} />
                </div>
              </Card>

              <Card padding="lg" className="min-w-0">
                <h3 className="font-display font-semibold text-text-900">{data.radar.title}</h3>
                <p className="mt-1 text-body-sm text-text-500">{data.radar.subtitle}</p>
                <div className="mt-6">
                  <RadarChart axes={axes} />
                </div>
                {usingSeedAxes && (
                  <p className="mt-3 text-center text-caption text-text-400">
                    Seçilmiş dövr üçün real oyun datası yoxdur — nümunə göstəricilər görünür.
                  </p>
                )}
              </Card>

              <div className="flex min-w-0 flex-col gap-6">
                <Card padding="lg">
                  <p className="flex items-center gap-2 text-body-sm font-bold uppercase tracking-wide text-text-500">
                    <Icon name="lightbulb" size={20} className="shrink-0 text-sand-text" />
                    Pedaqoji Qiymətləndirmə
                  </p>
                  <p className="mt-3 text-body-sm leading-relaxed text-text-700">
                    {child?.name ?? 'Uşağınız'} ən güclü nəticəni <b>{strongest.label}</b> sahəsində göstərir ({strongest.value}%).{' '}
                    <b>{weakest.label}</b> göstəricilərini gücləndirmək üçün uyğun oyunlar tövsiyə olunur.
                  </p>
                </Card>

                <Card padding="lg">
                  <h3 className="mb-4 font-display font-semibold text-text-900">Son Oyun Nəticələri</h3>
                  {filteredHistory.length === 0 ? (
                    <p className="text-body-sm text-text-500">Seçilmiş dövr üçün oyun nəticəsi yoxdur.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredHistory.slice(0, 4).map((g, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <IconTile icon={<Icon name={g.icon} size={18} />} tint={g.iconBg} />
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
              </div>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

/** One child's column in the §7 side-by-side comparison view — the same
 * per-child math `computeChildAnalytics` does for the single-child view
 * above, just run once per child instead of once for the active one. */
function ChildAnalyticsColumn({ childProfile, range, now }: { childProfile: ChildProfile; range: Range; now: number }) {
  const { filteredHistory, axes, usingSeedAxes, strongest, weakest } = useMemo(
    () => computeChildAnalytics(childProfile.gameHistory, range, now),
    [childProfile.gameHistory, range, now],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card padding="lg" className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary text-2xl">
          {childProfile.avatar}
        </span>
        <p className="font-bold text-text-900">{childProfile.name}</p>
        <p className="text-caption text-text-500">{childProfile.age} yaş</p>
        <div className="mt-2 flex w-full flex-col gap-2 text-left">
          <Stat label={`${RANGE_LABEL[range].toUpperCase()} OYNANAN OYUN`} value={`${filteredHistory.length} sessiya`} />
          <Stat label="ƏN GÜCLÜ SAHƏ" value={strongest.label} accent />
          <Stat label="GÜCLƏNDİRİLMƏLİ SAHƏ" value={weakest.label} />
        </div>
      </Card>

      <Card padding="lg" className="min-w-0">
        <div className="flex justify-center">
          <RadarChart axes={axes} size={220} />
        </div>
        {usingSeedAxes && (
          <p className="mt-3 text-center text-caption text-text-400">
            Real oyun datası yoxdur — nümunə göstəricilər.
          </p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-t border-border-soft pt-3 first:border-0 first:pt-0">
      <p className="text-caption font-bold tracking-wide text-text-400">{label}</p>
      <p className={`mt-1 text-body-lg font-bold ${accent ? 'text-success' : 'text-text-900'}`}>{value}</p>
    </div>
  );
}
