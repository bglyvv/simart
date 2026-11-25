import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LogoMark from './LogoMark';
import ChildSwitcher from './ChildSwitcher';
import navData from '../data/sidebarNav.json';
import { useAppStore, useActiveChild } from '../store/useAppStore';
import { Icon } from '../lib/icons';

// "SaaS + gamification" redesign: the active nav item is a solid primary
// pill with a white icon/label, matching every desktop mockup in the PDF —
// reversing the prior "premium minimal" pass's neutral-highlight treatment.
const navItemBase =
  'flex items-center gap-3 rounded-sm px-3 py-2.5 text-body font-medium text-text-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const navItemActive = 'bg-nav-active text-white font-semibold';

function NavIcon({ icon, isActive = false }: { icon: string; isActive?: boolean }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${isActive ? 'bg-transparent text-white' : 'bg-surface-alt text-text-700'}`}
    >
      <Icon name={icon} size={17} />
    </span>
  );
}

/** `parentOnly` items (Analitika Paneli, Ailə Üzvləri) only make sense for a
 * parent reviewing the family — a plain child session doesn't see them at
 * all, not greyed out, same as every other parent-only control in this app.
 * `childOnly` (Oyunlar) is the other direction — it's a kid's own feature,
 * not something a parent reviewing data needs cluttering their nav. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const items = navData.nav.filter((item) => {
    if (item.parentOnly) return authedAsParent;
    if (item.childOnly) return !authedAsParent;
    return true;
  });

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : 'hover:bg-surface-alt'}`}
        >
          {({ isActive }) => (
            <>
              <NavIcon icon={item.icon} isActive={isActive} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const child = useActiveChild();
  const multiChild = useAppStore((s) => s.children.length > 1);
  // Switching which child the app is acting as is a parent action — a plain
  // child session (hasn't unlocked the Master PIN this session) never sees
  // the option at all, not even disabled; they just see their own profile,
  // same read-only card a single-child family always showed.
  const authedAsParent = useAppStore((s) => s.authedAsParent);
  const xp = child?.xp ?? 0;

  return (
    <div className="flex h-full flex-col border-r border-border bg-surface px-5 py-6">
      <div className="flex items-center px-3">
        <LogoMark height={28} />
      </div>

      <div className="h-8" />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>

      {multiChild && authedAsParent ? (
        <div className="mt-4">
          <ChildSwitcher />
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-surface-alt p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-xl">
            {child?.avatar ?? '🐰'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text-900">{child?.name ?? navData.activeChild.name}</p>
            <p className="truncate text-xs text-text-500">{xp.toLocaleString('az-AZ')} XP · Aktiv Profil</p>
          </div>
        </div>
      )}
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
