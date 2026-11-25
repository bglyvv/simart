import type { ReactNode } from 'react';
import { Menu, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActivityStore } from '../store/useActivityStore';

export default function Topbar({
  title,
  subtitle,
  actions,
  onMenuClick,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[76px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Menyunu aç"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-700 md:hidden"
          >
            <Menu size={19} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-h3 font-semibold text-text-900">{title}</h1>
          <p className="truncate text-body-sm text-text-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">{actions}</div>
    </header>
  );
}

export function AvatarButton({ initials = 'KB' }: { initials?: string }) {
  return (
    <div className="flex size-11 items-center justify-center rounded-full bg-primary font-display text-body-sm font-bold text-white">
      {initials}
    </div>
  );
}

export function IconButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-border bg-bg text-base transition-colors hover:bg-border-soft"
    >
      {children}
    </button>
  );
}

/** The shared bell button every reference mockup's topbar carries, with a
 * real unread indicator (not decorative) — see useActivityStore's own
 * lastSeenAt/entries, the same data NotificationsPage itself reads. */
export function NotificationBell() {
  const navigate = useNavigate();
  const hasUnread = useActivityStore((s) => s.entries.some((e) => e.timestamp > s.lastSeenAt));
  return (
    <button
      onClick={() => navigate('/bildirişlər')}
      aria-label="Bildirişlər"
      className="relative flex size-11 items-center justify-center rounded-full border border-border bg-bg text-base transition-colors hover:bg-border-soft"
    >
      <Bell size={17} />
      {hasUnread && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-surface bg-error" aria-label="Oxunmamış bildiriş var" />}
    </button>
  );
}

export function XpPill({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center whitespace-nowrap rounded-full bg-sand-tint px-4 py-2.5 text-body-sm font-bold text-sand-text">
      {children}
    </div>
  );
}
