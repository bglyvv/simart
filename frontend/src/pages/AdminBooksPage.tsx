import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { toast } from 'sonner';
import { Archive, GripVertical, ImagePlus, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import AdminShell, { useOpenMobileMenu } from '../components/AdminShell';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAdminStore } from '../store/useAdminStore';
import {
  bookImageUrl,
  createBook,
  deleteBook,
  fetchBooks,
  fetchDeletedBooks,
  reorderBooks,
  restoreBook,
  updateBook,
  uploadBookImage,
  type AuthorGender,
  type Book,
  type BookInput,
  type BookScene,
} from '../lib/bookService';
import { avatar } from './landing/bookJourney';
import { AUTHOR_LOOKS } from './landing/engineBooks';

const SCENES: { value: BookScene; label: string }[] = [
  { value: 'meadow', label: 'Çəmən' },
  { value: 'forest', label: 'Meşə' },
  { value: 'space', label: 'Kosmos' },
  { value: 'sea', label: 'Dəniz' },
  { value: 'sunny', label: 'Günəşli' },
];

const inputClass =
  'h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600';
const textareaClass =
  'w-full rounded-xl border-2 border-border bg-surface px-4 py-2.5 text-body-sm text-text-900 outline-none focus:border-purple-600';

function errorText(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  // The backend's validation messages are already in Azerbaijani; anything
  // else (network failure, English framework text) gets a generic message.
  return /[əğıöüçş]/i.test(message) ? message : 'Əməliyyat uğursuz oldu.';
}

function formatPrice(azn: number) {
  return `${azn.toFixed(2).replace('.', ',')} ₼`;
}

