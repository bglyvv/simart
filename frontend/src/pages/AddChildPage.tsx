import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { addChildAccount } from '../lib/identityService';
import { MONTHS_AZ, toIsoDate } from '../lib/dob';
import data from '../data/familyAuth.json';

const { addChild } = data;

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => String(CURRENT_YEAR - 2 - i));

export default function AddChildPage() {
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const addChildToStore = useAppStore((s) => s.addChild);

  const [avatar, setAvatar] = useState(addChild.form.selectedAvatar);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [dobDay, setDobDay] = useState('15');
  const [dobMonth, setDobMonth] = useState('İyul');
  const [dobYear, setDobYear] = useState(String(CURRENT_YEAR - 6));
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      setError('Uşağın adını və şəhəri daxil edin.');
      return;
    }
    setError('');
    const age = Math.max(0, CURRENT_YEAR - Number(dobYear));
    let childId: string | null = null;

    // Only families created through the real signup flow have a familyId (and
    // the bearer token the backend now requires) to attach a child to — a
    // child added without one (the "davam edə bilərsən" path below) stays
    // local-only, same as before this was wired up.
    if (parent?.familyId) {
      setSubmitting(true);
      try {
        const isoDateOfBirth = toIsoDate(dobDay, dobMonth, dobYear);
        const result = await addChildAccount(
          {
            familyId: parent.familyId,
            name: name.trim(),
            avatarEmoji: avatar,
            gender,
            dateOfBirth: isoDateOfBirth,
            city: city.trim(),
          },
          parent.token,
        );
        childId = result.childId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Uşaq profili yaradıla bilmədi.');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    addChildToStore({ childId, name: name.trim(), avatar, gender, dobDay, dobMonth, dobYear, city: city.trim(), age });
    toast.success(`${name.trim()} üçün profil yaradıldı! ✨`);
    navigate('/aile-qapisi');
  }

  return (
    <AuthLayout eyebrow="Ailə Profili" title={addChild.title} description={addChild.description}>
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-body-sm font-semibold text-text-500 hover:text-text-900"
        >
          <ArrowLeft size={16} /> Geri
        </button>

        <h2 className="font-display text-h2 font-semibold text-text-900">{addChild.form.title}</h2>
        <p className="mt-2 mb-7 text-text-500">{addChild.form.subtitle}</p>

        <div className="mb-7 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {addChild.form.avatarOptions.map((emoji) => (
            <motion.button
              type="button"
              key={emoji}
              whileTap={{ scale: 0.92 }}
              onClick={() => setAvatar(emoji)}
              className={`flex aspect-square items-center justify-center rounded-sm border-2 text-2xl sm:text-3xl ${
                avatar === emoji ? 'border-primary bg-surface-alt' : 'border-transparent bg-surface-alt hover:bg-border-soft'
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Field label="UŞAĞIN ADI">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Uşağın adı" />
          </Field>

          <div>
            <span className="mb-1.5 block text-body-sm font-semibold text-text-700">CİNS</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-sm font-semibold transition-colors ${
                  gender === 'boy' ? 'bg-primary text-white' : 'border border-border text-text-700'
                }`}
              >
                👦 Oğlan
              </button>
              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-sm font-semibold transition-colors ${
                  gender === 'girl' ? 'bg-primary text-white' : 'border border-border text-text-700'
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

        {error && <p className="mt-4 rounded-sm bg-error-tint px-4 py-2.5 text-body-sm font-medium text-error">{error}</p>}
        {!parent && (
          <p className="mt-4 rounded-sm bg-sand-tint px-4 py-2.5 text-body-sm font-medium text-sand-text">
            Qeyd: valideyn hesabı yaradılmayıb, amma davam edə bilərsən.
          </p>
        )}

        <Button type="submit" variant="success" full size="lg" className="mt-6" disabled={submitting}>
          {submitting
            ? 'Yaradılır...'
            : name.trim()
              ? `${name.trim()} Üçün Profili Yarat`
              : addChild.form.cta.replace(' ✨', '')}{' '}
          <Sparkles size={18} />
        </Button>
      </motion.form>
    </AuthLayout>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-sm border border-border bg-surface px-3 text-body text-text-900 outline-none transition-colors focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
