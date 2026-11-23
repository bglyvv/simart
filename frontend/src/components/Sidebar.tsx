import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LogoMark from './LogoMark';
import navData from '../data/sidebarNav.json';
import { useAppStore } from '../store/useAppStore';
import { Icon } from '../lib/icons';

const navItemBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-medium text-text-on-dark-muted transition-colors';
const navItemActive = 'bg-grad-primary-soft text-white';

// Per-item accent so each nav icon reads as its own chip rather than a flat
// emoji glyph — subdued fills on the dark sidebar, matched to the brand palette.
const NAV_CHIP: Record<string, string> = {
  home: 'bg-purple-500/15 text-purple-300',
  habits: 'bg-green-500/15 text-green-300',
  animation: 'bg-red-600/15 text-red-300',
  social: 'bg-blue-500/15 text-blue-300',
  leagues: 'bg-amber-500/15 text-amber-300',
  games: 'bg-teal-500/15 text-teal-300',
  wallet: 'bg-coral-500/15 text-coral-500',
  analytics: 'bg-purple-500/15 text-purple-300',
  settings: 'bg-white/10 text-text-on-dark-muted',
};

function NavIcon({ navKey, icon }: { navKey: string; icon: string }) {
  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${NAV_CHIP[navKey] ?? 'bg-white/10 text-white'}`}>
      <Icon name={icon} size={16} />
    </span>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex flex-col gap-1">
        {navData.primaryNav.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : 'hover:bg-white/5'}`}
          >
            <NavIcon navKey={item.key} icon={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="h-4" />
      <p className="px-4 py-2 text-caption font-bold tracking-[1.2px] text-text-on-dark-muted/70">VALİDEYN</p>

      <nav className="flex flex-col gap-1">
        {navData.parentNav.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : 'hover:bg-white/5'}`}
          >
            <NavIcon navKey={item.key} icon={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const child = useAppStore((s) => s.child);
  const xp = useAppStore((s) => s.xp);

  return (
    <div className="flex h-full flex-col bg-navy-900 px-5 py-6">
      <div className="flex items-center px-3">
        <LogoMark height={28} />
      </div>

      <div className="h-8" />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/50 bg-grad-primary text-xl shadow-[0_3px_6px_rgba(0,0,0,0.15),0_0_18px_rgba(138,79,255,0.55)]">
          {child?.avatar ?? '🐰'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{child?.name ?? navData.activeChild.name}</p>
          <p className="truncate text-xs text-text-on-dark-muted">{xp.toLocaleString('az-AZ')} XP · Aktiv Profil</p>
        </div>
      </div>
    </div>
  );
}

/** Desktop: a static full-height column. Mobile: a slide-over drawer opened from the Topbar. */
export default function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
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
