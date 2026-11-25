import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Icon } from '../lib/icons';
import { useUiStore } from '../store/useUiStore';

// The 4 fixed slots, confirmed with the user (Phase 8): the core daily loop —
// check in, do habits, watch content, play a game. Everything else (Ailə
// Üzvləri, Sosial, Liqalar, Məqsədlər, Cüzdan, Bildirişlər, plus the
// parent-only Analitika/Tənzimləmələr) lives behind the 5th "Daha" slot,
// which reuses the existing full-nav drawer (Sidebar's mobile slide-over)
// rather than a second, separate overflow sheet.
const PRIMARY_ITEMS = [
  { key: 'home', icon: 'home', label: 'Ana Səhifə', path: '/ana-sehife' },
  { key: 'habits', icon: 'check-square', label: 'Vərdişlər', path: '/vərdişlər' },
  { key: 'animation', icon: 'play', label: 'Animasiya', path: '/animasiya' },
  { key: 'games', icon: 'puzzle', label: 'Oyunlar', path: '/oyunlar' },
];

// An inset (negative) offset instead of Button/Sidebar's usual outward one —
// this bar sits flush against the screen edge, so an outward ring would get
// clipped by the viewport rather than fully visible.
const itemClass = (isActive: boolean) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
    isActive ? 'text-primary' : 'text-text-400'
  }`;

/** Mobile-only fixed bottom tab bar — the phone-native counterpart to the
 * desktop/tablet Sidebar. Lives in AppShell, so every family/parent screen
 * gets it automatically. */
export default function BottomNav() {
  const openMobileMenu = useUiStore((s) => s.openMobileMenu);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-surface/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {PRIMARY_ITEMS.map((item) => (
        <NavLink key={item.key} to={item.path} className={({ isActive }) => itemClass(isActive)}>
          {({ isActive }) => (
            <>
              <Icon name={item.icon} size={21} className={isActive ? 'text-primary' : 'text-text-400'} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button type="button" onClick={openMobileMenu} aria-label="Daha çox" className={itemClass(false)}>
        <Menu size={21} />
        <span>Daha</span>
      </button>
    </nav>
  );
}
