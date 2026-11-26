import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Info, Check, ChevronDown, Trash2, Plus, AlertTriangle, Archive, RotateCcw, ArrowRightLeft, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminShell, { useOpenMobileMenu } from '../components/AdminShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAdminStore } from '../store/useAdminStore';
import { formatAzDate } from '../lib/date';
import {
  fetchPlaylists,
  discoverNewContent,
  assignVideo,
  deleteVideo,
  createPlaylist,
  deletePlaylist,
  fetchDeletedPlaylists,
  fetchDeletedVideos,
  fetchPlaylistVideos,
  restoreVideo,
  restorePlaylist,
  moveVideo,
  verifyYoutubePlaylist,
  importYoutubePlaylist,
  youtubeThumbnailUrl,
  type Playlist,
  type DiscoveredVideo,
  type Audience,
  type DeletedPlaylist,
  type DeletedVideo,
  type PlaylistVideoStatus,
  type YoutubePlaylistPreview,
} from '../lib/contentService';
import data from '../data/adminAuth.json';

const { dashboard } = data;

const AUDIENCE_LABEL: Record<Audience, string> = {
  parent: 'Valideyn',
  child: 'Uşaq',
};
const AUDIENCE_BADGE: Record<Audience, string> = {
  parent: 'bg-blue-100 text-blue-700',
  child: 'bg-purple-100 text-purple-700',
};
const NO_PLAYLIST = '__none__';

