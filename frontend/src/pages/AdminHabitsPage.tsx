import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import AdminShell, { useOpenMobileMenu } from '../components/AdminShell';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconTile from '../components/ui/IconTile';
import { Icon } from '../lib/icons';
import { useAdminStore } from '../store/useAdminStore';
import { fetchHabitCategories, createHabitCategory, addHabitTask, type HabitCategory } from '../lib/habitsService';

const ICON_OPTIONS = ['water', 'brain', 'handshake', 'check-circle', 'timer', 'star', 'trophy', 'puzzle'];

export default function AdminHabitsPage() {
  const openMenu = useOpenMobileMenu();

  const [categories, setCategories] = useState<HabitCategory[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  function loadCategories() {
    setLoadError(false);
    fetchHabitCategories()
      .then(setCategories)
      .catch((err) => {
        console.error('Kateqoriyalar yüklənmədi:', err);
        setLoadError(true);
      });
  }

  useEffect(loadCategories, []);

  return (
    <AdminShell>
      <Topbar title="Vərdişlər Kataloqu" subtitle="Kateqoriyalar və tapşırıqlar" onMenuClick={openMenu} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <NewCategoryCard onCreated={loadCategories} />

        {!categories && !loadError && <p className="mt-6 text-body-sm text-text-400">Yüklənir...</p>}
        {loadError && (
          <p className="mt-6 text-body-sm text-red-600">Kateqoriyalar yüklənmədi — backend işə düşübmü?</p>
        )}

        {categories && categories.length === 0 && (
          <p className="mt-6 text-body-sm text-text-400">
            Hələ heç bir kateqoriya yoxdur — yuxarıdan birini yaradın.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-5">
          {categories?.map((category) => (
            <CategoryCard key={category.id} category={category} onTaskAdded={loadCategories} />
          ))}
        </div>
      </main>
    </AdminShell>
  );
}

function NewCategoryCard({ onCreated }: { onCreated: () => void }) {
  const admin = useAdminStore((s) => s.admin);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!admin) return;
    if (!key.trim() || !title.trim()) {
      toast.error('Açar və başlıq tələb olunur.');
      return;
    }
    setSubmitting(true);
    try {
      await createHabitCategory({ key: key.trim(), title: title.trim(), icon }, admin.token);
      toast.success(`"${title.trim()}" kateqoriyası yaradıldı.`);
      setKey('');
      setTitle('');
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kateqoriya yaradıla bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
        <Plus size={15} /> Yeni Kateqoriya
      </Button>
    );
  }

  return (
    <Card padding="lg">
      <h3 className="mb-4 font-display font-semibold text-text-900">Yeni Kateqoriya</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block text-caption font-bold text-text-700">AÇAR</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="physical"
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1.5 block text-caption font-bold text-text-700">BAŞLIQ</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Fiziki Sağlamlıq"
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">İKONA</span>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="h-11 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} size="sm">
            {submitting ? 'Yaradılır...' : 'Yarat'}
          </Button>
          <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="sm">
            Ləğv et
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CategoryCard({ category, onTaskAdded }: { category: HabitCategory; onTaskAdded: () => void }) {
  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center gap-3">
        <IconTile icon={<Icon name={category.icon} size={18} />} tint="purple-100" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-text-900">{category.title}</p>
          <p className="text-caption text-text-400">{category.key} · {category.tasks.length} tapşırıq</p>
        </div>
      </div>

      {category.tasks.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {category.tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-text-900">{task.title}</p>
                {task.note && <p className="truncate text-caption text-text-400">{task.note}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-caption font-bold text-amber-text">
                +{task.xpValue} XP
              </span>
            </div>
          ))}
        </div>
      )}

      <AddTaskForm categoryId={category.id} onAdded={onTaskAdded} />
    </Card>
  );
}

function AddTaskForm({ categoryId, onAdded }: { categoryId: string; onAdded: () => void }) {
  const admin = useAdminStore((s) => s.admin);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [xpValue, setXpValue] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!admin) return;
    const xp = Number(xpValue);
    if (!title.trim()) {
      toast.error('Tapşırığın başlığı tələb olunur.');
      return;
    }
    if (!Number.isFinite(xp) || xp <= 0) {
      toast.error('XP müsbət rəqəm olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      await addHabitTask({ categoryId, title: title.trim(), note: note.trim() || undefined, xpValue: xp }, admin.token);
      toast.success(`"${title.trim()}" tapşırığı əlavə edildi.`);
      setTitle('');
      setNote('');
      setXpValue('3');
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tapşırıq əlavə edilə bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border-soft pt-4 sm:flex-row">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Yeni tapşırıq başlığı"
        className="h-10 flex-1 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Qeyd (opsional)"
        className="h-10 flex-1 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
      />
      <input
        value={xpValue}
        onChange={(e) => setXpValue(e.target.value)}
        type="number"
        min={1}
        placeholder="XP"
        className="h-10 w-20 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
      />
      <Button type="submit" disabled={submitting} size="sm" variant="success">
        <Plus size={14} /> Əlavə Et
      </Button>
    </form>
  );
}
