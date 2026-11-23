import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, KeyRound, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import LogoMark from '../components/LogoMark';
import PinPad from '../components/ui/PinPad';
import { useAppStore } from '../store/useAppStore';

export default function FamilyGatePage() {
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const child = useAppStore((s) => s.child);
  const tryPin = useAppStore((s) => s.tryPin);
  const [usePassword, setUsePassword] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const pin = useAppStore((s) => s.pin);

  function handlePinComplete(value: string) {
    const ok = tryPin(value);
    if (ok) {
      toast.success('Valideyn girişi təsdiqləndi.');
      navigate('/analitika');
    } else {
      toast.error('PIN yanlışdır, yenidən cəhd edin.');
    }
    return ok;
  }

  function handlePasswordSubmit() {
    if (tryPin(pwValue)) {
      toast.success('Valideyn girişi təsdiqləndi.');
      navigate('/analitika');
    } else {
      toast.error('Kod yanlışdır.');
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

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-6 flex items-center justify-center gap-3">
            <LogoMark height={42} />
            <span className="font-display text-xl font-semibold tracking-wide text-white sm:text-2xl">
              AİLƏ HESABI
            </span>
          </div>
          <h1 className="font-display text-h2 font-semibold text-white">
            Xoş gəldiniz{parent ? `, ${parent.name}` : ''}
          </h1>
          <p className="mt-2 text-text-on-dark-muted">Davam etmək üçün profil seçin</p>
        </motion.div>

        <div className="grid w-full gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Member list */}
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            {child && (
              <button
                onClick={() => navigate('/ana-sehife')}
                className="mb-4 flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-white/5 px-6 py-5 text-left transition-colors hover:bg-white/9"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-grad-primary text-2xl">
                  {child.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-body-lg font-bold text-white">{child.name} (Uşaq Profili)</p>
                  <p className="mt-0.5 text-body-sm text-text-on-dark-muted">
                    {child.age} yaş · Balaca Kəşfiyyatçı
                  </p>
                </div>
                <ArrowRight size={18} className="text-text-on-dark-muted" />
              </button>
            )}

            {parent && (
              <div className="mb-4 flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-white/5 px-6 py-5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-grad-blue text-xl text-white">
                  👤
                </div>
                <div className="flex-1">
                  <p className="text-body-lg font-bold text-white">{parent.name} (Valideyn)</p>
                  <p className="mt-0.5 text-body-sm text-text-on-dark-muted">İdarəetmə və Analitika Paneli</p>
                </div>
                <Lock size={16} className="text-amber-500" />
              </div>
            )}

            <button
              onClick={() => navigate('/usaq-elave-et')}
              className="flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-white/5 px-6 py-5 text-left opacity-70 transition-opacity hover:opacity-100"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xl text-white">
                <UserPlus size={20} />
              </div>
              <div className="flex-1">
                <p className="text-body-lg font-bold text-white">Yeni Ailə Üzvü Əlavə Et</p>
                <p className="mt-0.5 text-body-sm text-text-on-dark-muted">Uşaq və ya Valideyn profili</p>
              </div>
            </button>
          </motion.div>

          {/* Parental gate */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-2xl border border-white/12 bg-white/6 p-6 text-center backdrop-blur-md sm:p-8"
          >
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-grad-primary text-2xl shadow-purple">
              🔒
            </div>
            <h2 className="font-display text-h4 font-semibold text-white">Valideyn Keçid Qapısı</h2>
            <p className="mb-2 mt-3 text-body-sm leading-relaxed text-text-on-dark-muted">
              {parent?.name ?? 'Valideyn'} hesabına daxil olmaq üçün Master PIN daxil edin.
            </p>
            <p className="mb-6 text-caption text-purple-400">Demo PIN: {pin}</p>

            {!usePassword ? (
              <PinPad length={4} onComplete={handlePinComplete} />
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  type="password"
                  placeholder="PIN daxil edin"
                  className="h-13 w-full rounded-xl border border-white/15 bg-white/8 px-5 text-center text-lg text-white outline-none focus:border-purple-400"
                />
                <button
                  onClick={handlePasswordSubmit}
                  className="flex h-13 items-center justify-center gap-2 rounded-xl bg-grad-primary font-semibold text-white"
                >
                  <KeyRound size={16} /> Davam Et
                </button>
              </div>
            )}

            <button
              onClick={() => setUsePassword((v) => !v)}
              className="mt-6 text-body-sm font-bold text-purple-400 hover:text-purple-300"
            >
              {usePassword ? 'PIN Pedi ilə Davam Et' : 'Şifrə ilə Davam Et'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
