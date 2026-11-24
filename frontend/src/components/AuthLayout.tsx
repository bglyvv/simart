import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import LogoMark from './LogoMark';

/** Shared two-panel shell for every pre-login/auth screen (login, signup,
 *  forgot/reset password) — a dark brand panel on desktop, stacked above the
 *  form on mobile. Replaces each page's own copy-pasted hero markup so the
 *  premium redesign's visual language (solid neutral panel, no gradients/
 *  decorative blobs) only needs to be defined once. */
export default function AuthLayout({
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: { number: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-surface lg:flex-row">
      <section className="relative flex w-full flex-col justify-between overflow-hidden bg-primary px-8 py-10 sm:px-12 lg:w-[42%] lg:px-16 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 flex items-center gap-3"
        >
          <LogoMark height={36} variant="dark" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="relative z-10 max-w-lg py-10 lg:py-0"
        >
          {eyebrow && (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-caption font-bold uppercase tracking-[1.4px] text-white/70">
              {eyebrow}
            </p>
          )}
          <h1 className={`${eyebrow ? 'mt-5' : ''} font-display text-display font-semibold leading-[1.1] text-white`}>{title}</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-white/70">{description}</p>
        </motion.div>

        {stats && (
          <div className="relative z-10 flex flex-wrap gap-8 sm:gap-10">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-[26px] font-semibold text-white">{stat.number}</p>
                <p className="mt-0.5 text-body-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex w-full flex-1 items-center justify-center bg-surface px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