export default function AdminBooksPage() {
  const openMenu = useOpenMobileMenu();
  const admin = useAdminStore((s) => s.admin);
  const token = admin?.token ?? '';

  const [tab, setTab] = useState<'active' | 'deleted'>('active');
  const [books, setBooks] = useState<Book[] | null>(null);
  const [deleted, setDeleted] = useState<Book[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [formTarget, setFormTarget] = useState<Book | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The order last confirmed by the backend — a failed save snaps back to it.
  const savedOrder = useRef<string[]>([]);
  // Latest list for the drag-end handler, which fires after the last onReorder.
  const booksRef = useRef<Book[] | null>(null);
  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  async function saveOrder(current: Book[] | null) {
    if (!current) return;
    const ids = current.map((b) => b.id);
    if (ids.join() === savedOrder.current.join()) return;
    try {
      await reorderBooks(ids, token);
      savedOrder.current = ids;
      toast.success('Sıra yadda saxlanıldı.');
    } catch (err) {
      toast.error(errorText(err));
      setBooks((prev) => {
        if (!prev) return prev;
        const byId = new Map(prev.map((b) => [b.id, b]));
        return savedOrder.current.map((id) => byId.get(id)!).filter(Boolean);
      });
    }
  }

  /** Keyboard alternative to dragging: arrow keys on the handle. */
  function moveBook(id: string, delta: number) {
    if (!books) return;
    const from = books.findIndex((b) => b.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= books.length) return;
    const next = [...books];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setBooks(next);
    void saveOrder(next);
  }

  function loadBooks() {
    fetchBooks()
      .then((result) => {
        setBooks(result);
        savedOrder.current = result.map((b) => b.id);
        setLoadError(false);
      })
      .catch((err) => {
        console.error('Kitablar yüklənmədi:', err);
        setLoadError(true);
      });
  }

  function loadDeleted() {
    fetchDeletedBooks(token)
      .then(setDeleted)
      .catch((err) => {
        console.error('Silinmiş kitablar yüklənmədi:', err);
        setLoadError(true);
      });
  }

  useEffect(loadBooks, []);

  function selectTab(next: 'active' | 'deleted') {
    setTab(next);
    if (next === 'deleted' && deleted === null) loadDeleted();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteBook(deleteTarget.id, token);
      toast.success(`"${deleteTarget.title}" silindi.`);
      setBooks((prev) => prev?.filter((b) => b.id !== deleteTarget.id) ?? prev);
      setDeleted(null); // refetch next time the tab opens
      setDeleteTarget(null);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(book: Book) {
    setBusyId(book.id);
    try {
      await restoreBook(book.id, token);
      toast.success(`"${book.title}" bərpa edildi.`);
      setDeleted((prev) => prev?.filter((b) => b.id !== book.id) ?? prev);
      loadBooks();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  const list = tab === 'active' ? books : deleted;

  return (
    <AdminShell>
      <Topbar title="Kitablar" subtitle="Ana səhifədəki kitab qövsü" onMenuClick={openMenu} />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <Card padding="lg">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
                <TabButton active={tab === 'active'} onClick={() => selectTab('active')}>
                  Kitablar {books && <span className="text-text-400">({books.length})</span>}
                </TabButton>
                <TabButton active={tab === 'deleted'} onClick={() => selectTab('deleted')}>
                  <Archive size={14} /> Silinmiş
                </TabButton>
              </div>
              {tab === 'active' && (
                <Button size="sm" onClick={() => setFormTarget('new')}>
                  <Plus size={16} /> Yeni kitab
                </Button>
              )}
            </div>

            {loadError && <p className="text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}
            {!loadError && list === null && <p className="text-body-sm text-text-400">Yüklənir...</p>}
            {list?.length === 0 && (
              <p className="text-body-sm text-text-400">
                {tab === 'active' ? 'Hələ kitab yoxdur — ana səhifə standart kitabları göstərir.' : 'Silinmiş kitab yoxdur.'}
              </p>
            )}

            {tab === 'active' && books && books.length > 1 && (
              <p className="mb-2 text-caption text-text-400">Ana səhifədəki sıranı dəyişmək üçün kitabı tutub sürüşdürün.</p>
            )}

            {tab === 'active' && books ? (
              <Reorder.Group axis="y" values={books} onReorder={setBooks} className="flex flex-col gap-2">
                {books.map((b, i) => (
                  <SortableBookRow
                    key={b.id}
                    book={b}
                    position={i + 1}
                    total={books.length}
                    onDragEnd={() => void saveOrder(booksRef.current)}
                    onMove={(delta) => moveBook(b.id, delta)}
                    onEdit={() => setFormTarget(b)}
                    onDelete={() => setDeleteTarget(b)}
                  />
                ))}
              </Reorder.Group>
            ) : (
              <div className="flex flex-col gap-2">
                {tab === 'deleted' &&
                  deleted?.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                      <BookSummary book={b} />
                      <Button size="sm" variant="secondary" disabled={busyId === b.id} onClick={() => handleRestore(b)}>
                        <RotateCcw size={14} /> {busyId === b.id ? 'Bərpa olunur...' : 'Bərpa et'}
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {formTarget && (
        <BookFormModal
          book={formTarget === 'new' ? null : formTarget}
          token={token}
          onClose={() => setFormTarget(null)}
          onSaved={(saved, isNew) => {
            setFormTarget(null);
            toast.success(isNew ? `"${saved.title}" əlavə edildi.` : `"${saved.title}" yeniləndi.`);
            loadBooks();
          }}
        />
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Kitabı sil">
        {deleteTarget && (
          <div>
            <p className="text-body text-text-700">
              <b>{deleteTarget.title}</b> ana səhifədən götürüləcək. Onu sonra "Silinmiş" bölməsindən bərpa edə bilərsiniz.
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" full onClick={() => setDeleteTarget(null)}>Ləğv et</Button>
              <Button variant="danger" full onClick={handleDelete} disabled={busyId === deleteTarget.id}>
                {busyId === deleteTarget.id ? 'Silinir...' : 'Sil'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

function BookSummary({ book }: { book: Book }) {
  return (
    <>
      <img
        src={bookImageUrl(book.coverImageId)}
        alt=""
        draggable={false}
        className="h-16 w-12 shrink-0 rounded-md bg-surface-alt object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-text-900">{book.title}</p>
        <p className="truncate text-body-sm text-text-500">
          {book.authorName} · {formatPrice(book.priceAzn)}
        </p>
        {book.deletedAt && (
          <p className="text-caption text-text-400">Silinib: {new Date(book.deletedAt).toLocaleString('az-AZ')}</p>
        )}
      </div>
    </>
  );
}

/** One draggable row. Dragging starts only from the grip handle, so the row's
 * buttons and text stay normally clickable/selectable. */
function SortableBookRow({
  book,
  position,
  total,
  onDragEnd,
  onMove,
  onEdit,
  onDelete,
}: {
  book: Book;
  position: number;
  total: number;
  onDragEnd: () => void;
  onMove: (delta: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();

  function handleKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onMove(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(1);
    }
  }

  return (
    <Reorder.Item
      value={book}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 28px rgba(45, 29, 56, 0.18)' }}
      className="relative flex items-center gap-3 rounded-xl border border-border bg-surface px-2 py-2.5 sm:px-3"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={handleKey}
        aria-label={`${book.title} — sıranı dəyiş (${position}/${total}). Ox düymələri ilə yuxarı/aşağı.`}
        className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-text-400 hover:bg-surface-alt hover:text-text-700 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <BookSummary book={book} />
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="secondary" onClick={onEdit} aria-label={`${book.title} — redaktə et`}>
          <Pencil size={14} /> <span className="hidden sm:inline">Redaktə</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`${book.title} — sil`}>
          <Trash2 size={16} className="text-red-600" />
        </Button>
      </div>
    </Reorder.Item>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-body-sm font-bold transition-colors ${
        active ? 'bg-white text-purple-700 shadow-sm' : 'text-text-500 hover:text-text-900'
      }`}
    >
      {children}
    </button>
  );
}

function emptyInput(): BookInput {
  return {
    title: '',
    category: '',
    ageRange: '',
    pageCount: 0,
    priceAzn: 0,
    about: '',
    quote: '',
    isbn: '',
    backScene: 'meadow',
    authorName: '',
    authorBio: '',
    authorGender: 'female',
    coverImageId: null,
    backCoverImageId: null,
    authorPhotoImageId: null,
    storeLinks: [],
  };
}

function toInput(b: Book): BookInput {
  const { id: _id, deletedAt: _deletedAt, sortOrder: _sortOrder, ...rest } = b;
  return { ...rest, isbn: b.isbn ?? '', storeLinks: b.storeLinks.map((s) => ({ ...s })) };
}

function BookFormModal({
  book,
  token,
  onClose,
  onSaved,
}: {
  book: Book | null;
  token: string;
  onClose: () => void;
  onSaved: (saved: Book, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<BookInput>(() => (book ? toInput(book) : emptyInput()));
  const [price, setPrice] = useState(book ? String(book.priceAzn) : '');
  const [pages, setPages] = useState(book ? String(book.pageCount) : '');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(0);

  function set<K extends keyof BookInput>(key: K, value: BookInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setLink(i: number, key: 'name' | 'url', value: string) {
    setForm((f) => ({ ...f, storeLinks: f.storeLinks.map((l, j) => (j === i ? { ...l, [key]: value } : l)) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const priceAzn = Number(price.replace(',', '.'));
    const pageCount = Number(pages);
    if (!form.title.trim() || !form.authorName.trim()) return void toast.error('Kitabın və müəllifin adı tələb olunur.');
    if (!form.coverImageId) return void toast.error('Üz qabığı şəkli yükləyin.');
    if (!Number.isInteger(pageCount) || pageCount <= 0) return void toast.error('Səhifə sayı müsbət tam ədəd olmalıdır.');
    if (!Number.isFinite(priceAzn) || priceAzn < 0) return void toast.error('Qiyməti düzgün daxil edin.');

    const input: BookInput = { ...form, priceAzn, pageCount, isbn: form.isbn?.trim() || null };
    setSubmitting(true);
    try {
      const saved = book ? await updateBook(book.id, input, token) : await createBook(input, token);
      onSaved(saved, !book);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || uploading > 0;

  return (
    <Modal open onClose={onClose} title={book ? 'Kitabı redaktə et' : 'Yeni kitab'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Section title="Kitab">
          <Field label="Kitabın adı *" className="sm:col-span-2">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} maxLength={200} />
          </Field>
          <Field label="Kateqoriya">
            <input value={form.category} onChange={(e) => set('category', e.target.value)} className={inputClass} maxLength={60} />
          </Field>
          <Field label="Yaş aralığı">
            <input value={form.ageRange} onChange={(e) => set('ageRange', e.target.value)} placeholder="6 – 10" className={inputClass} maxLength={30} />
          </Field>
          <Field label="Səhifə sayı *">
            <input value={pages} onChange={(e) => setPages(e.target.value)} type="number" min={1} className={inputClass} />
          </Field>
          <Field label="Qiymət (₼) *">
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" className={inputClass} />
          </Field>
          <Field label="ISBN (barkod)">
            <input value={form.isbn ?? ''} onChange={(e) => set('isbn', e.target.value)} className={inputClass} maxLength={20} />
          </Field>
          <Field label="Kitab haqqında" className="sm:col-span-2">
            <textarea value={form.about} onChange={(e) => set('about', e.target.value)} rows={3} maxLength={2000} className={textareaClass} />
          </Field>
          <Field label="Arxa üzdəki sitat" className="sm:col-span-2">
            <input value={form.quote} onChange={(e) => set('quote', e.target.value)} className={inputClass} maxLength={300} />
          </Field>
        </Section>

        <Section title="Şəkillər">
          <ImageField
            label="Üz qabığı *"
            imageId={form.coverImageId}
            token={token}
            onUploading={(d) => setUploading((n) => n + d)}
            onChange={(id) => set('coverImageId', id)}
            required
          />
          <div className="flex flex-col gap-2">
            <ImageField
              label="Arxa üz qabığı"
              imageId={form.backCoverImageId}
              token={token}
              onUploading={(d) => setUploading((n) => n + d)}
              onChange={(id) => set('backCoverImageId', id)}
            />
            {!form.backCoverImageId && (
              <Field label="Şəkil yoxdursa, arxa üz mövzusu">
                <select value={form.backScene} onChange={(e) => set('backScene', e.target.value as BookScene)} className={inputClass}>
                  {SCENES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </Section>

        <Section title="Müəllif">
          <Field label="Müəllifin adı *">
            <input value={form.authorName} onChange={(e) => set('authorName', e.target.value)} placeholder="Ad Soyad" className={inputClass} maxLength={120} />
          </Field>
          <Field label="Cinsi">
            <select value={form.authorGender} onChange={(e) => set('authorGender', e.target.value as AuthorGender)} className={inputClass}>
              <option value="female">Qadın</option>
              <option value="male">Kişi</option>
            </select>
          </Field>
          <Field label="Qısa bioqrafiya" className="sm:col-span-2">
            <textarea value={form.authorBio} onChange={(e) => set('authorBio', e.target.value)} rows={3} maxLength={1000} className={textareaClass} />
          </Field>
          <ImageField
            label="Müəllifin şəkli"
            imageId={form.authorPhotoImageId}
            token={token}
            onUploading={(d) => setUploading((n) => n + d)}
            onChange={(id) => set('authorPhotoImageId', id)}
            square
            placeholder={
              <span
                className="block size-16 shrink-0 overflow-hidden rounded-full"
                // Static SVG built from fixed colours — no user input.
                dangerouslySetInnerHTML={{ __html: avatar(AUTHOR_LOOKS[form.authorGender]) }}
              />
            }
            emptyHint="Şəkil yüklənməsə, bu avatar göstərilir (müəllifin cinsinə görə)."
          />
        </Section>

        <Section title="Satış yerləri">
          <div className="flex flex-col gap-2 sm:col-span-2">
            {form.storeLinks.length === 0 && (
              <p className="text-caption text-text-400">Əlavə edilməsə, standart mağaza siyahısı göstərilir.</p>
            )}
            {form.storeLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={link.name}
                  onChange={(e) => setLink(i, 'name', e.target.value)}
                  placeholder="Mağaza adı"
                  aria-label="Mağaza adı"
                  className={`${inputClass} max-w-[40%]`}
                  maxLength={80}
                />
                <input
                  value={link.url}
                  onChange={(e) => setLink(i, 'url', e.target.value)}
                  placeholder="https://"
                  aria-label="Link"
                  type="url"
                  className={inputClass}
                  maxLength={500}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Satış yerini sil"
                  onClick={() => set('storeLinks', form.storeLinks.filter((_, j) => j !== i))}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            {form.storeLinks.length < 8 && (
              <div>
                <Button type="button" size="sm" variant="outline" onClick={() => set('storeLinks', [...form.storeLinks, { name: '', url: '' }])}>
                  <Plus size={14} /> Satış yeri əlavə et
                </Button>
              </div>
            )}
          </div>
        </Section>

        <div className="flex gap-2">
          <Button type="submit" variant="success" full disabled={busy}>
            {submitting ? 'Yadda saxlanılır...' : uploading > 0 ? 'Şəkil yüklənir...' : 'Yadda saxla'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Ləğv et</Button>
        </div>
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-body font-bold text-text-900">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-caption font-bold text-text-700">{label}</span>
      {children}
    </label>
  );
}

/** Picks a file and uploads it straight away; the form only keeps the id. */
function ImageField({
  label,
  imageId,
  token,
  onChange,
  onUploading,
  required,
  square,
  placeholder,
  emptyHint,
}: {
  label: string;
  imageId: string | null;
  token: string;
  onChange: (id: string | null) => void;
  onUploading: (delta: number) => void;
  required?: boolean;
  square?: boolean;
  placeholder?: ReactNode;
  /** Shown under the picker while no image is set. */
  emptyHint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return void toast.error('Şəkil 5 MB-dan böyük ola bilməz.');
    setBusy(true);
    onUploading(1);
    try {
      onChange(await uploadBookImage(file, token));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
      onUploading(-1);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-caption font-bold text-text-700">{label}</span>
      <div className="flex items-center gap-3">
        {imageId ? (
          <img
            src={bookImageUrl(imageId)}
            alt=""
            className={`shrink-0 rounded-lg bg-surface-alt object-cover ${square ? 'size-16 rounded-full' : 'h-24 w-[4.5rem]'}`}
          />
        ) : (
          !placeholder && (
            <div className={`flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-text-400 ${square ? 'size-16' : 'h-24 w-[4.5rem]'}`}>
              <ImagePlus size={20} />
            </div>
          )
        )}
        {!imageId && placeholder}
        <div className="flex flex-col gap-1.5">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Yüklənir...' : imageId ? 'Dəyiş' : 'Şəkil seç'}
          </Button>
          {imageId && !required && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              Sil
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {!imageId && emptyHint && <p className="mt-1 text-caption text-text-500">{emptyHint}</p>}
      <p className="mt-1 text-caption text-text-400">JPEG, PNG və ya WebP, ən çox 5 MB.</p>
    </div>
  );
}
