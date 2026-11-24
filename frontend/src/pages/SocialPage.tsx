import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Heart, MessageCircle, ChevronDown, Send, Plus, Check } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAppStore, useActiveChild, EMPTY_RECORD } from '../store/useAppStore';
import {
  fetchPosts,
  createPost,
  likePost,
  unlikePost,
  fetchComments,
  createComment,
  fetchLeaderboard,
  approvePost,
  MAX_CAPTION_LENGTH,
  type SocialPost,
  type SocialComment,
  type LeaderboardEntry,
} from '../lib/socialService';
import data from '../data/social.json';

type StatusFilter = 'all' | 'pending' | 'approved';
const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'Hamısı',
  pending: 'Gözləyən',
  approved: 'Təsdiqlənmiş',
};

// Same safe, pre-approved set AddChildPage's avatar picker already uses — no
// free-form image upload anywhere in this feature, matching the page's own
// "real fotolar GÖSTƏRİLMİR" safety rule.
const MEDIA_EMOJI_OPTIONS = ['📖', '🧩', '🏃', '🎨', '⚽', '🎵', '🧪', '🌱'];

export default function SocialPage() {
  const openMenu = useOpenMobileMenu();
  const parent = useAppStore((s) => s.parent);
  const child = useActiveChild();
  const likedPosts = child?.likedPosts ?? EMPTY_RECORD;
  const toggleLike = useAppStore((s) => s.toggleLike);
  const useBackend = !!(parent?.familyId && child?.childId);
  const allChildren = useAppStore((s) => s.children);
  // Only this family's own children's posts can actually be approved here —
  // the backend enforces this too (SocialChildOwnership), this just avoids
  // showing a "Təsdiqlə" action that would 403 on click for someone else's post.
  const ownChildIds = useMemo(
    () => new Set(allChildren.map((c) => c.childId).filter((id): id is string => !!id)),
    [allChildren],
  );

  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaEmoji, setMediaEmoji] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredPosts = useMemo(() => {
    if (!posts || statusFilter === 'all') return posts ?? [];
    return posts.filter((p) => p.approvalStatus === statusFilter);
  }, [posts, statusFilter]);

  // Real, computed entirely from the already-fetched posts array — no new
  // backend query needed for this.
  const stats = useMemo(() => {
    const rows = posts ?? [];
    return {
      approved: rows.filter((p) => p.approvalStatus === 'approved').length,
      pending: rows.filter((p) => p.approvalStatus === 'pending').length,
      totalLikes: rows.reduce((sum, p) => sum + p.likeCount, 0),
      totalComments: rows.reduce((sum, p) => sum + p.commentCount, 0),
    };
  }, [posts]);

  function load() {
    if (!parent?.familyId || !child?.childId) return;
    setLoadError(false);
    Promise.all([fetchPosts(child.childId, parent.token), fetchLeaderboard(parent.token)])
      .then(([postsResult, leaderboardResult]) => {
        setPosts(postsResult);
        setLeaderboard(leaderboardResult);
      })
      .catch((err) => {
        console.error('Sosial lenta yüklənmədi:', err);
        setLoadError(true);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (useBackend) load();
  }, [useBackend, parent?.familyId, child?.childId]);

  async function handleToggleLike(post: SocialPost) {
    if (!parent || !child?.childId) return;
    const wasLiked = post.likedByMe;
    setPosts((rows) =>
      rows?.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
          : p,
      ) ?? rows,
    );
    try {
      await (wasLiked ? unlikePost : likePost)(child.childId, post.id, parent.token);
    } catch (err) {
      // Roll back the optimistic flip on failure.
      setPosts((rows) =>
        rows?.map((p) =>
          p.id === post.id ? { ...p, likedByMe: wasLiked, likeCount: post.likeCount } : p,
        ) ?? rows,
      );
      toast.error(err instanceof Error ? err.message : 'Bəyənmə göndərilə bilmədi.');
    }
  }

  async function handleApprove(post: SocialPost) {
    if (!parent) return;
    const previous = post.approvalStatus;
    setPosts((rows) => rows?.map((p) => (p.id === post.id ? { ...p, approvalStatus: 'approved' } : p)) ?? rows);
    try {
      await approvePost(post.id, parent.token);
    } catch (err) {
      // Never claim it's approved if the call actually failed.
      setPosts((rows) => rows?.map((p) => (p.id === post.id ? { ...p, approvalStatus: previous } : p)) ?? rows);
      toast.error(err instanceof Error ? err.message : 'Təsdiqlənə bilmədi.');
    }
  }

  async function handleSubmitPost() {
    if (!parent || !child?.childId) return;
    const trimmed = caption.trim();
    if (!trimmed) {
      toast.error('Paylaşım üçün mətn yazın.');
      return;
    }
    setPosting(true);
    try {
      const created = await createPost(child.childId, trimmed, mediaEmoji, parent.token);
      setPosts((rows) => (rows ? [created, ...rows] : [created]));
      setCaption('');
      setMediaEmoji(null);
      setComposing(false);
      toast.success('Paylaşım dərc edildi!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Paylaşım göndərilə bilmədi.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <AppShell>
      <Topbar
        title={data.topbar.title}
        subtitle={data.topbar.subtitle}
        onMenuClick={openMenu}
        actions={<AvatarButton />}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            {useBackend && (
              <Card padding="lg">
                {!composing ? (
                  <Button variant="secondary" size="sm" onClick={() => setComposing(true)}>
                    <Plus size={15} /> Yeni Paylaşım
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
                      placeholder="Bu gün nə etdin? (real ad və ya yer yazma)"
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-border bg-surface px-4 py-3 text-body-sm text-text-900 outline-none focus:border-primary"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-text-400">{caption.length} / {MAX_CAPTION_LENGTH}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setMediaEmoji(null)}
                          className={`flex size-8 items-center justify-center rounded-lg border-2 text-sm ${mediaEmoji === null ? 'border-primary bg-surface-alt' : 'border-border-soft'}`}
                          aria-label="Şəkilsiz"
                        >
                          ∅
                        </button>
                        {MEDIA_EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => setMediaEmoji(emoji)}
                            className={`flex size-8 items-center justify-center rounded-lg border-2 text-base ${mediaEmoji === emoji ? 'border-primary bg-surface-alt' : 'border-border-soft'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" disabled={posting} onClick={handleSubmitPost}>
                        {posting ? 'Göndərilir...' : <><Send size={14} /> Paylaş</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>Ləğv et</Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {useBackend && posts === null && !loadError && (
              <p className="text-body-sm text-text-400">Yüklənir...</p>
            )}
            {useBackend && loadError && (
              <p className="text-body-sm text-error">Sosial lenta yüklənmədi — backend işə düşübmü?</p>
            )}

            {useBackend && posts !== null && (
              <div className="flex gap-2">
                {(Object.keys(STATUS_FILTER_LABEL) as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors ${
                      statusFilter === f ? 'border-primary bg-primary text-white' : 'border-border text-text-700 hover:bg-surface-alt'
                    }`}
                  >
                    {STATUS_FILTER_LABEL[f]}
                  </button>
                ))}
              </div>
            )}

            {useBackend
              ? filteredPosts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={i}
                    canApprove={ownChildIds.has(post.childId)}
                    onToggleLike={() => handleToggleLike(post)}
                    onApprove={() => handleApprove(post)}
                    onCommentAdded={() =>
                      setPosts((rows) =>
                        rows?.map((p) => (p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p)) ?? rows,
                      )
                    }
                    childId={child!.childId!}
                    token={parent!.token}
                  />
                ))
              : data.posts.map((post, i) => {
                  const liked = !!likedPosts[post.handle];
                  const likeCount = post.likes + (liked ? 1 : 0);
                  const mediaStyle = post.mediaFrom
                    ? { backgroundImage: `linear-gradient(135deg, ${post.mediaFrom}, ${post.mediaTo})` }
                    : { backgroundColor: post.mediaColor };
                  return (
                    <motion.div key={post.handle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card padding="lg">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-alt text-lg">{post.avatarEmoji}</span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-text-900">{post.handle}</p>
                              <p className="text-caption text-text-400">{post.timeAgo}</p>
                            </div>
                          </div>
                          <Badge tone="blue">✓ VALİDEYN TƏSDİQLƏDİ</Badge>
                        </div>

                        <div style={mediaStyle} className="flex aspect-[21/9] items-center justify-center rounded-xl text-5xl">
                          {post.mediaEmoji}
                        </div>

                        <p className="mt-3 text-body text-text-700">{post.caption}</p>

                        <div className="mt-3 flex items-center gap-4">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => toggleLike(post.handle)}
                            className={`flex items-center gap-1.5 text-body-sm font-bold transition-colors ${liked ? 'text-error' : 'text-text-500'}`}
                          >
                            <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {likeCount} Bəyənmə
                          </motion.button>
                          <span className="flex items-center gap-1.5 text-body-sm font-bold text-text-500">
                            <MessageCircle size={16} /> {post.comments} Şərh
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            {useBackend && posts !== null && (
              <Card padding="lg">
                <h3 className="font-display font-semibold text-text-900">Lenta Statistikası</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatTile label="Təsdiqlənmiş" value={stats.approved} />
                  <StatTile label="Gözləyən" value={stats.pending} />
                  <StatTile label="Ümumi Bəyənmə" value={stats.totalLikes} />
                  <StatTile label="Ümumi Şərh" value={stats.totalComments} />
                </div>
              </Card>
            )}

            <Card padding="lg">
              <h3 className="font-display font-semibold text-text-900">{data.leaderboard.title}</h3>
              <p className="mb-4 mt-1 text-caption text-text-400">{data.leaderboard.note}</p>
              <div className="flex flex-col gap-3">
                {(useBackend ? leaderboard ?? [] : null)?.map((row, i) => (
                  <div key={row.childId} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-500">
                      {i + 1}
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-base">
                      {row.avatarEmoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-sm font-bold text-text-900">{row.handle}</span>
                    <span className="shrink-0 text-body-sm font-bold text-sand-text">{row.totalXp} XP</span>
                  </div>
                ))}
                {!useBackend &&
                  data.leaderboard.rows.map((row) => (
                    <div key={row.rank} className="flex items-center gap-3">
                      <span
                        style={{ color: row.rankColor }}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold"
                      >
                        {row.rank}
                      </span>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-base">
                        {row.avatarEmoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm font-bold text-text-900">{row.name}</span>
                      <span className="shrink-0 text-body-sm font-bold text-sand-text">{row.xp}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function PostCard({
  post,
  index,
  canApprove,
  onToggleLike,
  onApprove,
  onCommentAdded,
  childId,
  token,
}: {
  post: SocialPost;
  index: number;
  canApprove: boolean;
  onToggleLike: () => void;
  onApprove: () => void;
  onCommentAdded: () => void;
  childId: string;
  token: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<SocialComment[] | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [approving, setApproving] = useState(false);

  async function handleApproveClick() {
    setApproving(true);
    try {
      await onApprove();
    } finally {
      setApproving(false);
    }
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && comments === null) {
      fetchComments(post.id, token)
        .then(setComments)
        .catch((err) => console.error('Şərhlər yüklənmədi:', err));
    }
  }

  async function submitComment() {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    setSubmittingComment(true);
    try {
      const created = await createComment(childId, post.id, trimmed, null, token);
      setComments((rows) => (rows ? [...rows, created] : [created]));
      setCommentDraft('');
      onCommentAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Şərh göndərilə bilmədi.');
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card padding="lg">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-alt text-lg">{post.avatarEmoji}</span>
            <div className="min-w-0">
              <p className="truncate font-bold text-text-900">{post.handle}</p>
            </div>
          </div>
          {post.approvalStatus === 'approved' ? (
            <Badge tone="green">✓ Təsdiqləndi</Badge>
          ) : canApprove ? (
            <Button size="sm" variant="secondary" disabled={approving} onClick={handleApproveClick}>
              <Check size={13} /> {approving ? 'Təsdiqlənir...' : 'Təsdiqlə'}
            </Button>
          ) : (
            <Badge tone="amber">Təsdiq Gözlənilir</Badge>
          )}
        </div>

        {post.mediaEmoji && (
          <div className="flex aspect-[21/9] items-center justify-center rounded-xl bg-surface-alt text-5xl">
            {post.mediaEmoji}
          </div>
        )}

        <p className="mt-3 text-body text-text-700">{post.caption}</p>

        <div className="mt-3 flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 text-body-sm font-bold transition-colors ${post.likedByMe ? 'text-error' : 'text-text-500'}`}
          >
            <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likeCount} Bəyənmə
          </motion.button>
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-1.5 text-body-sm font-bold text-text-500"
          >
            <MessageCircle size={16} /> {post.commentCount} Şərh
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border-soft pt-4">
            {comments === null && <p className="text-caption text-text-400">Yüklənir...</p>}
            {comments?.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sm">{c.avatarEmoji}</span>
                <div className="min-w-0">
                  <p className="text-caption font-bold text-text-900">{c.handle}</p>
                  <p className="text-body-sm text-text-700">{c.body}</p>
                </div>
              </div>
            ))}
            {comments?.length === 0 && <p className="text-caption text-text-400">Hələ şərh yoxdur.</p>}
            <div className="flex gap-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                placeholder="Şərh yaz..."
                className="h-10 flex-1 rounded-lg border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-primary"
              />
              <Button size="sm" variant="primary" disabled={submittingComment} onClick={submitComment}>
                <Send size={13} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-alt px-3 py-2.5">
      <p className="text-body-lg font-bold text-text-900">{value}</p>
      <p className="text-caption text-text-500">{label}</p>
    </div>
  );
}
