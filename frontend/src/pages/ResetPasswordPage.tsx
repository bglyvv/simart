import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import Button from '../components/ui/Button';
import { resetPassword } from '../lib/identityService';
import data from '../data/familyAuth.json';

const { resetPassword: copy } = data;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Şifrə ən azı 6 simvol olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifrələr uyğun gəlmir.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      toast.success(copy.form.successMessage);
      navigate('/giris');
    } catch (err) {
      // The backend's reset-token error text is English by design (same
      // anti-enumeration shape InvalidCredentialsException already uses) — this
      // UI is Azerbaijani throughout, so map it rather than leak it.
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('invalid or has expired')
          ? copy.form.invalidLinkMessage
          : 'Şifrə yenilənə bilmədi — bir az sonra yenidən cəhd edin.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-surface lg:flex-row">
      {/* Brand panel */}
      <section className="relative flex w-full flex-col justify-between overflow-hidden bg-grad-hero px-8 py-10 sm:px-12 lg:w-[46%] lg:px-16 lg:py-14">
        <motion.div
          className="absolute -right-32 -top-32 size-80 rounded-full bg-white/10 lg:size-[28rem]"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute -left-16 -bottom-24 size-64 rounded-full bg-white/8 animate-float" />
        <div className="absolute bottom-32 right-10 size-28 rotate-12 rounded-[32px] bg-white/8 animate-float" style={{ animationDelay: '1.5s' }} />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center gap-3"
        >
          <LogoMark height={40} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative z-10 max-w-lg py-10 lg:py-0"
        >
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-caption font-bold uppercase tracking-[1.4px] text-white/90">
            <Sparkles size={12} /> {copy.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-h1 font-semibold leading-[1.15] text-white">{copy.title}</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-white/85">{copy.description}</p>
        </motion.div>

        <div className="relative z-10 flex flex-wrap gap-8 sm:gap-10">
          {copy.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-[26px] font-semibold text-white">{stat.number}</p>
              <p className="mt-0.5 text-body-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form panel */}
      <section className="flex w-full flex-1 items-center justify-center bg-surface px-6 py-12 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-md"
        >
          {!token ? (
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle size={28} />
              </div>
              <h2 className="mt-5 font-display text-h2 font-semibold text-text-900">Link yanlışdır</h2>
              <p className="mt-3 text-text-500">{copy.form.invalidLinkMessage}</p>
              <Button full size="lg" className="mt-7" onClick={() => navigate('/sifre-unutdum')}>
                Yeni Link İstə
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="font-display text-h2 font-semibold text-text-900">{copy.form.title}</h2>
              <p className="mt-2 text-text-500">{copy.form.subtitle}</p>

              <div className="mt-7 flex flex-col gap-4">
                <Field label="YENİ ŞİFRƏ">
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 pr-12 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-400 hover:text-text-700"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>

                <Field label="ŞİFRƏNİN TƏKRARI">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••••"
                    className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
                  />
                </Field>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl bg-red-100 px-4 py-2.5 text-body-sm font-medium text-red-600"
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" full size="lg" className="mt-6" disabled={submitting}>
                {submitting ? 'Yenilənir...' : copy.form.cta} <ArrowRight size={18} />
              </Button>
            </form>
          )}
        </motion.div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-body-sm font-bold tracking-wide text-text-700">{label}</span>
      {children}
    </label>
  );
}
