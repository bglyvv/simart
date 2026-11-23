import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Heart, MessageCircle, ShieldCheck, ChevronDown, Send, Plus } from 'lucide-react';
import AppShell, { useOpenMobileMenu } from '../components/AppShell';
import Topbar, { AvatarButton } from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import {
  fetchPosts,
  createPost,
  likePost,
  unlikePost,
  fetchComments,
  createComment,
  fetchLeaderboard,
  MAX_CAPTION_LENGTH,
  type SocialPost,
  type SocialComment,
  type LeaderboardEntry,
} from '../lib/socialService';
import data from '../data/social.json';

// Same safe, pre-approved set AddChildPage's avatar picker already uses — no
// free-form image upload anywhere in this feature, matching the page's own
// "real fotolar GÖSTƏRİLMİR" safety rule.
const MEDIA_EMOJI_OPTIONS = ['📖', '🧩', '🏃', '🎨', '⚽', '🎵', '🧪', '🌱'];

export default function SocialPage() {
  const openMenu = useOpenMobileMenu();
  const parent = useAppStore((s) => s.parent);
  const child = useAppStore((s) => s.child);
  const likedPosts = useAppStore((s) => s.likedPosts);
  const toggleLike = useAppStore((s) => s.toggleLike);
  const useBackend = !!(parent?.familyId && child?.childId);

  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaEmoji, setMediaEmoji] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

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
        actions={
          <>
            <Badge tone="green"><ShieldCheck size={12} className="inline" /> AI FILTER AKTİV</Badge>
            <AvatarButton />
          </>
        }
      />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
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
                      className="w-full resize-none rounded-xl border-2 border-border bg-surface px-4 py-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-text-400">{caption.length} / {MAX_CAPTION_LENGTH}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setMediaEmoji(null)}
                          className={`flex size-8 items-center justify-center rounded-lg border-2 text-sm ${mediaEmoji === null ? 'border-purple-600 bg-purple-50' : 'border-border-soft'}`}
                          aria-label="Şəkilsiz"
                        >
                          ∅
                        </button>
                        {MEDIA_EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => setMediaEmoji(emoji)}
                            className={`flex size-8 items-center justify-center rounded-lg border-2 text-base ${mediaEmoji === emoji ? 'border-purple-600 bg-purple-50' : 'border-border-soft'}`}
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
              <p className="text-body-sm text-red-600">Sosial lenta yüklənmədi — backend işə düşübmü?</p>
            )}

            {useBackend
              ? (posts ?? []).map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={i}
                    onToggleLike={() => handleToggleLike(post)}
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
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-full bg-purple-100 text-lg">{post.avatarEmoji}</span>
                            <div>
                              <p className="font-bold text-text-900">{post.handle}</p>
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
                            className={`flex items-center gap-1.5 text-body-sm font-bold transition-colors ${liked ? 'text-coral-600' : 'text-text-500'}`}
                          >
                            <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {likeCount} Bəyənmə
                          </motion.button>
                          <span className="flex items-center gap-1.5 text-body-sm font-bold text-text-500">
                            <MessageCircle size={16} /> {post.comments} Şərh
                          </span>
                          <Badge tone="green" className="ml-auto">AI FILTER: TƏSDİQLƏNDİ</Badge>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>

          <div className="flex flex-col gap-6">
            <Card padding="lg">
              <h3 className="font-display font-semibold text-text-900">{data.leaderboard.title}</h3>
              <p className="mb-4 mt-1 text-caption text-text-400">{data.leaderboard.note}</p>
              <div className="flex flex-col gap-3">
                {(useBackend ? leaderboard ?? [] : null)?.map((row, i) => (
                  <div key={row.childId} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-500">
                      {i + 1}
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-base">
                      {row.avatarEmoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-sm font-bold text-text-900">{row.handle}</span>
                    <span className="shrink-0 text-body-sm font-bold text-purple-600">{row.totalXp} XP</span>
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
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-base">
                        {row.avatarEmoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm font-bold text-text-900">{row.name}</span>
                      <span className="shrink-0 text-body-sm font-bold text-purple-600">{row.xp}</span>
                    </div>
                  ))}
              </div>
            </Card>

            <Card padding="lg" className="border-green-100 bg-green-50">
              <h3 className="font-display font-semibold text-text-900">{data.safetyRules.title}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {data.safetyRules.rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-body-sm text-green-700">
                    <span>✓</span> {rule}
                  </li>
                ))}
              </ul>
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
  onToggleLike,
  onCommentAdded,
  childId,
  token,
}: {
  post: SocialPost;
  index: number;
  onToggleLike: () => void;
  onCommentAdded: () => void;
  childId: string;
  token: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<SocialComment[] | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-purple-100 text-lg">{post.avatarEmoji}</span>
            <div>
              <p className="font-bold text-text-900">{post.handle}</p>
            </div>
          </div>
          <Badge tone="blue">✓ VALİDEYN TƏSDİQLƏDİ</Badge>
        </div>

        {post.mediaEmoji && (
          <div className="flex aspect-[21/9] items-center justify-center rounded-xl bg-purple-50 text-5xl">
            {post.mediaEmoji}
          </div>
        )}

        <p className="mt-3 text-body text-text-700">{post.caption}</p>

        <div className="mt-3 flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onToggleLike}
            className={`flex items-center gap-1.5 text-body-sm font-bold transition-colors ${post.likedByMe ? 'text-coral-600' : 'text-text-500'}`}
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
          <Badge tone="green" className="ml-auto">AI FILTER: TƏSDİQLƏNDİ</Badge>
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
                className="h-10 flex-1 rounded-lg border-2 border-border bg-surface px-3 text-body-sm text-text-900 outline-none focus:border-purple-600"
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
