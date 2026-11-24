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
  const children = useAppStore((s) => s.children);
  const setActiveChildId = useAppStore((s) => s.setActiveChildId);
  const tryPin = useAppStore((s) => s.tryPin);
  const [usePassword, setUsePassword] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const pin = useAppStore((s) => s.pin);

  function enterAsChild(localId: string) {
    setActiveChildId(localId);
    navigate('/ana-sehife');
  }

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
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-5xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-center text-center"
        >
          <div className="mb-6 flex items-center justify-center gap-3">
            <LogoMark height={36} />
            <span className="font-display text-xl font-semibold tracking-wide text-text-900 sm:text-2xl">
              AİLƏ HESABI
            </span>
          </div>
          <h1 className="font-display text-h2 font-semibold text-text-900">
            Xoş gəldiniz{parent ? `, ${parent.name}` : ''}
          </h1>
          <p className="mt-2 text-text-500">Davam etmək üçün profil seçin</p>
        </motion.div>

        <div className="grid w-full gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Member list */}
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            {children.map((c) => (
              <button
                key={c.localId}
                onClick={() => enterAsChild(c.localId)}
                className="mb-4 flex w-full items-center gap-4 rounded-md border border-border bg-surface px-6 py-5 text-left transition-colors hover:bg-surface-alt"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl">
                  {c.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-body-lg font-bold text-text-900">{c.name} (Uşaq Profili)</p>
                  <p className="mt-0.5 text-body-sm text-text-500">{c.age} yaş · Balaca Kəşfiyyatçı</p>
                </div>
                <ArrowRight size={18} className="text-text-400" />
              </button>
            ))}

            {parent && (
              <div className="mb-4 flex w-full items-center gap-4 rounded-md border border-border bg-surface px-6 py-5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xl text-text-700">
                  👤
                </div>
                <div className="flex-1">
                  <p className="text-body-lg font-bold text-text-900">{parent.name} (Valideyn)</p>
                  <p className="mt-0.5 text-body-sm text-text-500">İdarəetmə və Analitika Paneli</p>
                </div>
                <Lock size={16} className="text-text-400" />
              </div>
            )}

            <button
              onClick={() => navigate('/usaq-elave-et')}
              className="flex w-full items-center gap-4 rounded-md border border-dashed border-border bg-surface px-6 py-5 text-left transition-colors hover:bg-surface-alt"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xl text-text-700">
                <UserPlus size={20} />
              </div>
              <div className="flex-1">
                <p className="text-body-lg font-bold text-text-900">Yeni Ailə Üzvü Əlavə Et</p>
                <p className="mt-0.5 text-body-sm text-text-500">Uşaq və ya Valideyn profili</p>
              </div>
            </button>
          </motion.div>

          {/* Parental gate */}
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-md border border-border bg-surface p-6 text-center sm:p-8"
          >
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-primary text-2xl">
              🔒
            </div>
            <h2 className="font-display text-h4 font-semibold text-text-900">Valideyn Keçid Qapısı</h2>
            <p className="mb-2 mt-3 text-body-sm leading-relaxed text-text-500">
              {parent?.name ?? 'Valideyn'} hesabına daxil olmaq üçün Master PIN daxil edin.
            </p>
            <p className="mb-6 text-caption text-text-400">Demo PIN: {pin}</p>

            {!usePassword ? (
              <PinPad length={4} dark={false} onComplete={handlePinComplete} />
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  type="password"
                  placeholder="PIN daxil edin"
                  className="h-13 w-full rounded-sm border border-border bg-surface px-5 text-center text-lg text-text-900 outline-none focus:border-primary"
                />
                <button
                  onClick={handlePasswordSubmit}
                  className="flex h-13 items-center justify-center gap-2 rounded-sm bg-primary font-semibold text-white"
                >
                  <KeyRound size={16} /> Davam Et
                </button>
              </div>
            )}

            <button
              onClick={() => setUsePassword((v) => !v)}
              className="mt-6 text-body-sm font-bold text-text-700 hover:text-text-900"
            >
              {usePassword ? 'PIN Pedi ilə Davam Et' : 'Şifrə ilə Davam Et'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
