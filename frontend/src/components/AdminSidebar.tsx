import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import LogoMark from './LogoMark';
import { useAdminStore } from '../store/useAdminStore';
import { Icon } from '../lib/icons';

const NAV_ITEMS = [
  { key: 'content', icon: 'play', label: 'Məzmun', path: '/admin' },
  { key: 'habits', icon: 'check-square', label: 'Vərdişlər', path: '/admin/habits' },
  { key: 'accounts', icon: 'users', label: 'Hesablar', path: '/admin/accounts' },
  { key: 'proposals', icon: 'gift', label: 'Mükafat Təklifləri', path: '/admin/proposals' },
  { key: 'books', icon: 'books', label: 'Kitablar', path: '/admin/books' },
  { key: 'messages', icon: 'mail', label: 'Mesajlar', path: '/admin/messages' },
];

const navItemBase =
  'flex items-center gap-3 rounded-sm px-3 py-2.5 text-body font-medium text-text-700 transition-colors';
const navItemActive = 'bg-nav-active text-text-900 font-semibold';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const admin = useAdminStore((s) => s.admin);

  return (
    <div className="flex h-full flex-col border-r border-border bg-surface px-5 py-6">
      <div className="flex items-center px-3">
        <LogoMark height={28} />
      </div>

      <div className="mt-4 mb-6 flex items-center gap-2 px-3 text-caption font-bold tracking-[1.2px] text-text-400">
        <ShieldCheck size={14} />
        İDARƏETMƏ
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end
              onClick={onNavigate}
              className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : 'hover:bg-surface-alt'}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-alt text-text-700">
                <Icon name={item.icon} size={16} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-surface-alt p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-900">{admin?.name ?? 'Admin'}</p>
          <p className="truncate text-xs text-text-500">{admin?.email ?? '—'}</p>
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
              className="absolute inset-0 bg-text-900/40"
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
