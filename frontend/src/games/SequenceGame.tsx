import { useState } from 'react';
import { motion } from 'framer-motion';

const ROUNDS: { prompt: string[]; answer: string; options: string[] }[] = [
  { prompt: ['2', '4', '6', '8', '?'], answer: '10', options: ['9', '10', '12', '11'] },
  { prompt: ['🔺', '🔵', '🔺', '🔵', '?'], answer: '🔺', options: ['🔺', '🔵', '🟢', '🟡'] },
  { prompt: ['5', '10', '15', '20', '?'], answer: '25', options: ['22', '24', '25', '30'] },
  { prompt: ['🟢', '🟡', '🟢', '🟡', '?'], answer: '🟢', options: ['🟢', '🟡', '🔵', '🔺'] },
  { prompt: ['1', '2', '4', '8', '?'], answer: '16', options: ['10', '12', '16', '14'] },
];

export default function SequenceGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [pick, setPick] = useState<string | null>(null);

  const current = ROUNDS[round];

  function choose(option: string) {
    if (pick) return;
    setPick(option);
    const isRight = option === current.answer;
    if (isRight) setCorrectCount((c) => c + 1);
    setTimeout(() => {
      if (round + 1 < ROUNDS.length) {
        setRound((r) => r + 1);
        setPick(null);
      } else {
        const finalCorrect = correctCount + (isRight ? 1 : 0);
        onFinish(Math.round((finalCorrect / ROUNDS.length) * 100));
      }
    }, 600);
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-5 text-body-sm text-text-500">Sual {round + 1} / {ROUNDS.length}</p>
      <div className="mb-7 flex gap-3 text-2xl font-bold sm:text-3xl">
        {current.prompt.map((p, i) => (
          <span
            key={i}
            className={`flex size-14 items-center justify-center rounded-xl sm:size-16 ${
              p === '?' ? 'border-2 border-dashed border-purple-400 text-purple-400' : 'bg-surface-alt text-text-900'
            }`}
          >
            {p}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {current.options.map((opt) => {
          const isPicked = pick === opt;
          const isRight = opt === current.answer;
          const showState = pick !== null;
          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.92 }}
              onClick={() => choose(opt)}
              className={`flex size-14 items-center justify-center rounded-xl text-xl font-bold sm:size-16 ${
                showState && isRight
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-600'
                  : showState && isPicked
                    ? 'bg-red-100 text-red-600'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-6 text-body-sm font-bold text-text-500">Düzgün: {correctCount} / {round + (pick ? 1 : 0)}</p>
    </div>
  );
}
