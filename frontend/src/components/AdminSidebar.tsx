import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import LogoMark from './LogoMark';
import { useAdminStore } from '../store/useAdminStore';
import { Icon } from '../lib/icons';

const NAV_ITEMS = [
  { key: 'content', icon: 'play', label: 'Məzmun', path: '/idareetme' },
  { key: 'habits', icon: 'check-square', label: 'Vərdişlər', path: '/idareetme-vərdişlər' },
  { key: 'accounts', icon: 'users', label: 'Hesablar', path: '/idareetme-hesablar' },
  { key: 'proposals', icon: 'gift', label: 'Mükafat Təklifləri', path: '/idareetme-tekliflər' },
];

const navItemBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-medium text-text-on-dark-muted transition-colors';
const navItemActive = 'bg-grad-primary-soft text-white';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const admin = useAdminStore((s) => s.admin);

  return (
    <div className="flex h-full flex-col bg-navy-900 px-5 py-6">
      <div className="flex items-center px-3">
        <LogoMark height={28} />
      </div>

      <div className="mt-4 mb-6 flex items-center gap-2 px-3 text-caption font-bold tracking-[1.2px] text-text-on-dark-muted/70">
        <ShieldCheck size={14} />
        İDARƏETMƏ
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : 'hover:bg-white/5'}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                <Icon name={item.icon} size={16} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/50 bg-grad-primary text-white shadow-[0_3px_6px_rgba(0,0,0,0.15),0_0_18px_rgba(138,79,255,0.55)]">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{admin?.name ?? 'Admin'}</p>
          <p className="truncate text-xs text-text-on-dark-muted">{admin?.email ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

/** Desktop: a static full-height column. Mobile: a slide-over drawer opened from the Topbar.
 *  Mirrors the family-facing Sidebar.tsx structure, but for the separate admin persona —
 *  own nav items, own identity footer, no shared state with useAppStore/Sidebar. */
export default function AdminSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  return (
    <>
      <aside className="hidden h-screen w-[var(--sidebar-w)] shrink-0 md:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-40 md:hidden" initial="closed" animate="open" exit="closed">
            <motion.div
              className="absolute inset-0 bg-navy-950/60"
              variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
              onClick={onMobileClose}
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-[85%] max-w-72"
              variants={{ open: { x: 0 }, closed: { x: '-100%' } }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              <SidebarContent onNavigate={onMobileClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
