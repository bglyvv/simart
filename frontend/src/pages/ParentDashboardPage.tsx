import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import RadarChart from '../components/RadarChart';
import IconTile from '../components/ui/IconTile';
import { Icon } from '../lib/icons';
import { useAppStore } from '../store/useAppStore';
import data from '../data/parentDashboard.json';
import { formatAzTime } from '../lib/date';
import { fetchPlaylists, youtubeWatchUrl, type Playlist } from '../lib/contentService';

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

export default function ParentDashboardPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const gameHistory = useAppStore((s) => s.gameHistory);
  const logoutParent = useAppStore((s) => s.logoutParent);

  // Only the "parent"-tagged playlist (currently just "Valideyn Bələdçisi") is ever
  // requested on this panel — the child-tagged playlists stay on the Animasiya page.
  const [guidePlaylist, setGuidePlaylist] = useState<Playlist | null>(null);
  useEffect(() => {
    fetchPlaylists('parent').then((playlists) => setGuidePlaylist(playlists[0] ?? null));
  }, []);

  const axes = useMemo(() => {
    return Object.keys(AXIS_LABEL).map((axisKey) => {
      const plays = gameHistory.filter((g) => g.axis === axisKey);
      const value = plays.length
        ? Math.round(plays.reduce((a, g) => a + g.score, 0) / plays.length)
        : SEED_AXIS[axisKey] ?? 50;
      return { label: AXIS_LABEL[axisKey], value };
    });
  }, [gameHistory]);

  const strongest = [...axes].sort((a, b) => b.value - a.value)[0];
  const weakest = [...axes].sort((a, b) => a.value - b.value)[0];
  const totalSessions = (data.profile.stats[0].value.match(/\d+/)?.[0] ?? '0');
  const realSessions = Number(totalSessions) + gameHistory.length;

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
            <span className="hidden items-center gap-1.5 rounded-full bg-purple-100 px-4 py-2 text-body-sm font-bold text-purple-700 sm:inline-flex">
              <Icon name="trend-up" size={15} />
              HƏFTƏLİK HESABAT
            </span>
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
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr_300px]">
          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-grad-primary text-3xl">
                {child?.avatar ?? data.profile.avatarEmoji}
              </span>
              <p className="mt-3 font-bold text-text-900">{child?.name ?? data.profile.name}</p>
              <p className="text-caption text-text-500">{child?.age ?? 6} yaş · İzlənən profil</p>
            </div>
            <div className="flex flex-col gap-3">
              <Stat label="CƏMİ OYNANAN OYUN" value={`${realSessions} sessiya`} />
              <Stat label="ORTA CAVAB SÜRƏTİ" value={data.profile.stats[1].value} />
              <Stat label="BU HƏFTƏ AKTİV GÜN" value={data.profile.stats[2].value} />
              <Stat label="ƏN GÜCLÜ SAHƏ" value={strongest.label} accent />
            </div>
          </Card>

          <Card className="bg-navy-900" padding="lg">
            <h3 className="font-display font-semibold text-white">{data.radar.title}</h3>
            <p className="mt-1 text-body-sm text-text-on-dark-muted">{data.radar.subtitle}</p>
            <div className="mt-6">
              <RadarChart axes={axes} />
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="bg-grad-primary text-white" padding="lg">
              <p className="flex items-center gap-2 text-body-sm font-bold uppercase tracking-wide text-white/70">
                <Icon name="lightbulb" size={20} className="shrink-0 text-amber-300" />
                Pedaqoji Qiymətləndirmə ({(child?.name ?? data.profile.name).toUpperCase()} ÜÇÜN)
              </p>
              <p className="mt-3 text-body-sm leading-relaxed">
                {(child?.name ?? 'Uşağınız')} ən güclü nəticəni <b>{strongest.label}</b> sahəsində göstərir ({strongest.value}%).{' '}
                <b>{weakest.label}</b> göstəricilərini gücləndirmək üçün uyğun oyunlar tövsiyə olunur.
              </p>
            </Card>

            {guidePlaylist && (
              <Card padding="lg">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="font-display font-semibold text-text-900">{guidePlaylist.title}</h3>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-caption font-bold text-blue-700">
                    Valideyn üçün
                  </span>
                </div>
                {guidePlaylist.description && (
                  <p className="mb-4 text-caption text-text-400">{guidePlaylist.description}</p>
                )}
                <div className="flex flex-col gap-3">
                  {guidePlaylist.videos.map((v) => (
                    <a
                      key={v.youtubeId}
                      href={youtubeWatchUrl(v.youtubeId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg transition-colors hover:bg-surface-alt"
                    >
                      <IconTile icon={<Icon name="play" size={16} />} tint="blue-100" size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-bold text-text-900">{v.title}</p>
                      </div>
                      <span className="shrink-0 text-caption text-text-400">{v.duration}</span>
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-caption text-text-400">Videolar YouTube-da açılır — serverimizdə saxlanılmır.</p>
              </Card>
            )}

            <Card padding="lg">
              <h3 className="mb-4 font-display font-semibold text-text-900">Son Oyun Nəticələri</h3>
              <div className="flex flex-col gap-3">
                {(gameHistory.length ? gameHistory.slice(0, 4) : null)?.map((g, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <IconTile icon={<Icon name={g.icon} size={18} />} tint={g.iconBg} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-bold text-text-900">{g.gameTitle}</p>
                      <p className="text-caption text-text-400">{formatAzTime(new Date(g.playedAt))}</p>
                    </div>
                    <span className="text-body-sm font-bold text-green-600">{g.score}%</span>
                  </div>
                )) ??
                  data.gameHistory.map((g) => (
                    <div key={g.title} className="flex items-center gap-3">
                      <IconTile icon={<Icon name={g.icon} size={18} />} tint={g.iconBg} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-bold text-text-900">{g.title}</p>
                        <p className="text-caption text-text-400">{g.when}</p>
                      </div>
                      <span className="text-body-sm font-bold text-green-600">{g.score}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-t border-border-soft pt-3 first:border-0 first:pt-0">
      <p className="text-caption font-bold tracking-wide text-text-400">{label}</p>
      <p className={`mt-1 text-body-lg font-bold ${accent ? 'text-purple-600' : 'text-text-900'}`}>{value}</p>
    </div>
  );
}
