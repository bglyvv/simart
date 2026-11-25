import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { loginFamily, fetchFamilyChildren } from '../lib/identityService';
import { fromIsoDate, ageFromYear } from '../lib/dob';
import data from '../data/familyAuth.json';

const { login } = data;

export default function LoginPage() {
  const navigate = useNavigate();
  const setParent = useAppStore((s) => s.setParent);
  const setChildren = useAppStore((s) => s.setChildren);

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
      // children to restore whichever ones this device doesn't already have
      // cached (e.g. a fresh browser/device). See identityService.ts's doc
      // comment for why the local PIN gate can't be restored the same way.
      const children = await fetchFamilyChildren(account.familyId, account.token);

      if (children.length > 0) {
        setChildren(
          children.map((c) => {
            const { day, month, year } = fromIsoDate(c.dateOfBirth);
            return {
              childId: c.childId,
              name: c.name,
              avatar: c.avatarEmoji,
              gender: c.gender === 'girl' ? 'girl' : 'boy',
              dobDay: day,
              dobMonth: month,
              dobYear: year,
              city: c.city,
              age: ageFromYear(year),
              hasPin: c.hasPin,
            };
          }),
        );
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
    <AuthLayout eyebrow={login.eyebrow} title={login.title} description={login.description} stats={login.stats}>
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <h2 className="font-display text-h2 font-semibold text-text-900">{login.form.title}</h2>
        <p className="mt-2 text-text-500">{login.form.subtitle}</p>

        <div className="mt-7 flex flex-col gap-4">
          <Field label="E-POÇT ÜNVANI">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="E-poçt ünvanı"
            />
          </Field>

          <Field label="ŞİFRƏ">
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

          <button
            type="button"
            onClick={() => navigate('/sifre-unutdum')}
            className="-mt-1 self-end text-body-sm font-semibold text-text-700 hover:text-text-900"
          >
            Şifrəni unutmusunuz?
          </button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-sm bg-error-tint px-4 py-2.5 text-body-sm font-medium text-error"
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
          className="mt-5 block w-full text-center text-body-sm font-semibold text-text-700 hover:text-text-900"
        >
          {login.form.switchText}
        </button>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-body-sm text-text-400">
          <ShieldCheck size={14} /> Şifrəniz şifrələnmiş (hash) şəkildə saxlanılır.
        </p>
      </motion.form>
    </AuthLayout>
  );
}
