import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Star, ArrowRight } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { XpPill } from '../components/Topbar';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { Icon } from '../lib/icons';
import { useAppStore } from '../store/useAppStore';
import habitsData from '../data/habits.json';
import navData from '../data/sidebarNav.json';

const QUICK_LINKS = [
  { to: '/vərdişlər', icon: 'check-square', label: 'Vərdişlər', color: 'from-blue-500 to-blue-600' },
  { to: '/animasiya', icon: 'play', label: 'Animasiya', color: 'from-purple-500 to-purple-700' },
  { to: '/oyunlar', icon: 'puzzle', label: 'Oyunlar', color: 'from-teal-500 to-teal-600' },
  { to: '/sosial', icon: 'users', label: 'Sosial', color: 'from-blue-400 to-blue-600' },
  { to: '/liqalar', icon: 'trophy', label: 'Liqalar', color: 'from-amber-500 to-amber-600' },
  { to: '/cüzdan', icon: 'wallet', label: 'Cüzdan', color: 'from-coral-500 to-coral-600' },
];

export default function HomePage() {
  const openMenu = useOpenMobileMenu();
  const child = useAppStore((s) => s.child);
  const xp = useAppStore((s) => s.xp);
  const streakDays = useAppStore((s) => s.streakDays);
  const habitDone = useAppStore((s) => s.habitDone);
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
              <Card className="h-full bg-grad-primary text-white" padding="lg">
                <p className="text-body-sm font-bold uppercase tracking-wide text-white/70">Bugünkü Vərdişlər</p>
                <p className="mt-2 font-display text-h2 font-semibold">
                  {doneCount} / {totalCount} tamamlandı
                </p>
                <div className="mt-4">
                  <ProgressBar percent={(doneCount / Math.max(1, totalCount)) * 100} tone="white-on-dark" trackClassName="bg-white/20" />
                </div>
                <button
                  onClick={() => navigate('/vərdişlər')}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-body-sm font-semibold hover:bg-white/25"
                >
                  Tapşırıqlara bax <ArrowRight size={14} />
                </button>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="flex h-full flex-col justify-between" padding="lg">
                <div className="flex items-center gap-2 text-amber-600">
                  <Flame size={22} />
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
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br p-5 text-white shadow-soft ${l.color}`}
              >
                <Icon name={l.icon} size={26} />
                <span className="text-body-sm font-bold">{l.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
