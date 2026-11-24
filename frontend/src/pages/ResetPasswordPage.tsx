import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
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
    <AuthLayout eyebrow={copy.eyebrow} title={copy.title} description={copy.description} stats={copy.stats}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
        {!token ? (
          <div className="text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-error-tint text-error">
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
              {submitting ? 'Yenilənir...' : copy.form.cta} <ArrowRight size={18} />
            </Button>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
}
