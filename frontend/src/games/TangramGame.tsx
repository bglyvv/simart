import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';

type Piece = { shape: 'triangle' | 'square' | 'parallelogram'; rotate: number; color: string };

function PieceView({ piece, size = 34 }: { piece: Piece; size?: number }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    transform: `rotate(${piece.rotate}deg)`,
    backgroundColor: piece.color,
  };
  if (piece.shape === 'triangle') {
    return <div style={{ ...style, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />;
  }
  if (piece.shape === 'parallelogram') {
    return <div style={{ ...style, clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }} />;
  }
  return <div style={{ ...style, borderRadius: 4 }} />;
}

const ROUNDS: { label: string; emoji: string; options: Piece[][]; correct: number }[] = [
  {
    label: 'Ev',
    emoji: '🏠',
    correct: 0,
    options: [
      [{ shape: 'triangle', rotate: 0, color: '#ff8787' }, { shape: 'square', rotate: 0, color: '#f5b83d' }],
      [{ shape: 'parallelogram', rotate: 0, color: '#2dd4bf' }, { shape: 'square', rotate: 45, color: '#4a90e8' }],
      [{ shape: 'triangle', rotate: 180, color: '#a259ff' }, { shape: 'triangle', rotate: 0, color: '#22c55e' }],
    ],
  },
  {
    label: 'Qayıq',
    emoji: '⛵',
    correct: 1,
    options: [
      [{ shape: 'square', rotate: 0, color: '#f5b83d' }, { shape: 'square', rotate: 0, color: '#4a90e8' }],
      [{ shape: 'parallelogram', rotate: 0, color: '#4a90e8' }, { shape: 'triangle', rotate: 0, color: '#ff8787' }],
      [{ shape: 'triangle', rotate: 90, color: '#22c55e' }, { shape: 'triangle', rotate: 270, color: '#a259ff' }],
    ],
  },
  {
    label: 'Ox işarəsi',
    emoji: '⬆️',
    correct: 2,
    options: [
      [{ shape: 'parallelogram', rotate: 20, color: '#a259ff' }, { shape: 'square', rotate: 0, color: '#2dd4bf' }],
      [{ shape: 'square', rotate: 45, color: '#f5b83d' }, { shape: 'square', rotate: 0, color: '#ff8787' }],
      [{ shape: 'triangle', rotate: 0, color: '#4a90e8' }, { shape: 'square', rotate: 0, color: '#4a90e8' }],
    ],
  },
  {
    label: 'Pişik',
    emoji: '🐱',
    correct: 0,
    options: [
      [{ shape: 'triangle', rotate: 45, color: '#f5b83d' }, { shape: 'triangle', rotate: -45, color: '#f5b83d' }],
      [{ shape: 'parallelogram', rotate: 0, color: '#22c55e' }, { shape: 'triangle', rotate: 0, color: '#22c55e' }],
      [{ shape: 'square', rotate: 0, color: '#ff8787' }, { shape: 'square', rotate: 20, color: '#ff8787' }],
    ],
  },
];

export default function TangramGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [pick, setPick] = useState<number | null>(null);

  const current = ROUNDS[round];

  function choose(i: number) {
    if (pick !== null) return;
    setPick(i);
    const isRight = i === current.correct;
    if (isRight) setCorrectCount((c) => c + 1);
    setTimeout(() => {
      if (round + 1 < ROUNDS.length) {
        setRound((r) => r + 1);
        setPick(null);
      } else {
        const finalCorrect = correctCount + (isRight ? 1 : 0);
        onFinish(Math.round((finalCorrect / ROUNDS.length) * 100));
      }
    }, 700);
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-1 text-5xl">{current.emoji}</p>
      <p className="mb-1 font-display font-semibold text-text-900">{current.label}</p>
      <p className="mb-6 text-body-sm text-text-500">Hansı iki fiqur birləşəndə bu şəkli yaradır?</p>

      <div className="grid grid-cols-3 gap-4">
        {current.options.map((opt, i) => {
          const showState = pick !== null;
          const isRight = i === current.correct;
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={() => choose(i)}
              className={`flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 ${
                showState && isRight
                  ? 'border-green-600 bg-green-50'
                  : showState && pick === i
                    ? 'border-red-500 bg-red-50'
                    : 'border-border bg-surface-alt hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-1">
                {opt.map((piece, pi) => (
                  <PieceView key={pi} piece={piece} />
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-6 text-body-sm font-bold text-text-500">Düzgün: {correctCount} / {round + (pick !== null ? 1 : 0)}</p>
    </div>
  );
}
