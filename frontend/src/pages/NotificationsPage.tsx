import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Gift, XCircle, Wallet, Settings as SettingsIcon, Bell } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton, IconButton, XpPill } from '../components/Topbar';
import Card from '../components/ui/Card';
import ThemeArt from '../components/illustrations/ThemeArt';
import { useIsIllustratedTheme } from '../lib/useActiveTheme';
import { useActiveChild } from '../store/useAppStore';
import { useActivityStore, type ActivityType, type ActivityEntry } from '../store/useActivityStore';
import { formatAzDate, formatAzTime } from '../lib/date';

const TYPE_META: Record<ActivityType, { icon: typeof CheckCircle2; bg: string; text: string }> = {
  habit_completed: { icon: CheckCircle2, bg: 'bg-success-tint', text: 'text-success' },
  reward_redeemed: { icon: Gift, bg: 'bg-sand-tint', text: 'text-sand-text' },
  reward_approved: { icon: CheckCircle2, bg: 'bg-success-tint', text: 'text-success' },
  reward_rejected: { icon: XCircle, bg: 'bg-error-tint', text: 'text-error' },
  allowance_granted: { icon: Wallet, bg: 'bg-sand-tint', text: 'text-sand-text' },
};

/** UI_UX_SPEC.md Screen 10 — real "recent activity" built from actual events
 *  this device saw succeed (habit completions, reward redemption/approval/
 *  rejection, allowance grants — see useActivityStore.ts). This is honestly
 *  a this-device log, not a synced cross-device notification system — there
 *  is no backend notifications table, see root CLAUDE.md's Phase 7 note. */
export default function NotificationsPage() {
  const illustrated = useIsIllustratedTheme();
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const child = useActiveChild();
  const xp = child?.xp ?? 0;
  const entries = useActivityStore((s) => s.entries);
  const lastSeenAt = useActivityStore((s) => s.lastSeenAt);
  const markAllSeen = useActivityStore((s) => s.markAllSeen);

  // Captured once, before markAllSeen runs — so entries already in the list
  // this visit still render as unread until the *next* visit, rather than
  // instantly losing their unread dot the moment this page mounts.
  const [seenThreshold] = useState(lastSeenAt);

  useEffect(() => {
    markAllSeen();
  }, [markAllSeen]);

  return (
    <AppShell>
      <Topbar
        title="Bildirişlər"
        subtitle="Bu cihazdakı son fəaliyyət"
        onMenuClick={openMenu}
        actions={
          <>
            <XpPill>⭐ {xp.toLocaleString('az-AZ')} XP</XpPill>
            <IconButton onClick={() => navigate('/bildirişlər')}><Bell size={17} /></IconButton>
            <IconButton onClick={() => navigate('/tənzimləmələr')}><SettingsIcon size={17} /></IconButton>
            <AvatarButton />
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <Card variant="soft" padding="lg" className="th-hero mb-6 flex items-center justify-between gap-4 overflow-hidden">
            <div className="relative">
              <h2 className="th-hero-title font-display text-h3 font-semibold text-text-900">Bildirişləriniz</h2>
              <p className="th-hero-text mt-1 text-body-sm text-text-500">
                Vərdişlər, mükafatlar və digər vacib yeniliklər barədə məlumat alın.
              </p>
            </div>
            {illustrated ? (
              <ThemeArt name="bell" className="h-20 w-auto shrink-0 sm:h-24" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sand-tint text-sand-text">
                <Bell size={26} />
              </span>
            )}
          </Card>

          {entries.length === 0 ? (
            <Card padding="lg">
              <p className="text-body-sm text-text-500">Hələ heç bir fəaliyyət yoxdur.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map((entry) => (
                <NotificationRow key={entry.id} entry={entry} unread={entry.timestamp > seenThreshold} />
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-caption text-text-400">
            Bu siyahı yalnız bu cihazda saxlanılır — digər cihazlarla sinxronlaşmır.
          </p>
        </div>
      </main>
    </AppShell>
  );
}

function NotificationRow({ entry, unread }: { entry: ActivityEntry; unread: boolean }) {
  const meta = TYPE_META[entry.type];
  const date = new Date(entry.timestamp);
  return (
    <Card padding="md" className={unread ? 'border-primary' : ''}>
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.text}`}>
          <meta.icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-text-900">{entry.text}</p>
          <p className="text-caption text-text-400">
            {formatAzDate(date)}, {formatAzTime(date)}
          </p>
        </div>
        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Oxunmamış" />}
      </div>
    </Card>
  );
}
