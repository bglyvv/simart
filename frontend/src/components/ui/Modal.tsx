import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** "lg" is wider and scrolls inside the viewport — for long forms. */
  size?: 'md' | 'lg';
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`relative w-full rounded-2xl bg-surface p-6 shadow-float sm:p-8 ${
              size === 'lg' ? 'scrollbar-thin max-h-[90vh] max-w-3xl overflow-y-auto' : 'max-w-md'
            }`}
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Bağla"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-text-400 hover:bg-surface-alt hover:text-text-700"
            >
              <X size={18} />
            </button>
            {title && <h3 className="pr-8 font-display text-h3 font-semibold text-text-900">{title}</h3>}
            <div className={title ? 'mt-4' : ''}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
