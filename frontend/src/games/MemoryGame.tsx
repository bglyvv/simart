import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ICONS = ['🐰', '🦊', '🐼', '🐯', '🐨', '🐵', '🦄', '🐸'];

function buildDeck() {
  const pairs = [...ICONS, ...ICONS];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((icon, id) => ({ id, icon }));
}

export default function MemoryGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [deck] = useState(buildDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    setMoves((m) => m + 1);
    const timer = setTimeout(() => {
      if (deck[a].icon === deck[b].icon) {
        setMatched((m) => [...m, a, b]);
      }
      setFlipped([]);
    }, 550);
    return () => clearTimeout(timer);
  }, [flipped, deck]);

  useEffect(() => {
    if (matched.length === deck.length) {
      const score = Math.max(40, Math.min(100, 100 - (moves - ICONS.length) * 5));
      setTimeout(() => onFinish(score), 500);
    }
  }, [matched, moves, deck.length, onFinish]);

  function handleClick(id: number) {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    setFlipped((f) => [...f, id]);
  }

  return (
    <div>
      <p className="mb-3 text-center text-body-sm text-text-500">Hərəkət sayı: {moves} · Cütlər: {matched.length / 2} / {ICONS.length}</p>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {deck.map((card) => {
          const isUp = flipped.includes(card.id) || matched.includes(card.id);
          return (
            <motion.button
              key={card.id}
              onClick={() => handleClick(card.id)}
              whileTap={{ scale: 0.92 }}
              className="aspect-square rounded-xl"
              style={{ perspective: 600 }}
            >
              <motion.div
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="relative size-full"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-grad-primary text-2xl text-white"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  ❓
                </div>
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-xl text-2xl sm:text-3xl ${
                    matched.includes(card.id) ? 'bg-green-100' : 'bg-purple-50'
                  }`}
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                >
                  {card.icon}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