type DeleteTarget =
  | { kind: 'video'; playlistId: string; youtubeId: string; title: string }
  | { kind: 'playlist'; youtubePlaylistId: string; title: string; videoCount: number };

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const openMenu = useOpenMobileMenu();
  const admin = useAdminStore((s) => s.admin);
  const logoutAdmin = useAdminStore((s) => s.logoutAdmin);

  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingVideos, setPendingVideos] = useState<DiscoveredVideo[] | null>(null);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [deletedPlaylists, setDeletedPlaylists] = useState<DeletedPlaylist[] | null>(null);
  const [deletedVideos, setDeletedVideos] = useState<DeletedVideo[] | null>(null);
  const [deletedLoadError, setDeletedLoadError] = useState(false);

  function loadPlaylists() {
    setLoadError(false);
    fetchPlaylists()
      .then(setPlaylists)
      .catch((err) => {
        console.error('Playlistlər yüklənmədi:', err);
        setLoadError(true);
      });
  }

  useEffect(loadPlaylists, []);

  function loadDeleted() {
    if (!admin) return;
    setDeletedLoadError(false);
    Promise.all([fetchDeletedPlaylists(admin.token), fetchDeletedVideos(admin.token)])
      .then(([pls, vids]) => {
        setDeletedPlaylists(pls);
        setDeletedVideos(vids);
      })
      .catch((err) => {
        console.error('Silinmiş məzmun yüklənmədi:', err);
        setDeletedLoadError(true);
      });
  }

  function handleSelectTab(tab: 'active' | 'deleted') {
    setActiveTab(tab);
    if (tab === 'deleted') loadDeleted();
  }

  async function handleSync() {
    if (!admin) return;
    setSyncing(true);
    try {
      const discovered = await discoverNewContent(admin.token);
      setPendingVideos(discovered);
      toast.success(
        discovered.length > 0
          ? `${discovered.length} yeni video tapıldı.`
          : 'Yeni video tapılmadı — kanal artıq tam sinxrondur.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'YouTube-dan məlumat alına bilmədi.');
    } finally {
      setSyncing(false);
    }
  }

  function handleAssigned(youtubeVideoId: string, playlistAssigned: boolean) {
    setPendingVideos((prev) => prev?.filter((v) => v.youtubeVideoId !== youtubeVideoId) ?? null);
    if (playlistAssigned) loadPlaylists();
  }

  function handleCreated() {
    setCreateOpen(false);
    loadPlaylists();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !admin) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'video') {
        await deleteVideo(deleteTarget.youtubeId, admin.token);
        toast.success(`"${deleteTarget.title}" silindi.`);
        setPlaylists((prev) =>
          prev?.map((p) =>
            p.id === deleteTarget.playlistId
              ? { ...p, videos: p.videos.filter((v) => v.youtubeId !== deleteTarget.youtubeId) }
              : p,
          ) ?? null,
        );
      } else {
        await deletePlaylist(deleteTarget.youtubePlaylistId, admin.token);
        toast.success(`"${deleteTarget.title}" silindi.`);
        setPlaylists((prev) => prev?.filter((p) => p.id !== deleteTarget.youtubePlaylistId) ?? null);
        setExpandedPlaylistId((cur) => (cur === deleteTarget.youtubePlaylistId ? null : cur));
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Silinmə uğursuz oldu.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestorePlaylist(playlistId: string, title: string) {
    if (!admin) return;
    try {
      await restorePlaylist(playlistId, admin.token);
      toast.success(`"${title}" bərpa edildi.`);
      // A playlist restore cascades onto whichever videos were deleted alongside
      // it too, not just the playlist row — refetch both deleted lists instead of
      // patching just one.
      loadDeleted();
      loadPlaylists();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bərpa uğursuz oldu.');
    }
  }

  async function handleRestoreVideo(youtubeId: string, title: string) {
    if (!admin) return;
    try {
      await restoreVideo(youtubeId, admin.token);
      toast.success(`"${title}" bərpa edildi.`);
      setDeletedVideos((prev) => prev?.filter((v) => v.youtubeId !== youtubeId) ?? null);
      loadPlaylists();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bərpa uğursuz oldu.');
    }
  }

  /** The restore-warning's "playlist-i də bərpa et" shortcut — restores the
   * video's (also-deleted) playlist first, then the video itself, in one click. */
  async function handleRestoreVideoWithPlaylist(video: DeletedVideo) {
    if (!admin || !video.playlistId) return;
    try {
      await restorePlaylist(video.playlistId, admin.token);
      await restoreVideo(video.youtubeId, admin.token);
      toast.success(`"${video.title}" və onun playlisti bərpa edildi.`);
      loadDeleted();
      loadPlaylists();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bərpa uğursuz oldu.');
    }
  }

  /** The restore-warning's "başqa playlistə köçür" option, and the "change
   * playlist" control on an active video row — same endpoint either way. */
  async function handleMoveVideo(youtubeId: string, newPlaylistId: string | null) {
    if (!admin) return;
    try {
      await moveVideo(youtubeId, newPlaylistId, admin.token);
      toast.success('Playlist dəyişdirildi.');
      loadPlaylists();
      if (activeTab === 'deleted') loadDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Playlist dəyişdirilə bilmədi.');
    }
  }

  function handleLogout() {
    logoutAdmin();
    navigate('/admin/login');
  }

  const totalVideos = playlists?.reduce((sum, p) => sum + p.videos.length, 0) ?? 0;
  const parentCount = playlists?.filter((p) => p.audience === 'parent').length ?? 0;
  const childCount = playlists?.filter((p) => p.audience === 'child').length ?? 0;

  return (
    <AdminShell>
      <Topbar
        title={dashboard.title}
        subtitle={admin ? `${dashboard.subtitle} · ${admin.email}` : dashboard.subtitle}
        onMenuClick={openMenu}
        actions={
          <>
            <Button onClick={handleSync} disabled={syncing} size="sm" variant="secondary">
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? dashboard.syncing : dashboard.syncCta}
            </Button>
            <button
              onClick={handleLogout}
              className="flex size-11 items-center justify-center rounded-full border border-border text-text-500 hover:bg-surface-alt"
              aria-label="Çıxış"
            >
              <LogOut size={17} />
            </button>
            <AvatarButton initials="AD" />
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Playlistlər" value={playlists?.length ?? '—'} />
          <StatCard label="Videolar" value={totalVideos || '—'} />
          <StatCard label="Valideyn üçün" value={parentCount || '—'} />
          <StatCard label="Uşaq üçün" value={childCount || '—'} />
        </div>

        {pendingVideos && pendingVideos.length > 0 && (
          <Card padding="lg" className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-text-900">
                Yeni Videolar <span className="text-text-400">({pendingVideos.length})</span>
              </h3>
            </div>
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-caption text-amber-text">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>Hər video üçün playlist (və ya "Heç biri") və auditoriya seçib təsdiqləyin.</span>
            </div>
            <div className="flex flex-col gap-3">
              {pendingVideos.map((video) => (
                <PendingVideoRow
                  key={video.youtubeVideoId}
                  video={video}
                  playlists={playlists ?? []}
                  token={admin?.token ?? ''}
                  onAssigned={handleAssigned}
                />
              ))}
            </div>
          </Card>
        )}

        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
              <TabButton active={activeTab === 'active'} onClick={() => handleSelectTab('active')}>
                Playlistlər
              </TabButton>
              <TabButton active={activeTab === 'deleted'} onClick={() => handleSelectTab('deleted')}>
                <Archive size={14} /> Silinmiş
              </TabButton>
            </div>
            {activeTab === 'active' && (
              <Button onClick={() => setCreateOpen(true)} size="sm" variant="secondary">
                <Plus size={15} /> Yeni Playlist
              </Button>
            )}
          </div>

          {activeTab === 'active' && (
            <>
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-caption text-amber-text">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>{dashboard.audienceNote}</span>
              </div>

              {!playlists && !loadError && <p className="text-body-sm text-text-400">Yüklənir...</p>}
              {loadError && (
                <p className="text-body-sm text-red-600">Playlistlər yüklənmədi — backend işə düşübmü?</p>
              )}

              {playlists && (
                <div className="flex flex-col gap-2">
                  {playlists.map((playlist) => (
                    <PlaylistRow
                      key={playlist.id}
                      playlist={playlist}
                      allPlaylists={playlists}
                      expanded={expandedPlaylistId === playlist.id}
                      onToggle={() => setExpandedPlaylistId((cur) => (cur === playlist.id ? null : playlist.id))}
                      onRequestDeleteVideo={(youtubeId, title) =>
                        setDeleteTarget({ kind: 'video', playlistId: playlist.id, youtubeId, title })
                      }
                      onRequestDeletePlaylist={() =>
                        setDeleteTarget({
                          kind: 'playlist',
                          youtubePlaylistId: playlist.id,
                          title: playlist.title,
                          videoCount: playlist.videos.length,
                        })
                      }
                      onMoveVideo={handleMoveVideo}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'deleted' && (
            <DeletedContentView
              playlists={deletedPlaylists}
              videos={deletedVideos}
              activePlaylists={playlists ?? []}
              loadError={deletedLoadError}
              token={admin?.token ?? ''}
              onRestorePlaylist={handleRestorePlaylist}
              onRestoreVideo={handleRestoreVideo}
              onRestoreVideoWithPlaylist={handleRestoreVideoWithPlaylist}
              onMoveVideo={handleMoveVideo}
            />
          )}
        </Card>
      </main>

      <CreatePlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        token={admin?.token ?? ''}
        onCreated={handleCreated}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Silinməni təsdiqləyin">
        {deleteTarget && (
          <div>
            <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              {deleteTarget.kind === 'video' ? (
                <span><b>{deleteTarget.title}</b> silinsin? Video ailə tətbiqindəki lentdən çıxarılacaq.</span>
              ) : (
                <span>
                  <b>{deleteTarget.title}</b> playlisti silinsin? Bu playlistdəki {deleteTarget.videoCount} video
                  da avtomatik silinəcək.
                </span>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" full onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Ləğv et
              </Button>
              <Button variant="danger" full onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Silinir...' : 'Sil'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

function PlaylistRow({
  playlist,
  allPlaylists,
  expanded,
  onToggle,
  onRequestDeleteVideo,
  onRequestDeletePlaylist,
  onMoveVideo,
}: {
  playlist: Playlist;
  allPlaylists: Playlist[];
  expanded: boolean;
  onToggle: () => void;
  onRequestDeleteVideo: (youtubeId: string, title: string) => void;
  onRequestDeletePlaylist: () => void;
  onMoveVideo: (youtubeId: string, newPlaylistId: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border-soft">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <div
            style={{ backgroundImage: `linear-gradient(135deg, ${playlist.colorFrom}, ${playlist.colorTo})` }}
            className="size-11 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-bold text-text-900">{playlist.title}</p>
            <p className="truncate text-caption text-text-400">
              {playlist.videos.length} video · {playlist.id}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-caption font-bold ${AUDIENCE_BADGE[playlist.audience]}`}>
            {AUDIENCE_LABEL[playlist.audience]}
          </span>
          <ChevronDown size={18} className={`shrink-0 text-text-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onRequestDeletePlaylist}
          aria-label="Playlisti sil"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-400 hover:bg-red-100 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border-soft p-3">
          {playlist.videos.length === 0 && (
            <p className="py-2 text-center text-body-sm text-text-400">Bu playlistdə video yoxdur.</p>
          )}
          {playlist.videos.map((video) => (
            <VideoRow
              key={video.youtubeId}
              video={video}
              currentPlaylistId={playlist.id}
              allPlaylists={allPlaylists}
              onRequestDelete={() => onRequestDeleteVideo(video.youtubeId, video.title)}
              onMove={onMoveVideo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoRow({
  video,
  currentPlaylistId,
  allPlaylists,
  onRequestDelete,
  onMove,
}: {
  video: Playlist['videos'][number];
  currentPlaylistId: string;
  allPlaylists: Playlist[];
  onRequestDelete: () => void;
  onMove: (youtubeId: string, newPlaylistId: string | null) => void;
}) {
  function handleChangePlaylist(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    onMove(video.youtubeId, value === NO_PLAYLIST ? null : value);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-alt px-3 py-2 sm:flex-row sm:items-center">
      <img
        src={youtubeThumbnailUrl(video.youtubeId)}
        alt=""
        className="h-12 w-20 shrink-0 rounded-lg object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-bold text-text-900">{video.title}</p>
        <p className="truncate text-caption text-text-400">{video.duration} · {video.youtubeId}</p>
      </div>
      <select
        value={currentPlaylistId}
        onChange={handleChangePlaylist}
        aria-label="Playlisti dəyiş"
        className="h-9 shrink-0 rounded-lg border-2 border-border bg-surface px-2 text-caption text-text-900 outline-none focus:border-purple-600"
      >
        <option value={NO_PLAYLIST}>Heç biri</option>
        {allPlaylists.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRequestDelete}
        aria-label="Videonu sil"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-400 hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

/** Accepts either a raw YouTube playlist id or a full playlist URL
 * (`?list=PL...`) and returns just the id — so the admin can paste either. */
function extractYoutubePlaylistId(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const listParam = url.searchParams.get('list');
    if (listParam) return listParam;
  } catch {
    // Not a URL at all — treat the whole thing as a raw id, which is the
    // common case when the admin copies just the id rather than the link.
  }
  return trimmed;
}

function CreatePlaylistModal({
  open,
  onClose,
  token,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: () => void;
}) {
  const [isYoutube, setIsYoutube] = useState(true);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [checking, setChecking] = useState(false);
  // undefined = not checked yet (or input changed since last check), null =
  // checked and not found, object = checked and found.
  const [checkResult, setCheckResult] = useState<YoutubePlaylistPreview | null | undefined>(undefined);
  const [checkedId, setCheckedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState<Audience>('child');
  const [description, setDescription] = useState('');
  const [colorFrom, setColorFrom] = useState('#4A90E8');
  const [colorTo, setColorTo] = useState('#2A5BA8');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setIsYoutube(true);
    setYoutubeInput('');
    setChecking(false);
    setCheckResult(undefined);
    setCheckedId(null);
    setTitle('');
    setAudience('child');
    setDescription('');
    setColorFrom('#4A90E8');
    setColorTo('#2A5BA8');
  }

  function handleYoutubeInputChange(value: string) {
    setYoutubeInput(value);
    setCheckResult(undefined);
    setCheckedId(null);
  }

  async function handleCheck() {
    const playlistId = extractYoutubePlaylistId(youtubeInput);
    if (!playlistId) {
      toast.error('Playlist linki və ya ID daxil edin.');
      return;
    }
    setChecking(true);
    try {
      const result = await verifyYoutubePlaylist(playlistId, token);
      setCheckResult(result);
      setCheckedId(playlistId);
      if (result) {
        if (!title.trim()) setTitle(result.title);
        toast.success(`Tapıldı: "${result.title}" (${result.videoCount} video)`);
      } else {
        toast.error('Playlist YouTube-da tapılmadı.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yoxlanıla bilmədi.');
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Başlıq tələb olunur.');
      return;
    }

    if (isYoutube) {
      if (!checkResult || checkedId !== extractYoutubePlaylistId(youtubeInput)) {
        toast.error('Əvvəlcə "Yoxla" düyməsi ilə playlisti təsdiqləyin.');
        return;
      }
      setSubmitting(true);
      try {
        const result = await importYoutubePlaylist(
          {
            youtubePlaylistId: checkedId,
            title: title.trim(),
            audience,
            description: description.trim() || undefined,
            colorFrom,
            colorTo,
          },
          token,
        );
        toast.success(
          `"${title.trim()}" playlisti yaradıldı — ${result.importedVideoCount} video idxal edildi` +
            (result.skippedExistingCount > 0 ? ` (${result.skippedExistingCount} video artıq mövcud idi, keçildi).` : '.'),
        );
        reset();
        onCreated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Playlist idxal edilə bilmədi.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      await createPlaylist(
        {
          title: title.trim(),
          audience,
          description: description.trim() || undefined,
          colorFrom,
          colorTo,
        },
        token,
      );
      toast.success(`"${title.trim()}" playlisti yaradıldı.`);
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Playlist yaradıla bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  const checkMatchesInput = checkedId !== null && checkedId === extractYoutubePlaylistId(youtubeInput);

  return (
    <Modal open={open} onClose={onClose} title="Yeni Playlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <span className="mb-1.5 block text-caption font-bold text-text-700">BU PLAYLIST YOUTUBE-DANDIR?</span>
          <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
            <button
              type="button"
              onClick={() => setIsYoutube(true)}
              className={`flex-1 rounded-lg px-3 py-2 text-body-sm font-bold transition-colors ${
                isYoutube ? 'bg-white text-purple-700 shadow-sm' : 'text-text-500 hover:text-text-900'
              }`}
            >
              Bəli
            </button>
            <button
              type="button"
              onClick={() => setIsYoutube(false)}
              className={`flex-1 rounded-lg px-3 py-2 text-body-sm font-bold transition-colors ${
                !isYoutube ? 'bg-white text-purple-700 shadow-sm' : 'text-text-500 hover:text-text-900'
              }`}
            >
              Xeyr
            </button>
          </div>
        </div>

        {isYoutube && (
          <div>
            <span className="mb-1.5 block text-caption font-bold text-text-700">YOUTUBE PLAYLIST LİNKİ VƏ YA ID</span>
            <div className="flex gap-2">
              <input
                value={youtubeInput}
                onChange={(e) => handleYoutubeInputChange(e.target.value)}
                placeholder="https://youtube.com/playlist?list=PL... və ya PLgBu2SwaPp7..."
                className="h-11 min-w-0 flex-1 rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
              />
              <Button type="button" onClick={handleCheck} disabled={checking} variant="secondary">
                {checking ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                Yoxla
              </Button>
            </div>
            {checkMatchesInput && checkResult && (
              <p className="mt-1.5 flex items-center gap-1.5 text-caption font-bold text-green-700">
                <Check size={14} /> "{checkResult.title}" tapıldı — {checkResult.videoCount} video
              </p>
            )}
            {checkMatchesInput && checkResult === null && (
              <p className="mt-1.5 flex items-center gap-1.5 text-caption font-bold text-red-600">
                <AlertTriangle size={14} /> Playlist tapılmadı.
              </p>
            )}
          </div>
        )}

        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">BAŞLIQ</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playlist adı"
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">AUDİTORİYA</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
          >
            <option value="child">Uşaq</option>
            <option value="parent">Valideyn</option>
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-caption font-bold text-text-700">TƏSVİR (OPSİONAL)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Qısa təsvir"
            className="h-11 w-full rounded-xl border-2 border-border bg-surface px-4 text-body-sm text-text-900 outline-none focus:border-purple-600"
          />
        </label>
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1.5 block text-caption font-bold text-text-700">RƏNG (BAŞLANĞIC)</span>
            <input
              type="color"
              value={colorFrom}
              onChange={(e) => setColorFrom(e.target.value)}
              className="h-11 w-full cursor-pointer rounded-xl border-2 border-border bg-surface px-2"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-caption font-bold text-text-700">RƏNG (SON)</span>
            <input
              type="color"
              value={colorTo}
              onChange={(e) => setColorTo(e.target.value)}
              className="h-11 w-full cursor-pointer rounded-xl border-2 border-border bg-surface px-2"
            />
          </label>
        </div>
        <Button
          type="submit"
          full
          size="lg"
          className="mt-2"
          disabled={submitting || (isYoutube && !checkMatchesInput)}
        >
          {submitting ? 'Yaradılır...' : <><Plus size={16} /> {isYoutube ? 'İdxal Et' : 'Playlisti Yarat'}</>}
        </Button>
      </form>
    </Modal>
  );
}

function PendingVideoRow({
  video,
  playlists,
  token,
  onAssigned,
}: {
  video: DiscoveredVideo;
  playlists: Playlist[];
  token: string;
  onAssigned: (youtubeVideoId: string, playlistAssigned: boolean) => void;
}) {
  const [playlistId, setPlaylistId] = useState(video.suggestedPlaylistId ?? NO_PLAYLIST);
  const [audience, setAudience] = useState<Audience>(video.suggestedAudience ?? 'child');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await assignVideo(
        {
          youtubeVideoId: video.youtubeVideoId,
          title: video.title,
          duration: video.duration,
          youtubePlaylistId: playlistId === NO_PLAYLIST ? null : playlistId,
          audience,
        },
        token,
      );
      toast.success(`"${video.title}" əlavə edildi.`);
      onAssigned(video.youtubeVideoId, playlistId !== NO_PLAYLIST);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Video əlavə edilə bilmədi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-soft p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-bold text-text-900">{video.title}</p>
        <p className="truncate text-caption text-text-400">{video.duration} · {video.youtubeVideoId}</p>
      </div>
      <select
        value={playlistId}
        onChange={(e) => setPlaylistId(e.target.value)}
        className="h-10 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
      >
        <option value={NO_PLAYLIST}>Heç biri</option>
        {playlists.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
      <select
        value={audience}
        onChange={(e) => setAudience(e.target.value as Audience)}
        className="h-10 rounded-xl border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
      >
        <option value="child">Uşaq</option>
        <option value="parent">Valideyn</option>
      </select>
      <Button onClick={handleConfirm} disabled={submitting} size="sm" variant="success">
        {submitting ? 'Yadda saxlanılır...' : <><Check size={14} /> Təsdiqlə</>}
      </Button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
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

function DeletedContentView({
  playlists,
  videos,
  activePlaylists,
  loadError,
  token,
  onRestorePlaylist,
  onRestoreVideo,
  onRestoreVideoWithPlaylist,
  onMoveVideo,
}: {
  playlists: DeletedPlaylist[] | null;
  videos: DeletedVideo[] | null;
  activePlaylists: Playlist[];
  loadError: boolean;
  token: string;
  onRestorePlaylist: (playlistId: string, title: string) => Promise<void>;
  onRestoreVideo: (youtubeId: string, title: string) => Promise<void>;
  onRestoreVideoWithPlaylist: (video: DeletedVideo) => Promise<void>;
  onMoveVideo: (youtubeId: string, newPlaylistId: string | null) => Promise<void>;
}) {
  if (loadError) {
    return <p className="text-body-sm text-red-600">Silinmiş məzmun yüklənmədi — backend işə düşübmü?</p>;
  }
  if (!playlists || !videos) {
    return <p className="text-body-sm text-text-400">Yüklənir...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="mb-3 text-body-sm font-bold text-text-700">
          Silinmiş Playlistlər <span className="text-text-400">({playlists.length})</span>
        </h4>
        {playlists.length === 0 && <p className="text-body-sm text-text-400">Silinmiş playlist yoxdur.</p>}
        <div className="flex flex-col gap-2">
          {playlists.map((p) => (
            <DeletedPlaylistRow key={p.id} playlist={p} token={token} onRestore={onRestorePlaylist} onRestoreVideo={onRestoreVideo} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-body-sm font-bold text-text-700">
          Silinmiş Videolar <span className="text-text-400">({videos.length})</span>
        </h4>
        {videos.length === 0 && <p className="text-body-sm text-text-400">Silinmiş video yoxdur.</p>}
        <div className="flex flex-col gap-2">
          {videos.map((v) => (
            <DeletedVideoRow
              key={v.youtubeId}
              video={v}
              activePlaylists={activePlaylists}
              onRestore={onRestoreVideo}
              onRestoreWithPlaylist={onRestoreVideoWithPlaylist}
              onMove={onMoveVideo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeletedPlaylistRow({
  playlist: p,
  token,
  onRestore,
  onRestoreVideo,
}: {
  playlist: DeletedPlaylist;
  token: string;
  onRestore: (playlistId: string, title: string) => Promise<void>;
  onRestoreVideo: (youtubeId: string, title: string) => Promise<void>;
}) {
  const [restoring, setRestoring] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [videos, setVideos] = useState<PlaylistVideoStatus[] | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && videos === null) {
      setLoadingVideos(true);
      try {
        setVideos(await fetchPlaylistVideos(p.id, token));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Videolar yüklənmədi.');
        setExpanded(false);
      } finally {
        setLoadingVideos(false);
      }
    }
  }

  async function handleClick() {
    setRestoring(true);
    try {
      await onRestore(p.id, p.title);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-soft bg-surface-alt opacity-80">
      <div className="flex items-center gap-4 p-3">
        <button type="button" onClick={handleToggle} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <div
            style={{ backgroundImage: `linear-gradient(135deg, ${p.colorFrom}, ${p.colorTo})` }}
            className="size-11 shrink-0 rounded-lg grayscale"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-bold text-text-900">{p.title}</p>
            <p className="truncate text-caption text-text-400">
              {p.videoCount} video · {p.youtubePlaylistId ?? 'manual'}
              {p.deletedAt && ` · ${formatAzDate(new Date(p.deletedAt))} silindi`}
            </p>
          </div>
          <ChevronDown size={16} className={`shrink-0 text-text-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <span className={`shrink-0 rounded-full px-3 py-1 text-caption font-bold ${AUDIENCE_BADGE[p.audience]}`}>
          {AUDIENCE_LABEL[p.audience]}
        </span>
        <Button onClick={handleClick} disabled={restoring} size="sm" variant="success">
          {restoring ? 'Bərpa olunur...' : <><RotateCcw size={14} /> Bərpa et</>}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border-soft p-3">
          {loadingVideos && <p className="py-2 text-center text-body-sm text-text-400">Yüklənir...</p>}
          {!loadingVideos && videos?.length === 0 && (
            <p className="py-2 text-center text-body-sm text-text-400">Bu playlistdə video yoxdur.</p>
          )}
          {!loadingVideos && videos?.map((v) => (
            <div key={v.youtubeId} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
              <img
                src={youtubeThumbnailUrl(v.youtubeId)}
                alt=""
                className={`h-10 w-16 shrink-0 rounded-lg object-cover ${v.isDeleted ? 'grayscale' : ''}`}
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-bold text-text-900">{v.title}</p>
                <p className="truncate text-caption text-text-400">{v.duration} · {v.youtubeId}</p>
              </div>
              {v.isDeleted ? (
                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-caption font-bold text-red-700">Silinib</span>
              ) : (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-caption font-bold text-green-700">Aktiv</span>
              )}
              {v.isDeleted && (
                <Button onClick={() => onRestoreVideo(v.youtubeId, v.title)} size="sm" variant="success">
                  <RotateCcw size={13} /> Bərpa et
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeletedVideoRow({
  video: v,
  activePlaylists,
  onRestore,
  onRestoreWithPlaylist,
  onMove,
}: {
  video: DeletedVideo;
  activePlaylists: Playlist[];
  onRestore: (youtubeId: string, title: string) => Promise<void>;
  onRestoreWithPlaylist: (video: DeletedVideo) => Promise<void>;
  onMove: (youtubeId: string, newPlaylistId: string | null) => Promise<void>;
}) {
  const [restoring, setRestoring] = useState(false);
  const [restoringBoth, setRestoringBoth] = useState(false);
  const [moveTarget, setMoveTarget] = useState(NO_PLAYLIST);
  const [moving, setMoving] = useState(false);

  async function handleClick() {
    setRestoring(true);
    try {
      await onRestore(v.youtubeId, v.title);
    } finally {
      setRestoring(false);
    }
  }

  async function handleRestoreBoth() {
    setRestoringBoth(true);
    try {
      await onRestoreWithPlaylist(v);
    } finally {
      setRestoringBoth(false);
    }
  }

  async function handleMove() {
    if (moveTarget === NO_PLAYLIST) {
      toast.error('Yeni playlist seçin.');
      return;
    }
    setMoving(true);
    try {
      await onMove(v.youtubeId, moveTarget);
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface-alt p-2 opacity-80">
      <div className="flex items-center gap-3">
        <img
          src={youtubeThumbnailUrl(v.youtubeId)}
          alt=""
          className="h-12 w-20 shrink-0 rounded-lg object-cover grayscale"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-bold text-text-900">{v.title}</p>
          <p className="truncate text-caption text-text-400">
            {v.duration} · {v.playlistTitle ?? 'Heç biri'}
            {v.deletedAt && ` · ${formatAzDate(new Date(v.deletedAt))} silindi`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-caption font-bold ${AUDIENCE_BADGE[v.audience]}`}>
          {AUDIENCE_LABEL[v.audience]}
        </span>
        <Button onClick={handleClick} disabled={restoring} size="sm" variant="success">
          {restoring ? 'Bərpa olunur...' : <><RotateCcw size={14} /> Bərpa et</>}
        </Button>
      </div>

      {v.isPlaylistDeleted && (
        <div className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-caption text-amber-text sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Bu videonun playlisti ("{v.playlistTitle}") də silinib — təkcə videonu bərpa etsəniz, playlist bərpa
              olunana qədər görünməyəcək.
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button onClick={handleRestoreBoth} disabled={restoringBoth} size="sm" variant="secondary">
              {restoringBoth ? 'Bərpa olunur...' : 'Playlisti də bərpa et'}
            </Button>
            <select
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
              className="h-9 rounded-lg border-2 border-border bg-surface px-2 text-caption text-text-900 outline-none focus:border-purple-600"
            >
              <option value={NO_PLAYLIST}>Başqa playlist seç...</option>
              {activePlaylists.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <Button onClick={handleMove} disabled={moving} size="sm" variant="secondary">
              {moving ? 'Köçürülür...' : <><ArrowRightLeft size={13} /> Köçür</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding="md">
      <p className="text-caption font-bold tracking-wide text-text-400">{label}</p>
      <p className="mt-1 text-h3 font-display font-semibold text-text-900">{value}</p>
    </Card>
  );
}
