import { motion } from 'framer-motion';

type Tone = 'primary' | 'green' | 'blue' | 'sunset' | 'white-on-dark';

const FILL_CLASSES: Record<Tone, string> = {
  primary: 'bg-grad-primary',
  green: 'bg-green-600',
  blue: 'bg-grad-blue',
  sunset: 'bg-grad-sunset',
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
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </div>
  );
}
