import { useState } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

/** A real, working PIN pad: digits fill in, backspace works, and `onComplete`
 *  fires once `length` digits have been entered. */
export default function PinPad({
  length = 4,
  onComplete,
  dark = true,
}: {
  length?: number;
  onComplete: (pin: string) => boolean | void;
  dark?: boolean;
}) {
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);

  function press(key: string) {
    if (key === '') return;
    if (key === 'back') {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (value.length >= length) return;
    const next = value + key;
    setValue(next);
    if (next.length === length) {
      const ok = onComplete(next);
      if (ok === false) {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setValue('');
        }, 450);
      }
    }
  }

  const dotBase = dark ? 'border-white/25 bg-white/15' : 'border-border bg-surface-alt';
  const dotFilled = dark ? 'border-white bg-white' : 'border-primary bg-primary';
  const keyBase = dark
    ? 'border border-white/10 bg-white/6 text-white hover:bg-white/12'
    : 'border border-border bg-surface-alt text-text-900 hover:bg-border-soft';

  return (
    <div>
      <motion.div
        className="mb-6 flex justify-center gap-3"
        animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {Array.from({ length }).map((_, i) => (
          <div key={i} className={`size-4 rounded-full border transition-colors ${i < value.length ? dotFilled : dotBase}`} />
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <motion.button
            key={i}
            type="button"
            disabled={key === ''}
            onClick={() => press(key)}
            whileTap={key ? { scale: 0.92 } : undefined}
            className={`flex h-14 items-center justify-center rounded-sm text-lg font-semibold transition-colors ${
              key === '' ? 'invisible' : keyBase
            }`}
          >
            {key === 'back' ? <Delete size={18} /> : key}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
