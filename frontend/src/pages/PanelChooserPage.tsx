import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Handshake, Users } from 'lucide-react';
import LogoMark from '../components/LogoMark';
import { useAppStore } from '../store/useAppStore';
import { usePartnerStore } from '../store/usePartnerStore';
import { appEntryPath } from '../lib/appEntry';

/** /daxil-ol — where the public header's "Daxil ol" leads: pick the family
 * panel or the partner panel. Each skips its login form when this device is
 * already signed in to it. Styled like FamilyGatePage. */
export default function PanelChooserPage() {
  const navigate = useNavigate();
  const hasParent = useAppStore((s) => !!s.parent);
  const childCount = useAppStore((s) => s.children.length);
  const partnerSignedIn = usePartnerStore((s) => s.authedAsPartner);

  const options = [
    {
      key: 'family',
      title: 'Ailə paneli',
      subtitle: 'Valideyn və uşaq profilləri',
      icon: <Users size={24} />,
      iconClass: 'bg-primary text-white',
      to: appEntryPath(hasParent, childCount) ?? '/giris',
    },
    {
      key: 'partner',
      title: 'Partnyor paneli',
      subtitle: 'Kupon yoxlama və mükafat təklifləri',
      icon: <Handshake size={24} />,
      iconClass: 'bg-surface-alt text-text-700',
      to: partnerSignedIn ? '/partners' : '/partners/login',
    },
  ];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-4 py-12 sm:px-8">
      <div className="flex w-full max-w-xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-center text-center"
        >
          <Link to="/" aria-label="SİMART ana səhifə" className="mb-6">
            <LogoMark height={36} />
          </Link>
          <h1 className="font-display text-h2 font-semibold text-text-900">Xoş gəldiniz</h1>
          <p className="mt-2 text-text-500">Davam etmək üçün panel seçin</p>
        </motion.div>

        <motion.div
          className="w-full"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => navigate(o.to)}
              className="mb-4 flex w-full items-center gap-4 rounded-md border border-border bg-surface px-6 py-5 text-left transition-colors hover:bg-surface-alt"
            >
              <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${o.iconClass}`}>{o.icon}</div>
              <div className="flex-1">
                <p className="text-body-lg font-bold text-text-900">{o.title}</p>
                <p className="mt-0.5 text-body-sm text-text-500">{o.subtitle}</p>
              </div>
              <ArrowRight size={18} className="text-text-400" />
            </button>
          ))}
        </motion.div>

        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-body-sm font-medium text-text-500 hover:text-text-900">
          <ArrowLeft size={16} /> Ana səhifəyə qayıt
        </Link>
      </div>
    </div>
  );
}
