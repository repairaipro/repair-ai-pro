'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  Heart, MessageCircle, Share2, Check, ArrowLeft, MapPin,
  BadgeCheck, Loader2, Send, Sparkles, Download, Copy, Megaphone, Film,
} from 'lucide-react';

type Author = { id: string; name: string; photoUrl: string | null; isContractor?: boolean };
type Reply = { id: string; text: string; createdAt: string | null; author: Author; mentions?: string[] };
type Comment = {
  id: string; text: string; createdAt: string | null; author: Author;
  replies?: Reply[]; replyCount?: number; mentions?: string[];
};
type Post = {
  id: string;
  caption: string;
  trade: string;
  photos: string[];
  video: string | null;
  poster: string | null;
  hasVideo: boolean;
  beforeAfter: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string | null;
  contractor: { id: string; name: string; photoUrl: string | null; city: string | null; trade: string | null };
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; authorId: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [allReplies, setAllReplies] = useState<Record<string, Reply[]>>({});

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/posts/${postId}`, { headers }),
        fetch(`/api/posts/${postId}/comments`),
      ]);
      if (pRes.status === 404) { setNotFound(true); return; }
      const pData = await pRes.json();
      if (pData.success) setPost(pData.post);
      const cData = await cRes.json();
      if (cData.success) setComments(cData.comments);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [postId, user]);

  useEffect(() => { load(); }, [load]);

  // Fire-and-forget view count — runs once per page load
  useEffect(() => {
    const id = (window.location.pathname.split('/').pop() ?? '');
    if (!id) return;
    fetch(`/api/posts/${id}/view`, { method: 'POST' }).catch(() => {});
  }, []);

  async function toggleLike() {
    if (!user) { window.location.href = '/auth/signin'; return; }
    if (!post || likeBusy) return;
    setLikeBusy(true);
    setPost((p) => p && ({ ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }));
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (res.ok) setPost((p) => p && ({ ...p, likedByMe: d.liked, likeCount: d.likeCount }));
    } catch { /* optimistic stands */ }
    finally { setLikeBusy(false); }
  }

  function share() {
    const url = window.location.href;
    const title = post ? `${post.contractor.name}'s ${post.trade} work on RepairAI Pro` : 'RepairAI Pro';
    if (navigator.share) { navigator.share({ title, url }).catch(() => {}); return; }
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function submitComment() {
    if (!user) { window.location.href = '/auth/signin'; return; }
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const token = await user.getIdToken();
      const body: Record<string, any> = { text: draft.trim() };
      if (replyingTo) {
        body.parentCommentId = replyingTo.commentId;
        body.mentionedUid    = replyingTo.authorId;
      }
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDraft('');
        setReplyingTo(null);
        await load();
      }
    } catch { /* ignore */ }
    finally { setPosting(false); }
  }

  async function loadMoreReplies(commentId: string) {
    if (loadingReplies === commentId) return;
    setLoadingReplies(commentId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments?parentId=${commentId}`);
      const data = await res.json();
      if (data.replies) {
        setAllReplies(prev => ({ ...prev, [commentId]: data.replies }));
        setExpandedReplies(prev => new Set([...prev, commentId]));
      }
    } catch { /* ignore */ }
    finally { setLoadingReplies(null); }
  }

  function startReply(commentId: string, authorName: string, authorId: string) {
    setReplyingTo({ commentId, authorName, authorId });
    setDraft(`@${authorName} `);
    // Scroll to composer
    setTimeout(() => document.getElementById('comment-input')?.focus(), 50);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center pt-20" style={{ background: 'var(--color-bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: 'var(--color-bg)' }}>
        <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Post not found</p>
        <Link href="/work" className="btn btn-primary btn-sm">Back to feed</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        <Link href="/work" className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-4)' }}>
          <ArrowLeft className="w-4 h-4" /> Work feed
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          {/* Author header */}
          <div className="flex items-center gap-3 p-4">
            <Link href={`/contractor/${post.contractor.id}`}>
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
              >
                {post.contractor.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.contractor.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : post.contractor.name[0]?.toUpperCase()}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/contractor/${post.contractor.id}`} className="text-sm font-semibold hover:underline" style={{ color: 'var(--color-text)' }}>
                {post.contractor.name}
              </Link>
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-4)' }}>
                <span>{post.trade}</span>
                {post.contractor.city && <><span>·</span><MapPin className="w-2.5 h-2.5" />{post.contractor.city}</>}
                <span>·</span><span>{timeAgo(post.createdAt)}</span>
              </p>
            </div>
            <button onClick={share} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-4)' }}>
              {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Media viewer — video or photo carousel */}
          <div className="relative" style={{ background: '#000' }}>
            {post.video ? (
              <video
                src={post.video}
                poster={post.poster ?? undefined}
                className="w-full max-h-[72vh] object-contain"
                controls autoPlay muted loop playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.photos[activePhoto]} alt={post.caption || 'Work'} className="w-full max-h-[70vh] object-contain" />
            )}
            {!post.video && post.beforeAfter && (
              <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                {activePhoto === 0 ? 'BEFORE' : activePhoto === 1 ? 'AFTER' : `${activePhoto + 1}`}
              </span>
            )}
            {!post.video && post.photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.4)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 px-4 pt-3">
            <button onClick={toggleLike} className="flex items-center gap-1.5 transition-transform active:scale-110" style={{ color: post.likedByMe ? '#f87171' : 'var(--color-text-3)' }}>
              <Heart className="w-5 h-5" fill={post.likedByMe ? '#f87171' : 'none'} />
              <span className="text-sm font-semibold">{post.likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-3)' }}>
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">{post.commentCount}</span>
            </div>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="px-4 pt-2 pb-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
              <Link href={`/contractor/${post.contractor.id}`} className="font-semibold" style={{ color: 'var(--color-text)' }}>{post.contractor.name}</Link>{' '}
              {post.caption}
            </p>
          )}
        </motion.div>

        {/* Owner: one-tap social export (the distribution engine) */}
        {user?.uid === post.contractor.id && (
          <SocialExport post={post} />
        )}

        {/* Hire CTA */}
        <Link
          href={`/jobs/new?contractor=${post.contractor.id}`}
          className="flex items-center justify-center gap-2 rounded-2xl p-3.5 text-sm font-semibold"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
        >
          <Sparkles className="w-4 h-4" /> Want work like this? Request a quote from {post.contractor.name.split(' ')[0]}
        </Link>

        {/* Comments */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
            {post.commentCount > 0 ? `${post.commentCount} comment${post.commentCount === 1 ? '' : 's'}` : 'Comments'}
          </h2>

          {/* Composer */}
          <div className="flex items-center gap-2">
            <input
              id="comment-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
              placeholder={replyingTo ? `Reply to @${replyingTo.authorName}…` : user ? 'Add a comment…' : 'Sign in to comment'}
              disabled={!user || posting}
              className="input text-sm flex-1"
            />
            <button onClick={submitComment} disabled={!draft.trim() || posting} className="btn btn-primary btn-sm" style={{ opacity: draft.trim() ? 1 : 0.5 }}>
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* List */}
          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-1" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <MessageCircle className="w-3 h-3" style={{ color: '#818cf8' }} />
              <span style={{ color: '#818cf8' }}>Replying to <strong>{replyingTo.authorName}</strong></span>
              <button onClick={() => { setReplyingTo(null); setDraft(''); }} className="ml-auto text-xs" style={{ color: 'var(--color-text-4)' }}>✕ Cancel</button>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-4)' }}>
              Be the first to comment.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => {
                const expanded = expandedReplies.has(c.id);
                const replies  = expanded ? (allReplies[c.id] ?? c.replies ?? []) : (c.replies ?? []);
                const hasMore  = (c.replyCount ?? 0) > 3 && !expanded;
                return (
                  <div key={c.id}>
                    {/* Top-level comment */}
                    <CommentBubble
                      comment={c}
                      size="md"
                      onReply={() => startReply(c.id, c.author.name, c.author.id)}
                      showReply={!!user}
                    />

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-10 mt-2 space-y-2">
                        {replies.map(r => (
                          <CommentBubble
                            key={r.id}
                            comment={r}
                            size="sm"
                            onReply={() => startReply(c.id, r.author.name, r.author.id)}
                            showReply={!!user}
                          />
                        ))}
                      </div>
                    )}

                    {/* Load more replies */}
                    {hasMore && (
                      <button
                        onClick={() => loadMoreReplies(c.id)}
                        disabled={loadingReplies === c.id}
                        className="ml-10 mt-1.5 flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {loadingReplies === c.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : '↩'}
                        {loadingReplies === c.id ? 'Loading…' : `View ${(c.replyCount ?? 0) - 3} more repl${(c.replyCount ?? 0) - 3 === 1 ? 'y' : 'ies'}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Comment bubble ── */
function CommentBubble({
  comment, size, onReply, showReply,
}: {
  comment: { id: string; text: string; createdAt: string | null; author: Author; mentions?: string[] };
  size: 'md' | 'sm';
  onReply: () => void;
  showReply: boolean;
}) {
  const avatarSize = size === 'md' ? 32 : 24;
  const fontSize   = size === 'md' ? 13 : 12;

  // Highlight @mentions in the text
  const renderText = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((p, i) =>
      p.startsWith('@')
        ? <span key={i} style={{ color: '#818cf8', fontWeight: 600 }}>{p}</span>
        : <span key={i}>{p}</span>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Link href={comment.author.isContractor ? `/contractor/${comment.author.id}` : '#'} style={{ flexShrink: 0 }}>
        <div style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%', overflow: 'hidden',
          background: 'var(--color-surface-2)', color: 'var(--color-text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size === 'md' ? 11 : 9, fontWeight: 700,
        }}>
          {comment.author.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={comment.author.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : comment.author.name[0]?.toUpperCase()}
        </div>
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ borderRadius: 16, padding: '8px 12px', background: 'var(--color-surface)', display: 'inline-block', maxWidth: '100%' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {comment.author.name}
            {comment.author.isContractor && <BadgeCheck style={{ width: 10, height: 10, color: '#22c55e' }} />}
          </span>
          <p style={{ fontSize, marginTop: 2, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            {renderText(comment.text)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, paddingLeft: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-4)' }}>{timeAgo(comment.createdAt)}</span>
          {showReply && (
            <button
              onClick={onReply}
              style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── One-tap social export — the syndication engine ── */
function SocialExport({ post }: { post: Post }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const link = `${origin}/work/${post.id}`;
  const tradeTag = '#' + (post.trade || 'homerepair').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cityTag = post.contractor.city ? ' #' + post.contractor.city.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const caption = `${post.caption || `${post.trade} work, done right.`}\n\n${post.beforeAfter ? 'Before & after 👇 ' : ''}Booked through RepairAI Pro — get a fair AI price + a verified local pro in minutes.\n${link}\n\n${tradeTag} #beforeandafter #homerepair${cityTag} #satisfying`;

  function copyCaption() {
    navigator.clipboard.writeText(caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
  }
  function shareTo(network: 'facebook' | 'twitter' | 'whatsapp') {
    const u = encodeURIComponent(link);
    const t = encodeURIComponent(caption);
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      twitter: `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(post.caption || post.trade + ' work')}`,
      whatsapp: `https://wa.me/?text=${t}`,
    };
    window.open(urls[network], '_blank', 'noopener,noreferrer,width=600,height=560');
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
      <div className="p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))' }}>
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4" style={{ color: '#818cf8' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Share this to grow your business</h3>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
          {post.video ? 'Post this clip to Reels, TikTok & your Facebook page.' : 'Post this to your Facebook page, Instagram & Nextdoor.'} The caption&apos;s written for you — booking link included.
        </p>
      </div>

      <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
        {/* Pre-written caption */}
        <div className="rounded-xl p-3 text-xs whitespace-pre-wrap leading-relaxed" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)', maxHeight: 120, overflow: 'auto' }}>
          {caption}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={copyCaption} className="btn btn-secondary btn-sm">
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy caption</>}
          </button>
          {post.video ? (
            <a href={post.video} download className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }}>
              <Download className="w-3.5 h-3.5" /> Download video
            </a>
          ) : post.photos[0] ? (
            <a href={post.photos[0]} download className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }}>
              <Download className="w-3.5 h-3.5" /> Download photo
            </a>
          ) : <span />}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => shareTo('facebook')} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#1877f2' }}><Share2 className="w-3 h-3" /> Facebook</button>
          <button onClick={() => shareTo('twitter')} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#0f172a' }}><Share2 className="w-3 h-3" /> X</button>
          <button onClick={() => shareTo('whatsapp')} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#25d366' }}><Share2 className="w-3 h-3" /> WhatsApp</button>
        </div>

        {post.video && (
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--color-text-4)' }}>
            <Film className="w-3 h-3" /> Tip: download the clip, then upload to TikTok/Reels with the copied caption for maximum local reach.
          </p>
        )}
      </div>
    </div>
  );
}
