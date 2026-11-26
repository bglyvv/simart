import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Star, ArrowRight } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { XpPill } from '../components/Topbar';
import Card from '../components/ui/Card';
import ThemeArt from '../components/illustrations/ThemeArt';
import { useIsIllustratedTheme } from '../lib/useActiveTheme';
import ProgressBar from '../components/ui/ProgressBar';
import { Icon } from '../lib/icons';
import { useActiveChild, EMPTY_RECORD } from '../store/useAppStore';
import habitsData from '../data/habits.json';
import navData from '../data/sidebarNav.json';

const QUICK_LINKS = [
  { to: '/vərdişlər', icon: 'check-square', label: 'Vərdişlər' },
  { to: '/animasiya', icon: 'play', label: 'Animasiya' },
  { to: '/oyunlar', icon: 'puzzle', label: 'Oyunlar' },
  { to: '/sosial', icon: 'users', label: 'Sosial' },
  { to: '/liqalar', icon: 'trophy', label: 'Liqalar' },
  { to: '/cüzdan', icon: 'wallet', label: 'Cüzdan' },
];

export default function HomePage() {
  const illustrated = useIsIllustratedTheme();
  const openMenu = useOpenMobileMenu();
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const streakDays = child?.streakDays ?? 0;
  const habitDone = child?.habitDone ?? EMPTY_RECORD;
  const navigate = useNavigate();

  const { doneCount, totalCount } = useMemo(() => {
    let done = 0;
    let total = 0;
    habitsData.categories.forEach((cat) => {
      cat.tasks.forEach((_, i) => {
        total += 1;
        if (habitDone[`${cat.key}-${i}`]) done += 1;
      });
    });
    return { doneCount: done, totalCount: total };
  }, [habitDone]);

  return (
    <AppShell>
      <Topbar
        title={`Salam, ${child?.name ?? navData.activeChild.name}! 👋`}
        subtitle="Bugün nə etmək istəyirsən?"
        onMenuClick={openMenu}
        actions={<XpPill><Star size={14} className="mr-1 inline" />{xp.toLocaleString('az-AZ')} XP</XpPill>}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="sm:col-span-2 lg:col-span-2">
              <Card className="th-dark-card relative h-full overflow-hidden bg-primary text-white" padding="lg">
                <ThemeArt name="readingKids" className="pointer-events-none absolute -bottom-1 right-4 hidden h-36 w-auto sm:block" />
                <p className="relative text-body-sm font-bold uppercase tracking-wide text-white/70">Bugünkü Vərdişlər</p>
                <p className="relative mt-2 font-display text-h2 font-semibold">
                  {doneCount} / {totalCount} tamamlandı
                </p>
                <div className={`relative mt-4 ${illustrated ? 'sm:mr-64' : ''}`}>
                  <ProgressBar percent={(doneCount / Math.max(1, totalCount)) * 100} tone="white-on-dark" trackClassName="bg-white/20" />
                </div>
                <button
                  onClick={() => navigate('/vərdişlər')}
                  className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-body-sm font-semibold hover:bg-white/25"
                >
                  Tapşırıqlara bax <ArrowRight size={14} />
                </button>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="flex h-full flex-col justify-between" padding="lg">
                <div className="flex items-center gap-2 text-sand-text">
                  {illustrated ? <ThemeArt name="flame" className="h-8 w-auto" /> : <Flame size={22} />}
                  <span className="font-display text-h3 font-semibold text-text-900">{streakDays} gün</span>
                </div>
                <p className="mt-2 text-body-sm text-text-500">Ardıcıl seriya — davam et!</p>
              </Card>
            </motion.div>
          </div>

          <p className="mb-4 mt-8 font-display text-h4 font-semibold text-text-900">Sürətli Keçidlər</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK_LINKS.map((l, i) => (
              <motion.button
                key={l.to}
                onClick={() => navigate(l.to)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-5 text-text-900 shadow-soft transition-colors hover:bg-surface-alt"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-surface-alt text-text-700">
                  <Icon name={l.icon} size={22} />
                </span>
                <span className="text-body-sm font-bold">{l.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
