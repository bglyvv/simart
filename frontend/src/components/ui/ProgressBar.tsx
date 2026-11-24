import { motion } from 'framer-motion';

type Tone = 'primary' | 'green' | 'blue' | 'sunset' | 'white-on-dark';

// Tone names are kept as-is (call sites unchanged); "blue"/"sunset" — which
// had no equivalent in the new neutral/sage/sand palette — collapse onto the
// sage/sand accents respectively rather than being removed, so no call site
// needs touching as part of this redesign pass.
const FILL_CLASSES: Record<Tone, string> = {
  primary: 'bg-primary',
  green: 'bg-success',
  blue: 'bg-sage',
  sunset: 'bg-sand',
  'white-on-dark': 'bg-white',
};

export default function ProgressBar({
  percent,
  tone = 'primary',
  trackClassName = 'bg-border',
  heightClassName = 'h-2.5',
}: {
  percent: number;
  tone?: Tone;
  trackClassName?: string;
  heightClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full overflow-hidden rounded-full ${heightClassName} ${trackClassName}`}>
      <motion.div
        className={`${heightClassName} rounded-full ${FILL_CLASSES[tone]}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'tween', duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}
