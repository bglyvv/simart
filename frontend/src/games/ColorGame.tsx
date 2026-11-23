import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const COLORS = [
  { id: 0, className: 'bg-red-600' },
  { id: 1, className: 'bg-blue-600' },
  { id: 2, className: 'bg-green-600' },
  { id: 3, className: 'bg-amber-500' },
];
const MAX_LEVEL = 6;

export default function ColorGame({ onFinish }: { onFinish: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<'ready' | 'showing' | 'input' | 'over'>('ready');
  const [activeFlash, setActiveFlash] = useState<number | null>(null);
  const [playerStep, setPlayerStep] = useState(0);
  const finishedRef = useRef(false);

  function startLevel(nextSeq: number[]) {
    setSequence(nextSeq);
    setPlayerStep(0);
    setPhase('showing');
    nextSeq.forEach((color, i) => {
      setTimeout(() => setActiveFlash(color), i * 700);
      setTimeout(() => setActiveFlash(null), i * 700 + 400);
    });
    setTimeout(() => setPhase('input'), nextSeq.length * 700 + 200);
  }

  useEffect(() => {
    startLevel([Math.floor(Math.random() * 4)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFinish(level: number, success: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const score = success ? 100 : Math.min(95, Math.round(((level - 1) / MAX_LEVEL) * 100));
    setPhase('over');
    setTimeout(() => onFinish(score), 700);
  }

  function press(colorId: number) {
    if (phase !== 'input') return;
    setActiveFlash(colorId);
    setTimeout(() => setActiveFlash(null), 200);

    if (colorId !== sequence[playerStep]) {
      handleFinish(sequence.length, false);
      return;
    }
    const nextStep = playerStep + 1;
    if (nextStep === sequence.length) {
      if (sequence.length >= MAX_LEVEL) {
        handleFinish(sequence.length, true);
        return;
      }
      setTimeout(() => startLevel([...sequence, Math.floor(Math.random() * 4)]), 600);
    } else {
      setPlayerStep(nextStep);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-5 text-body-sm font-bold text-text-500">
        {phase === 'showing' && 'Diqqətlə izlə…'}
        {phase === 'input' && `Sıranı təkrarla · Səviyyə ${sequence.length}`}
        {phase === 'over' && 'Oyun bitdi!'}
        {phase === 'ready' && 'Hazırlaşırıq…'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {COLORS.map((c) => (
          <motion.button
            key={c.id}
            disabled={phase !== 'input'}
            onClick={() => press(c.id)}
            animate={{ scale: activeFlash === c.id ? 1.08 : 1, opacity: activeFlash === c.id ? 1 : 0.85 }}
            whileTap={{ scale: 0.92 }}
            className={`size-20 rounded-2xl sm:size-24 ${c.className} ${activeFlash === c.id ? 'ring-4 ring-white' : ''}`}
          />
        ))}
      </div>
      <p className="mt-5 text-body-sm text-text-400">Maksimum səviyyə: {MAX_LEVEL}</p>
    </div>
  );
}
