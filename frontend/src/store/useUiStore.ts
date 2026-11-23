import { create } from 'zustand';

/** Ephemeral UI-only state (never persisted) — currently just the mobile nav drawer. */
export const useUiStore = create<{
  mobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
}>((set) => ({
  mobileMenuOpen: false,
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
}));
