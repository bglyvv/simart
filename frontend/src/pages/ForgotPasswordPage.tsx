import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, MailCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import { forgotPassword } from '../lib/identityService';
import data from '../data/familyAuth.json';

const { forgotPassword: copy } = data;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Shown after a successful submit regardless of whether the email actually
  // matched an account — the backend never reveals that either, so the UI
  // can't either. See identityService.ts's forgotPassword doc comment.
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      // A network/server failure here is the one case worth surfacing — the
      // "email not found" case never throws, it's folded into the same success
      // path as a real account (see the backend's anti-enumeration design).
      setError('Sorğu göndərilə bilmədi — bir az sonra yenidən cəhd edin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow={copy.eyebrow} title={copy.title} description={copy.description} stats={copy.stats}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
        {sent ? (
          <div className="text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-tint text-success">
              <MailCheck size={28} />
            </div>
            <h2 className="mt-5 font-display text-h2 font-semibold text-text-900">Göndərildi!</h2>
            <p className="mt-3 text-text-500">{copy.form.successMessage}</p>
            <Button full size="lg" className="mt-7" onClick={() => navigate('/giris')}>
              <ArrowLeft size={16} /> Daxil Olmaya Qayıt
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="font-display text-h2 font-semibold text-text-900">{copy.form.title}</h2>
            <p className="mt-2 text-text-500">{copy.form.subtitle}</p>

            <div className="mt-7">
              <Field label="E-POÇT ÜNVANI">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="E-poçt ünvanı"
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
              {submitting ? 'Göndərilir...' : copy.form.cta} <ArrowRight size={18} />
            </Button>

            <button
              type="button"
              onClick={() => navigate('/giris')}
              className="mt-5 block w-full text-center text-body-sm font-semibold text-text-700 hover:text-text-900"
            >
              {copy.form.switchText}
            </button>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
}
