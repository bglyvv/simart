import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

const WORDS: { word: string; emoji: string }[] = [
  { word: 'ALMA', emoji: '🍎' },
  { word: 'KİTAB', emoji: '📚' },
  { word: 'GÜNƏŞ', emoji: '☀️' },
  { word: 'BAĞ', emoji: '🌳' },
  { word: 'OYUN', emoji: '🎮' },
];

function shuffle(letters: string[]) {
  const arr = [...letters];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function WordGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answer, setAnswer] = useState<string[]>([]);
  const [usedIdx, setUsedIdx] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null);

  const current = WORDS[round];
  const letters = useMemo(() => shuffle(current.word.split('')), [round]);

  function pickLetter(i: number) {
    if (usedIdx.includes(i) || feedback) return;
    const next = [...answer, letters[i]];
    setAnswer(next);
    setUsedIdx([...usedIdx, i]);
    if (next.length === current.word.length) {
      const isRight = next.join('') === current.word;
      setFeedback(isRight ? 'right' : 'wrong');
      if (isRight) setCorrectCount((c) => c + 1);
      setTimeout(() => {
        if (round + 1 < WORDS.length) {
          setRound((r) => r + 1);
          setAnswer([]);
          setUsedIdx([]);
          setFeedback(null);
        } else {
          const finalCorrect = correctCount + (isRight ? 1 : 0);
          onFinish(Math.round((finalCorrect / WORDS.length) * 100));
        }
      }, 900);
    }
  }

  function removeLast() {
    if (feedback) return;
    setAnswer((a) => a.slice(0, -1));
    setUsedIdx((u) => u.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-5xl">{current.emoji}</p>
      <p className="mb-5 text-body-sm text-text-500">Söz {round + 1} / {WORDS.length}</p>

      <div className="mb-6 flex min-h-12 flex-wrap justify-center gap-2">
        {current.word.split('').map((_, i) => (
          <span
            key={i}
            className={`flex size-11 items-center justify-center rounded-lg border-2 text-lg font-bold uppercase ${
              feedback === 'right'
                ? 'border-green-600 bg-green-100 text-green-700'
                : feedback === 'wrong'
                  ? 'border-red-500 bg-red-100 text-red-600'
                  : 'border-border bg-surface-alt text-text-900'
            }`}
          >
            {answer[i] ?? ''}
          </span>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {letters.map((letter, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            disabled={usedIdx.includes(i)}
            onClick={() => pickLetter(i)}
            className={`flex size-11 items-center justify-center rounded-lg text-lg font-bold uppercase transition-opacity ${
              usedIdx.includes(i) ? 'opacity-20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {letter}
          </motion.button>
        ))}
      </div>

      <button
        onClick={removeLast}
        className="flex items-center gap-1.5 text-body-sm font-semibold text-text-500 hover:text-text-900"
      >
        <Delete size={14} /> Sil
      </button>

      <p className="mt-4 text-body-sm font-bold text-text-500">Düzgün: {correctCount} / {round + (feedback ? 1 : 0)}</p>
    </div>
  );
}
