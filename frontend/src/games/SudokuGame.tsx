import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];
const BLANKS = [
  [0, 1], [0, 3], [1, 2], [2, 0], [2, 3], [3, 1], [3, 2],
];

export default function SudokuGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    SOLUTION.map((row, r) => row.map((v, c) => (BLANKS.some(([br, bc]) => br === r && bc === c) ? null : v))),
  );
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  function pickNumber(n: number) {
    if (!selected) return;
    const [r, c] = selected;
    setGrid((g) => {
      const next = g.map((row) => [...row]);
      next[r][c] = n;
      return next;
    });
  }

  function checkAnswer() {
    let correct = 0;
    BLANKS.forEach(([r, c]) => {
      if (grid[r][c] === SOLUTION[r][c]) correct += 1;
    });
    const score = Math.round((correct / BLANKS.length) * 100);
    setResult(correct === BLANKS.length ? 'correct' : 'wrong');
    setTimeout(() => onFinish(score), 700);
  }

  const filledCount = BLANKS.filter(([r, c]) => grid[r][c] !== null).length;

  return (
    <div className="flex flex-col items-center">
      <p className="mb-4 text-center text-body-sm text-text-500">Boş xanaları seç, sonra rəqəm düyməsinə bas.</p>
      <div className="grid w-fit grid-cols-4 overflow-hidden rounded-xl border-2 border-text-900">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isBlank = BLANKS.some(([br, bc]) => br === r && bc === c);
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                disabled={!isBlank}
                onClick={() => setSelected([r, c])}
                className={`flex size-14 items-center justify-center text-xl font-bold sm:size-16 ${
                  c === 1 ? 'border-r-2 border-text-900' : c < 3 ? 'border-r border-border' : ''
                } ${r === 1 ? 'border-b-2 border-text-900' : r < 3 ? 'border-b border-border' : ''} ${
                  isBlank ? (isSelected ? 'bg-purple-100 ring-2 ring-purple-600 ring-inset' : 'bg-purple-50 text-purple-700') : 'bg-surface-alt text-text-900'
                }`}
              >
                {val ?? ''}
              </button>
            );
          }),
        )}
      </div>

      <div className="mt-5 flex gap-3">
        {[1, 2, 3, 4].map((n) => (
          <motion.button
            key={n}
            whileTap={{ scale: 0.9 }}
            onClick={() => pickNumber(n)}
            className="flex size-12 items-center justify-center rounded-xl bg-grad-primary text-lg font-bold text-white"
          >
            {n}
          </motion.button>
        ))}
      </div>

      <p className="mt-4 text-body-sm text-text-500">{filledCount} / {BLANKS.length} dolduruldu</p>

      <button
        onClick={checkAnswer}
        disabled={filledCount < BLANKS.length}
        className="mt-4 flex h-12 items-center gap-2 rounded-xl bg-green-600 px-6 font-semibold text-white disabled:opacity-40"
      >
        <Check size={16} /> Yoxla
      </button>

      {result && (
        <p className={`mt-3 font-bold ${result === 'correct' ? 'text-green-600' : 'text-amber-text'}`}>
          {result === 'correct' ? 'Əla! Hamısı düzgündür! 🎉' : 'Bəzi xanalar səhvdir, amma cəhd üçün təbriklər!'}
        </p>
      )}
    </div>
  );
}
