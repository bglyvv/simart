import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import Button from '../components/ui/Button';
import PinPad from '../components/ui/PinPad';
import { useAppStore } from '../store/useAppStore';
import { signUpFamily } from '../lib/identityService';
import data from '../data/familyAuth.json';

const { signup } = data;

export default function SignupPage() {
  const navigate = useNavigate();
  const setParent = useAppStore((s) => s.setParent);
  const setPin = useAppStore((s) => s.setPin);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pin, setPinValue] = useState('');
  // PinPad keeps its own internal digit state with no reset prop — bumping
  // this remounts it with a clean slate when the user wants to re-enter.
  const [pinResetKey, setPinResetKey] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Zəhmət olmasa bütün sahələri doldurun.');
      return;
    }
    if (!email.includes('@')) {
      setError('Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.');
      return;
    }
    if (password.length < 6) {
      setError('Şifrə ən azı 6 simvoldan ibarət olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifrələr uyğun gəlmir.');
      return;
    }
    if (pin.length !== 4) {
      setError('Zəhmət olmasa 4 rəqəmli PIN daxil edin.');
      return;
    }
    if (!agree) {
      setError('Davam etmək üçün razılaşmanı qəbul edin.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const account = await signUpFamily({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        pin,
      });
      setParent({
        familyId: account.familyId,
        parentId: account.parentId,
        name: account.fullName,
        email: account.email,
        token: account.token,
      });
      // Bridges the local PIN-gate (FamilyGatePage/tryPin) to the PIN just
      // registered with the backend. A real login endpoint exists now
      // (loginFamily in identityService.ts) and verifies the password against
      // the backend's hash, but nothing verifies the PIN specifically — the
      // dashboard gate still only ever checks the local copy set here.
      setPin(pin);
      toast.success('Ailə hesabı yaradıldı!', { description: 'İndi uşaq profilini əlavə edək.' });
      navigate('/usaq-elave-et');
    } catch (err) {
      // The backend's error text is English by design (see EmailAlreadyUsedException's
      // doc comment) — this UI is Azerbaijani throughout, so the known case gets a
      // proper translation rather than leaking that string straight to the page.
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('already registered')
          ? 'Bu e-poçt artıq qeydiyyatdan keçib.'
          : 'Hesab yaradıla bilmədi.',
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
            <Sparkles size={12} /> {signup.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-h1 font-semibold leading-[1.15] text-white">{signup.title}</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-white/85">{signup.description}</p>
        </motion.div>

        <div className="relative z-10 flex flex-wrap gap-8 sm:gap-10">
          {signup.stats.map((stat) => (
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
          <div className="flex gap-2">
            <div className="h-1.5 w-10 rounded-full bg-purple-600" />
            <div className="h-1.5 w-6 rounded-full bg-border" />
          </div>

          <h2 className="mt-7 font-display text-h2 font-semibold text-text-900">{signup.form.title}</h2>
          <p className="mt-2 text-text-500">{signup.form.subtitle}</p>

          <div className="mt-7 flex flex-col gap-4">
            <Field label="VALİDEYNİN ADI VƏ SOYADI">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ad Soyad"
                className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
              />
            </Field>

            <Field label="E-POÇT ÜNVANI">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-poçt ünvanı"
                className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
              />
            </Field>

            <Field label="MASTER ŞİFRƏ" hint="Min. 6 simvol">
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

            <Field label="VALİDEYN PANELİ ÜÇÜN PIN" hint="4 rəqəm — Analitika panelinə daxil olmaq üçün istifadə olunacaq">
              <PinPad key={pinResetKey} length={4} dark={false} onComplete={(v) => setPinValue(v)} />
              {pin.length === 4 && (
                <button
                  type="button"
                  onClick={() => {
                    setPinValue('');
                    setPinResetKey((k) => k + 1);
                  }}
                  className="mt-3 text-body-sm font-semibold text-purple-600 hover:text-purple-700"
                >
                  Yenidən daxil et
                </button>
              )}
            </Field>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-purple-600"
            />
            <span className="text-body-sm text-text-500">{signup.form.termsText}</span>
          </label>

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
            {submitting ? 'Yaradılır...' : signup.form.cta.replace(' →', '')} <ArrowRight size={18} />
          </Button>

          <button
            type="button"
            onClick={() => navigate('/giris')}
            className="mt-5 block w-full text-center text-body-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            {signup.form.switchText}
          </button>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-body-sm text-text-400">
            <ShieldCheck size={14} /> Şifrəniz və PIN-iniz şifrələnmiş (hash) şəkildə saxlanılır.
          </p>
        </motion.form>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-body-sm font-bold tracking-wide text-text-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-caption text-text-400">{hint}</span>}
    </label>
  );
}
