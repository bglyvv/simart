import { useNavigate } from 'react-router-dom';
import { Flame, Star, ChevronRight, UserPlus } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';

/** The real multi-member roster (UI_UX_SPEC.md Screen 05 — Family): every
 *  child the family has, each with a real wellbeing summary (XP + streak)
 *  and a link into their own profile. Replaces FamilyGatePage's old
 *  single-child assumption with the real children[] array. */
export default function FamilyPage() {
  const openMenu = useOpenMobileMenu();
  const navigate = useNavigate();
  const parent = useAppStore((s) => s.parent);
  const children = useAppStore((s) => s.children);

  return (
    <AppShell>
      <Topbar title="Ailə Üzvləri" subtitle="Ailənizin bütün profilləri" onMenuClick={openMenu} actions={<AvatarButton />} />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-3xl">
          {parent && (
            <Card padding="lg" className="mb-6 flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xl text-text-700">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-text-900">{parent.name}</p>
                <p className="text-body-sm text-text-500">Valideyn · {parent.email}</p>
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-4">
            {children.map((c) => (
              <button key={c.localId} onClick={() => navigate(`/uşaq-profili/${c.localId}`)} className="text-left">
                <Card interactive padding="lg" className="flex items-center gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl">
                    {c.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-text-900">{c.name}</p>
                    <p className="text-body-sm text-text-500">{c.age} yaş · {c.city}</p>
                    <div className="mt-2 flex items-center gap-4 text-body-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-text-700">
                        <Star size={14} /> {c.xp.toLocaleString('az-AZ')} XP
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-text-700">
                        <Flame size={14} /> {c.streakDays} gün
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-text-400" />
                </Card>
              </button>
            ))}

            {children.length === 0 && (
              <Card padding="lg">
                <p className="text-body-sm text-text-500">Hələ heç bir uşaq profili yoxdur.</p>
              </Card>
            )}
          </div>

          <button
            onClick={() => navigate('/usaq-elave-et')}
            className="mt-4 flex w-full items-center gap-4 rounded-md border border-dashed border-border bg-surface px-6 py-5 text-left transition-colors hover:bg-surface-alt"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-alt text-text-700">
              <UserPlus size={18} />
            </div>
            <p className="font-bold text-text-900">Yeni Ailə Üzvü Əlavə Et</p>
          </button>
        </div>
      </main>
    </AppShell>
  );
}
