import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, Flame, Zap } from 'lucide-react';
import { toast } from 'sonner';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { XpPill } from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import IconTile from '../components/ui/IconTile';
import { Icon } from '../lib/icons';
import { useAppStore, GAME_CATALOG } from '../store/useAppStore';
import { celebrate, bigCelebrate } from '../lib/confetti';
import { fetchGamePlays, recordGamePlay, type GamePlay } from '../lib/gamesService';
import MemoryGame from '../games/MemoryGame';
import SudokuGame from '../games/SudokuGame';
import SequenceGame from '../games/SequenceGame';
import ColorGame from '../games/ColorGame';
import WordGame from '../games/WordGame';
import TangramGame from '../games/TangramGame';
import gamesData from '../data/games.json';

const GAME_COMPONENTS: Record<string, ComponentType<{ onFinish: (score: number) => void }>> = {
  memory: MemoryGame,
  sudoku: SudokuGame,
  sequence: SequenceGame,
  colors: ColorGame,
  words: WordGame,
  tangram: TangramGame,
};

export default function GamesPage() {
  const openMenu = useOpenMobileMenu();
  const parent = useAppStore((s) => s.parent);
  const child = useAppStore((s) => s.child);
  const xp = useAppStore((s) => s.xp);
  const addXp = useAppStore((s) => s.addXp);
  const gameHistory = useAppStore((s) => s.gameHistory);
  const recordGameResult = useAppStore((s) => s.recordGameResult);

  // A child added through the real signup/login flow has both a familyId and
  // a childId — only then does a real play history exist to read from/write
  // to. A child added via the standalone "davam edə bilərsən" path keeps the
  // exact old local-only Zustand behavior, same split every other
  // backend-wired feature in this app already has.
  const useBackend = !!(parent?.familyId && child?.childId);

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  // Real play history for a backend-synced child — replaces the local-only
  // `gameHistory` for stats/plays-count purposes. Null until the first fetch
  // resolves (or always, for a local-only child); stays empty rather than
  // blocking the page on a slow/failed fetch.
  const [backendPlays, setBackendPlays] = useState<GamePlay[]>([]);
  useEffect(() => {
    if (!useBackend || !child?.childId || !parent) return;
    let cancelled = false;
    fetchGamePlays(child.childId, parent.token)
      .then((plays) => {
        if (!cancelled) setBackendPlays(plays);
      })
      .catch((err) => console.error('Oyun tarixçəsi yüklənmədi:', err));
    return () => {
      cancelled = true;
    };
  }, [useBackend, child?.childId, parent?.token]);

  const activeGame = GAME_CATALOG.find((g) => g.id === activeGameId);
  const ActiveComponent = activeGameId ? GAME_COMPONENTS[activeGameId] : null;

  const stats = useMemo(() => {
    const history = useBackend ? backendPlays : gameHistory;
    const plays = history.length;
    const avg = plays ? Math.round(history.reduce((a, g) => a + g.score, 0) / plays) : 0;
    return { plays, avg };
  }, [useBackend, backendPlays, gameHistory]);

  function openGame(id: string) {
    setActiveGameId(id);
    setResult(null);
  }

  async function handleFinish(score: number) {
    if (!activeGame) return;
    setResult(score);

    if (useBackend && child?.childId && parent) {
      try {
        const play = await recordGamePlay(child.childId, activeGame.id, score, parent.token);
        addXp(play.xpAwarded);
        setBackendPlays((prev) => [play, ...prev]);
        if (score >= 80) bigCelebrate();
        else celebrate();
        toast.success(`${activeGame.title} bitdi! Nəticə: ${score}% (+${play.xpAwarded} XP)`);
        return;
      } catch (err) {
        console.error('Oyun nəticəsi backend-ə yazıla bilmədi:', err);
        // Falls through to the local-only path below so the child still
        // gets credit for the play even if the network call failed.
      }
    }

    const xpEarned = Math.round(5 + score / 5);
    addXp(xpEarned);
    recordGameResult({ gameId: activeGame.id, gameTitle: activeGame.title, icon: activeGame.icon, iconBg: activeGame.iconBg, score, axis: activeGame.axis });
    if (score >= 80) bigCelebrate();
    else celebrate();
    toast.success(`${activeGame.title} bitdi! Nəticə: ${score}% (+${xpEarned} XP)`);
  }

  function closeModal() {
    setActiveGameId(null);
    setResult(null);
  }

  return (
    <AppShell>
      <Topbar
        title={gamesData.topbar.title}
        subtitle={gamesData.topbar.subtitle}
        onMenuClick={openMenu}
        actions={<XpPill>🎮 {xp.toLocaleString('az-AZ')} XP</XpPill>}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <p className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-body-sm text-blue-700">🧠 {gamesData.infoBanner}</p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GAME_CATALOG.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card interactive padding="lg" className="flex h-full flex-col">
                  <IconTile icon={<Icon name={g.icon} size={24} />} tint={g.iconBg} size="lg" rounded="md" />
                  <h3 className="mt-3 font-display font-semibold text-text-900">{g.title}</h3>
                  <p className="mt-1 flex-1 text-body-sm text-text-500">{g.description}</p>
                  <Button variant="primary" size="sm" full className="mt-4" onClick={() => openGame(g.id)}>
                    Oynamağa Başla ▶
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="mb-4 mt-8 font-display text-h4 font-semibold text-text-900">🏅 Bu Həftəki Nailiyyətlər</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Brain size={20} />} tint="purple" value={`${stats.plays} Oyun`} label="Ümumi oynanıldı" />
            <StatCard icon={<Target size={20} />} tint="green" value={`%${stats.avg || gamesData.achievements[1].value.replace(/\D/g, '')}`} label="Orta uğur nisbəti" />
            <StatCard icon={<Flame size={20} />} tint="amber" value={gamesData.achievements[2].value} label="Ardıcıl oyun seriyası" />
            <StatCard icon={<Zap size={20} />} tint="blue" value={gamesData.achievements[3].value} label="Orta reaksiya sürəti" />
          </div>
        </div>
      </main>

      <Modal open={!!activeGameId} onClose={closeModal} title={activeGame?.title}>
        {ActiveComponent && result === null && <ActiveComponent onFinish={handleFinish} />}
        {result !== null && activeGame && (
          <div className="flex flex-col items-center py-4 text-center">
            <p className="text-5xl">{result >= 80 ? '🏆' : result >= 50 ? '🎉' : '💪'}</p>
            <p className="mt-3 font-display text-h3 font-semibold text-text-900">Nəticə: {result}%</p>
            <p className="mt-1 text-body-sm text-text-500">
              {result >= 80 ? 'Əla iş! Davam et!' : result >= 50 ? 'Yaxşı cəhd!' : 'Növbəti dəfə daha yaxşı olacaq!'}
            </p>
            <div className="mt-5 flex w-full gap-3">
              <Button variant="outline" full onClick={closeModal}>Bağla</Button>
              <Button variant="primary" full onClick={() => { setResult(null); }}>Yenidən Oyna</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function StatCard({ icon, tint, value, label }: { icon: ReactNode; tint: 'purple' | 'green' | 'amber' | 'blue'; value: string; label: string }) {
  const tintClass = { purple: 'bg-purple-100 text-purple-700', green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-text', blue: 'bg-blue-100 text-blue-700' }[tint];
  return (
    <Card padding="lg" className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <span className={`flex size-10 items-center justify-center rounded-xl ${tintClass}`}>{icon}</span>
      <p className="mt-3 font-display text-h4 font-semibold text-text-900">{value}</p>
      <p className="text-caption text-text-500">{label}</p>
    </Card>
  );
}
