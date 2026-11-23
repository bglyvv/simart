import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import Button from '../components/ui/Button';
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
  const setChild = useAppStore((s) => s.setChild);

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
    // child added without one (the "davam edə bilərsən" standalone path
    // below) stays local-only, same as before this was wired up.
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

    setChild({ childId, name: name.trim(), avatar, gender, dobDay, dobMonth, dobYear, city: city.trim(), age });
    toast.success(`${name.trim()} üçün profil yaradıldı! ✨`);
    navigate('/aile-qapisi');
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-surface lg:flex-row">
      <section className="relative flex w-full flex-col justify-between overflow-hidden bg-grad-primary px-8 py-10 sm:px-12 lg:w-[42%] lg:px-16 lg:py-14">
        <motion.div
          className="absolute -left-28 -top-28 size-72 rounded-full bg-white/10 lg:size-96"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute -right-12 -bottom-16 size-52 rounded-full bg-white/8" />

        <div className="relative z-10 flex items-center gap-3">
          <LogoMark height={40} />
        </div>

        <div className="relative z-10 py-10 lg:py-0">
          <div className="mb-8 flex flex-wrap gap-4">
            {addChild.floatingAvatars.map((emoji, i) => (
              <motion.div
                key={emoji}
                className="flex size-18 items-center justify-center rounded-full border border-white/22 bg-white/14 text-3xl sm:size-20 sm:text-4xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              >
                {emoji}
              </motion.div>
            ))}
          </div>
          <div className="max-w-md">
            <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold leading-[1.2] text-white">
              {addChild.title}
            </h1>
            <p className="mt-4 text-body-lg leading-relaxed text-white/85">{addChild.description}</p>
          </div>
        </div>

        <div className="h-2" />
      </section>

      <section className="flex w-full flex-1 items-center justify-center overflow-y-auto bg-surface px-6 py-10 sm:px-10">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg py-4"
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-5 flex items-center gap-2 text-body-sm font-semibold text-text-500 hover:text-text-900"
          >
            <ArrowLeft size={16} /> Geri
          </button>
          <div className="mb-6 flex gap-2">
            <div className="h-1.5 w-10 rounded-full bg-purple-600" />
            <div className="h-1.5 w-10 rounded-full bg-purple-600" />
          </div>

          <h2 className="font-display text-h2 font-semibold text-text-900">{addChild.form.title}</h2>
          <p className="mt-2 mb-7 text-text-500">{addChild.form.subtitle}</p>

          <div className="mb-7 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {addChild.form.avatarOptions.map((emoji) => (
              <motion.button
                type="button"
                key={emoji}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAvatar(emoji)}
                className={`flex aspect-square items-center justify-center rounded-full border-[3px] text-2xl sm:text-3xl ${
                  avatar === emoji
                    ? 'border-purple-600 bg-purple-50 shadow-[0_0_0_4px_rgba(237,228,255,1)]'
                    : 'border-transparent bg-surface-alt hover:bg-border-soft'
                }`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          <label className="mb-5 block">
            <span className="mb-2 block text-body-sm font-bold tracking-wide text-text-700">UŞAĞIN ADI</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Uşağın adı"
              className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
            />
          </label>

          <div className="mb-5">
            <span className="mb-2 block text-body-sm font-bold tracking-wide text-text-700">CİNS</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${
                  gender === 'boy' ? 'bg-grad-primary text-white shadow-purple' : 'border-2 border-border text-text-700'
                }`}
              >
                👦 Oğlan
              </button>
              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${
                  gender === 'girl' ? 'bg-grad-primary text-white shadow-purple' : 'border-2 border-border text-text-700'
                }`}
              >
                👧 Qız
              </button>
            </div>
          </div>

          <div className="mb-5">
            <span className="mb-2 block text-body-sm font-bold tracking-wide text-text-700">DOĞUM TARİXİ</span>
            <div className="grid grid-cols-3 gap-3">
              <Select value={dobDay} onChange={setDobDay} options={DAYS} />
              <Select value={dobMonth} onChange={setDobMonth} options={MONTHS_AZ} />
              <Select value={dobYear} onChange={setDobYear} options={YEARS} />
            </div>
          </div>

          <label className="mb-6 block">
            <span className="mb-2 block text-body-sm font-bold tracking-wide text-text-700">ŞƏHƏR / REGİON</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Şəhər adı"
              className="h-13 w-full rounded-xl border-2 border-border bg-surface px-5 text-body-lg text-text-900 outline-none transition-colors focus:border-purple-600"
            />
          </label>

          {error && <p className="mb-4 rounded-xl bg-red-100 px-4 py-2.5 text-body-sm font-medium text-red-600">{error}</p>}
          {!parent && (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-body-sm font-medium text-amber-text">
              Qeyd: valideyn hesabı yaradılmayıb, amma davam edə bilərsən.
            </p>
          )}

          <Button type="submit" variant="success" full size="lg" disabled={submitting}>
            {submitting
              ? 'Yaradılır...'
              : name.trim()
                ? `${name.trim()} Üçün Profili Yarat`
                : addChild.form.cta.replace(' ✨', '')}{' '}
            <Sparkles size={18} />
          </Button>
        </motion.form>
      </section>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-13 w-full rounded-xl border-2 border-border bg-surface px-3 text-body text-text-900 outline-none transition-colors focus:border-purple-600"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
