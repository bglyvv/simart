import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import Button from '../components/ui/Button';
import { useAdminStore } from '../store/useAdminStore';
import { loginAdmin } from '../lib/adminService';
import data from '../data/adminAuth.json';

const { login } = data;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const setAdmin = useAdminStore((s) => s.setAdmin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('E-poçt və şifrəni daxil edin.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const account = await loginAdmin({ email: email.trim(), password });
      setAdmin({ name: account.fullName, email: account.email, token: account.token });
      toast.success('Admin girişi təsdiqləndi.');
      navigate('/admin');
    } catch (err) {
      // The backend's error text is English by design (see
      // InvalidAdminCredentialsException's doc comment) — translate the known case
      // rather than leaking it straight to this Azerbaijani-only page.
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('Incorrect email or password')
          ? 'E-poçt və ya şifrə yanlışdır.'
          : 'Daxil olmaq mümkün olmadı.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-grad-focus px-4 py-12 sm:px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(162,89,255,.16), transparent 40%), radial-gradient(circle at 85% 80%, rgba(74,144,232,.16), transparent 40%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/12 bg-white/6 p-6 text-center backdrop-blur-md sm:p-8"
      >
        <div className="mb-6 flex items-center justify-center gap-3">
          <LogoMark height={36} variant="dark" />
        </div>

        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-grad-primary text-2xl shadow-purple">
          <ShieldCheck size={28} className="text-white" />
        </div>
        <h1 className="font-display text-h3 font-semibold text-white">{login.title}</h1>
        <p className="mt-2 text-body-sm leading-relaxed text-text-on-dark-muted">{login.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3 text-left">
          <label className="block">
            <span className="mb-1.5 block text-caption font-bold tracking-wide text-text-on-dark-muted">
              E-POÇT
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@simart.az"
              className="h-13 w-full rounded-xl border border-white/15 bg-white/8 px-5 text-body text-white outline-none placeholder:text-white/40 focus:border-purple-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-caption font-bold tracking-wide text-text-on-dark-muted">
              ŞİFRƏ
            </span>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                className="h-13 w-full rounded-xl border border-white/15 bg-white/8 px-5 pr-12 text-body text-white outline-none placeholder:text-white/40 focus:border-purple-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-red-500/15 px-4 py-2.5 text-body-sm font-medium text-red-300"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" full size="lg" className="mt-2" disabled={submitting}>
            {submitting ? 'Daxil olunur...' : login.cta} <ArrowRight size={18} />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
