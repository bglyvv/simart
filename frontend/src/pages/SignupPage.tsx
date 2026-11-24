import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, ArrowLeft, Check, Heart, Clock, Gift } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import PinPad from '../components/ui/PinPad';
import { useAppStore } from '../store/useAppStore';
import { signUpFamily, addChildAccount } from '../lib/identityService';
import { MONTHS_AZ, toIsoDate } from '../lib/dob';
import data from '../data/familyAuth.json';

const { signup, addChild: addChildCopy } = data;

const CURRENT_YEAR = new Date().getFullYear();
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const YEARS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR - 2 - i));

const STEP_COUNT = 4;

// The folded-in "onboarding" step (per the approved redesign plan — a
// standalone /onboarding flow wasn't wanted) — a short, concrete preview of
// what the family can actually do, not generic marketing copy.
const HIGHLIGHTS = [
  { icon: Heart, text: 'Gündəlik vərdişləri izləyin və uşağınızla birlikdə XP qazanın.' },
  { icon: Clock, text: 'Ekran vaxtını Fokus Rejimi ilə tarazlaşdırın.' },
  { icon: Gift, text: 'Toplanan XP-ni real mükafatlara dəyişin — hər sorğu sizin təsdiqinizi gözləyir.' },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const setParent = useAppStore((s) => s.setParent);
  const setChildren = useAppStore((s) => s.setChildren);
  const setPin = useAppStore((s) => s.setPin);
  const addChildToStore = useAppStore((s) => s.addChild);

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 0 — parent info
  const [fullName, setFullName] = useState('');

  // Step 1 — account & security (the spec's "email and password" step, with
  // the Master PIN folded in as the other account-security credential; see
  // the redesign plan for why a separate "family information" step was
  // dropped — there's no such field anywhere in the real data model).
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pin, setPinValue] = useState('');
  const [pinResetKey, setPinResetKey] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);

  // Step 2 — optional, skippable child profile
  const [childAvatar, setChildAvatar] = useState(addChildCopy.form.selectedAvatar);
  const [childName, setChildName] = useState('');
  const [childGender, setChildGender] = useState<'boy' | 'girl'>('boy');
  const [dobDay, setDobDay] = useState('15');
  const [dobMonth, setDobMonth] = useState('İyul');
  const [dobYear, setDobYear] = useState(String(CURRENT_YEAR - 6));
  const [city, setCity] = useState('');
  const [childCreated, setChildCreated] = useState(false);

  function goToStep(next: number) {
    setError('');
    setStep(next);
  }

  function handleStep0Submit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Zəhmət olmasa adınızı daxil edin.');
      return;
    }
    goToStep(1);
  }

  async function handleStep1Submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
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
      const account = await signUpFamily({ fullName: fullName.trim(), email: email.trim(), password, pin });
      setParent({
        familyId: account.familyId,
        parentId: account.parentId,
        name: account.fullName,
        email: account.email,
        token: account.token,
      });
      // A brand-new account starts with an empty family — without this, a
      // previous session's children (e.g. a different family signed up/logged
      // in earlier on this same device) would stay in `children` and leak
      // into this one, since `addChild` (used by the next step) appends
      // rather than overwrites. The old single-child `setChild` never had
      // this problem, since it always replaced the one child outright.
      setChildren([]);
      // Bridges the local PIN-gate (FamilyGatePage/tryPin) to the PIN just
      // registered with the backend — see identityService.ts's doc comment
      // for why this is a bridge, not real PIN verification.
      setPin(pin);
      goToStep(2);
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

  async function handleChildSubmit(e: FormEvent) {
    e.preventDefault();
    if (!childName.trim() || !city.trim()) {
      setError('Uşağın adını və şəhəri daxil edin.');
      return;
    }
    if (!parent?.familyId) {
      // Shouldn't happen (step 1 always sets parent first) — fail safe
      // rather than attempting a doomed network call.
      goToStep(3);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const isoDateOfBirth = toIsoDate(dobDay, dobMonth, dobYear);
      const result = await addChildAccount(
        {
          familyId: parent.familyId,
          name: childName.trim(),
          avatarEmoji: childAvatar,
          gender: childGender,
          dateOfBirth: isoDateOfBirth,
          city: city.trim(),
        },
        parent.token,
      );
      const age = Math.max(0, CURRENT_YEAR - Number(dobYear));
      addChildToStore({
        childId: result.childId,
        name: childName.trim(),
        avatar: childAvatar,
        gender: childGender,
        dobDay,
        dobMonth,
        dobYear,
        city: city.trim(),
        age,
      });
      setChildCreated(true);
      goToStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uşaq profili yaradıla bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  function skipChild() {
    goToStep(3);
  }

  function finish() {
    toast.success('Xoş gəlmisiniz!');
    navigate(childCreated ? '/aile-qapisi' : '/usaq-elave-et');
  }

  return (
    <AuthLayout eyebrow={signup.eyebrow} title={signup.title} description={signup.description} stats={signup.stats}>
      <div className="mb-7 flex gap-2">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.form
            key="step0"
            onSubmit={handleStep0Submit}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="font-display text-h2 font-semibold text-text-900">Valideyn Məlumatları</h2>
            <p className="mt-2 text-text-500">Addım 1/{STEP_COUNT} — sizi necə çağıraq?</p>

            <div className="mt-7">
              <Field label="VALİDEYNİN ADI VƏ SOYADI">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" />
              </Field>
            </div>

            <ErrorMessage error={error} />

            <Button type="submit" full size="lg" className="mt-6">
              Növbəti <ArrowRight size={18} />
            </Button>

            <button
              type="button"
              onClick={() => navigate('/giris')}
              className="mt-5 block w-full text-center text-body-sm font-semibold text-text-700 hover:text-text-900"
            >
              {signup.form.switchText}
            </button>
          </motion.form>
        )}

        {step === 1 && (
          <motion.form
            key="step1"
            onSubmit={handleStep1Submit}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="font-display text-h2 font-semibold text-text-900">Hesab Təhlükəsizliyi</h2>
            <p className="mt-2 text-text-500">Addım 2/{STEP_COUNT} — e-poçt, şifrə və PIN təyin edin</p>

            <div className="mt-7 flex flex-col gap-4">
              <Field label="E-POÇT ÜNVANI">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-poçt ünvanı" />
              </Field>

              <Field label="MASTER ŞİFRƏ" hint="Min. 6 simvol">
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="pr-12"
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
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••"
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
                    className="mt-3 text-body-sm font-semibold text-text-700 hover:text-text-900"
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
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span className="text-body-sm text-text-500">{signup.form.termsText}</span>
            </label>

            <ErrorMessage error={error} />

            <div className="mt-6 flex gap-3">
              <Button type="button" variant="outline" onClick={() => goToStep(0)}>
                <ArrowLeft size={16} />
              </Button>
              <Button type="submit" full disabled={submitting}>
                {submitting ? 'Yaradılır...' : 'Növbəti'} <ArrowRight size={18} />
              </Button>
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-body-sm text-text-400">
              <ShieldCheck size={14} /> Şifrəniz və PIN-iniz şifrələnmiş (hash) şəkildə saxlanılır.
            </p>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form
            key="step2"
            onSubmit={handleChildSubmit}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="font-display text-h2 font-semibold text-text-900">Uşaq Profili</h2>
            <p className="mt-2 text-text-500">Addım 3/{STEP_COUNT} — istəsəniz indi, ya da sonra əlavə edin</p>

            <div className="mt-6 mb-5 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {addChildCopy.form.avatarOptions.map((emoji) => (
                <motion.button
                  type="button"
                  key={emoji}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setChildAvatar(emoji)}
                  className={`flex aspect-square items-center justify-center rounded-sm border-2 text-xl ${
                    childAvatar === emoji ? 'border-primary bg-surface-alt' : 'border-transparent bg-surface-alt hover:bg-border-soft'
                  }`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <Field label="UŞAĞIN ADI">
                <Input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Uşağın adı" />
              </Field>

              <div>
                <span className="mb-1.5 block text-body-sm font-semibold text-text-700">CİNS</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setChildGender('boy')}
                    className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-sm font-semibold transition-colors ${
                      childGender === 'boy' ? 'bg-primary text-white' : 'border border-border text-text-700'
                    }`}
                  >
                    👦 Oğlan
                  </button>
                  <button
                    type="button"
                    onClick={() => setChildGender('girl')}
                    className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-sm font-semibold transition-colors ${
                      childGender === 'girl' ? 'bg-primary text-white' : 'border border-border text-text-700'
                    }`}
                  >
                    👧 Qız
                  </button>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-body-sm font-semibold text-text-700">DOĞUM TARİXİ</span>
                <div className="grid grid-cols-3 gap-3">
                  <Select value={dobDay} onChange={setDobDay} options={DAYS} />
                  <Select value={dobMonth} onChange={setDobMonth} options={MONTHS_AZ} />
                  <Select value={dobYear} onChange={setDobYear} options={YEARS} />
                </div>
              </div>

              <Field label="ŞƏHƏR / REGİON">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Şəhər adı" />
              </Field>
            </div>

            <ErrorMessage error={error} />

            <div className="mt-6 flex gap-3">
              <Button type="button" variant="outline" full onClick={skipChild} disabled={submitting}>
                Sonra Əlavə Et
              </Button>
              <Button type="submit" variant="success" full disabled={submitting}>
                {submitting ? 'Yaradılır...' : <><Sparkles size={16} /> Yarat</>}
              </Button>
            </div>
          </motion.form>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="text-center"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <Check size={28} />
            </div>
            <h2 className="mt-5 font-display text-h2 font-semibold text-text-900">Hazırsınız!</h2>
            <p className="mt-3 text-text-500">
              Ailə hesabınız uğurla yaradıldı{childCreated ? ' və uşaq profiliniz əlavə edildi' : ''}.
            </p>

            <div className="mt-6 flex flex-col gap-3 text-left">
              {HIGHLIGHTS.map((h) => (
                <div key={h.text} className="flex items-start gap-3 rounded-sm border border-border p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-alt text-text-700">
                    <h.icon size={17} />
                  </span>
                  <p className="text-body-sm text-text-700">{h.text}</p>
                </div>
              ))}
            </div>

            <Button full size="lg" className="mt-7" onClick={finish}>
              Davam Et <ArrowRight size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

function ErrorMessage({ error }: { error: string }) {
  if (!error) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-sm bg-error-tint px-4 py-2.5 text-body-sm font-medium text-error"
    >
      {error}
    </motion.p>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body-sm text-text-900 outline-none transition-colors focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
