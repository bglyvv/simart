import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import Button from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { loginFamily, fetchFamilyChildren } from '../lib/identityService';
import { fromIsoDate, ageFromYear } from '../lib/dob';
import data from '../data/familyAuth.json';

const { login } = data;

export default function LoginPage() {
  const navigate = useNavigate();
  const setParent = useAppStore((s) => s.setParent);
  const setChild = useAppStore((s) => s.setChild);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('E-poçt və şifrənizi daxil edin.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const account = await loginFamily({ email: email.trim(), password });
      setParent({
        familyId: account.familyId,
        parentId: account.parentId,
        name: account.fullName,
        email: account.email,
        token: account.token,
      });

      // Login only ever returns family/parent info — fetch this family's own
      // children to restore the one this device doesn't already have cached
      // (e.g. a fresh browser/device). See identityService.ts's doc comment
      // for why the local PIN gate can't be restored the same way.
      const children = await fetchFamilyChildren(account.familyId, account.token);
      const firstChild = children[0];

      if (firstChild) {
        const { day, month, year } = fromIsoDate(firstChild.dateOfBirth);
        setChild({
          childId: firstChild.childId,
          name: firstChild.name,
          avatar: firstChild.avatarEmoji,
          gender: firstChild.gender === 'girl' ? 'girl' : 'boy',
          dobDay: day,
          dobMonth: month,
          dobYear: year,
          city: firstChild.city,
          age: ageFromYear(year),
        });
        toast.success(`Xoş gəldiniz, ${account.fullName}!`);
        navigate('/aile-qapisi');
      } else {
        toast.success(`Xoş gəldiniz, ${account.fullName}!`, {
          description: 'İndi uşaq profilini əlavə edək.',
        });
        navigate('/usaq-elave-et');
      }
    } catch (err) {
      // The backend's error text is English by design (see InvalidCredentialsException's
      // doc comment) — this UI is Azerbaijani throughout, so the known case gets a
      // proper translation rather than leaking that string straight to the page.
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
            <Sparkles size={12} /> {login.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-h1 font-semibold leading-[1.15] text-white">{login.title}</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-white/85">{login.description}</p>
        </motion.div>

        <div className="relative z-10 flex flex-wrap gap-8 sm:gap-10">
          {login.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-[26px] font-semibold text-white">{stat.number}</p>
              <p className="mt-0.5 text-body-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form panel */}
      <section className="flex w-full flex-1 items-center justify-center bg-surface px-6 py-12 sm:px-10">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-md"
        >
          <h2 className="font-display text-h2 font-semibold text-text-900">{login.form.title}</h2>
          <p className="mt-2 text-text-500">{login.form.subtitle}</p>

          <div className="mt-7 flex flex-col gap-4">
            <Field label="E-POÇT ÜNVANI">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="E-poçt ünvanı"
                className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
              />
            </Field>

            <Field label="ŞİFRƏ">
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

            <button
              type="button"
              onClick={() => navigate('/sifre-unutdum')}
              className="-mt-1 self-end text-body-sm font-semibold text-purple-600 hover:text-purple-700"
            >
              Şifrəni unutmusunuz?
            </button>
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
            {submitting ? 'Daxil olunur...' : login.form.cta.replace(' →', '')} <ArrowRight size={18} />
          </Button>

          <button
            type="button"
            onClick={() => navigate('/qeydiyyat')}
            className="mt-5 block w-full text-center text-body-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            {login.form.switchText}
          </button>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-body-sm text-text-400">
            <ShieldCheck size={14} /> Şifrəniz şifrələnmiş (hash) şəkildə saxlanılır.
          </p>
        </motion.form>
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
