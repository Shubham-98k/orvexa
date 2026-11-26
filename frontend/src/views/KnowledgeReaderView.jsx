import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, ThumbsUp, Database, ExternalLink, Clock, Calendar, Check, ListTree, UserPlus, UserCheck, Trash2, Edit3 } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import PostDetailModal from '../components/discover/PostDetailModal';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function KnowledgeReaderView() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useOutletContext?.() || { showToast: () => {} };

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [moreFromAuthor, setMoreFromAuthor] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interaction states
  const [isSaved, setIsSaved] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [hasVotedHelpful, setHasVotedHelpful] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [provenanceOpen, setProvenanceOpen] = useState(false);

  // Edit & Source Post modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [activePost, setActivePost] = useState(null);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);

    Promise.all([
      apiGet(`/knowledge/${articleId}`),
      apiGet(`/knowledge/${articleId}/sources`).catch(() => ({ sources: [] })),
    ])
      .then(([res, srcRes]) => {
        if (res?.article) {
          setArticle(res.article);
          setIsSaved(res.article.isSaved);
          setHelpfulCount(res.article.helpfulCount || 0);
          setHasVotedHelpful(res.article.hasVotedHelpful);
          setIsFollowing(res.article.isFollowingAuthor);
          setRelatedArticles(res.relatedArticles || []);
          setMoreFromAuthor(res.moreFromAuthor || []);
        }
        if (srcRes?.sources) {
          setSources(srcRes.sources);
        }
      })
      .catch((err) => {
        alert(err.message || 'Article not found');
        navigate('/knowledge');
      })
      .finally(() => setLoading(false));
  }, [articleId, navigate]);

  const handleToggleHelpful = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/knowledge/${articleId}/helpful`, {});
      setHasVotedHelpful(res.helpful);
      setHelpfulCount(res.helpfulCount);
      showToast?.(res.helpful ? 'Marked as helpful' : 'Helpful feedback removed');
    } catch {
      // rollback
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/knowledge/${articleId}/save`, {});
      setIsSaved(res.saved);
      showToast?.(res.message || (res.saved ? 'Saved to library' : 'Removed from library'));
    } catch {
      // rollback
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!article?.authorId) return;
    try {
      const res = await apiPost(`/users/${article.authorId}/follow`, {});
      setIsFollowing(res.isFollowing);
      showToast?.(res.isFollowing ? `Now following ${article.authorName}` : `Unfollowed ${article.authorName}`);
    } catch {
      // rollback
    }
  };

  const isAuthor =
    Boolean(user) &&
    (
      (
        Boolean(article?.authorId) &&
        String(user._id || user.id) === String(article?.authorId?._id || article?.authorId)
      ) ||
      user.platformRole === 'admin' ||
      user.platformRole === 'moderator' ||
      user.role === 'admin' ||
      user.role === 'moderator'
    );

  const handleDeleteArticle = async () => {
    if (!window.confirm('Are you sure you want to delete this knowledge article?')) return;
    try {
      await apiDelete(`/knowledge/${articleId}`);
      showToast?.('Knowledge article deleted.');
      navigate('/knowledge');
    } catch (err) {
      alert(err.message || 'Failed to delete article');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast?.('Link copied to clipboard!');
  };

  const handleOpenOriginPost = async () => {
    if (!article?.originDetails?.id) return;
    try {
      const res = await apiGet(`/posts/${article.originDetails.id}`);
      if (res?.post) {
        setActivePost(res.post);
        return;
      }
    } catch {}
    try {
      const pub = await apiGet(`/public/posts/${article.originDetails.id}`);
      if (pub?.post) {
        setActivePost(pub.post);
      }
    } catch (err) {
      alert(err.message || 'Unable to open original post');
    }
  };

  const handleSaveEditArticle = async () => {
    if (!editTitle.trim()) return;
    try {
      setSavingEdit(true);
      const res = await apiPatch(`/knowledge/${articleId}`, {
        title: editTitle.trim(),
        summary: editSubtitle.trim(),
      });
      if (res?.article) {
        setArticle((prev) => ({ ...prev, ...res.article }));
        setIsEditing(false);
        showToast?.('Article updated');
      }
    } catch (err) {
      alert(err.message || 'Failed to update article');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[#8b92a1]">
        Loading article...
      </div>
    );
  }

  if (!article) return null;

  // Extract headings for Table of Contents
  const headings = (article.body || []).filter(
    (b) => b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3'
  );

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto pb-16">
      {/* Navigation header */}
      <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-3">
        <button
          type="button"
          onClick={() => navigate('/knowledge')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#737b8d] hover:text-[#17213f] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge</span>
        </button>

        <div className="flex items-center gap-2">
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditTitle(article.title || '');
                  setEditSubtitle(article.subtitle || article.summary || '');
                  setIsEditing((prev) => !prev);
                }}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Edit Article"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDeleteArticle}
                className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                title="Delete Article"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl border border-[#e9e9ed] text-[#737b8d] hover:bg-[#f7f7f8] cursor-pointer"
            title="Copy link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleSave}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              isSaved
                ? 'bg-[#eef1ff] border-[#d6e2ff] text-[#3f5ce8]'
                : 'bg-white border-[#e9e9ed] text-[#4a5265] hover:bg-[#f7f7f8]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#3f5ce8]' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Article Topline Editorial Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-[#eef1ff] text-[#3f5ce8] px-2.5 py-0.5 rounded text-[10.5px] font-extrabold uppercase tracking-wider">
            {article.format || 'Guide'}
          </span>
          <span className="bg-[#f0f1f4] text-[#555d70] px-2.5 py-0.5 rounded text-[10.5px] font-bold">
            {article.category || 'Thinking'}
          </span>
          <span className="text-xs text-[#8b92a1] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{article.readTime || `${article.readingTimeMinutes || 5} min read`}</span>
          </span>
        </div>

        {isEditing ? (
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Edit Article Details</div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Article title..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={editSubtitle}
              onChange={(e) => setEditSubtitle(e.target.value)}
              placeholder="Summary / Subtitle..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit || !editTitle.trim()}
                onClick={handleSaveEditArticle}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#3f5ce8] hover:bg-[#324ecc] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-4xl font-black text-[#17213f] leading-tight">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-sm sm:text-base text-[#616a7d] font-medium leading-relaxed">
                {article.subtitle}
              </p>
            )}
          </>
        )}

        {/* Author Bio Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#f0f0f2]">
          <div className="flex items-center gap-3">
            <Avatar
              initials={article.authorInitials || article.authorName?.slice(0, 2).toUpperCase() || 'OP'}
              color={article.authorColor || 'purple'}
              size="w-9 h-9 text-xs"
            />
            <div>
              <Link
                to={`/profile/${article.authorId}`}
                className="text-xs font-bold text-[#17213f] hover:underline"
              >
                {article.authorName}
              </Link>
              <div className="text-[10px] text-[#8b92a1] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Published on {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {user && user._id?.toString() !== article.authorId?.toString() && (
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isFollowing
                  ? 'bg-[#eaf6f0] border-[#bee3ce] text-[#2c7750]'
                  : 'bg-white border-[#e9e9ed] text-[#17213f] hover:bg-[#f7f7f8]'
              }`}
            >
              {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isFollowing ? 'Following' : 'Follow Author'}</span>
            </button>
          )}
        </div>

        {/* Cover Image if provided */}
        {article.coverImage && (
          <div className="rounded-3xl overflow-hidden max-h-96 w-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
      </header>

      {/* Provenance Card if derived from a Discussion or Post */}
      {article.originDetails && (
        <section className="bg-[#fff9f4] border border-[#fde5ce] p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#a0521e] flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#d97736]" />
              <span>
                Derived from community {article.originDetails.type === 'post' ? 'Post' : 'Discussion'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setProvenanceOpen((prev) => !prev)}
              className="text-[11px] font-bold text-[#a0521e] underline cursor-pointer"
            >
              {provenanceOpen ? 'Hide source details' : 'View provenance details'}
            </button>
          </div>

          <p className="text-xs text-[#7c390e] flex items-center gap-1.5 flex-wrap">
            <span>Originally catalyzed by <b>{article.originDetails.authorName}</b> in</span>
            {article.originDetails.type === 'discussion' ? (
              <Link
                to={`/discussions/${article.originDetails.id}`}
                className="font-bold underline hover:text-[#3f5ce8] inline-flex items-center gap-1"
                title="Open source discussion"
              >
                <span>"{article.originDetails.title}"</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleOpenOriginPost}
                className="font-bold underline hover:text-[#3f5ce8] inline-flex items-center gap-1 cursor-pointer"
                title="View original post"
              >
                <span>"{article.originDetails.title}"</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </p>

          {provenanceOpen && (
            <div className="pt-2 border-t border-[#fde5ce] space-y-2 text-xs text-[#553c39] animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span>Referenced Community Sources:</span>
                <span className="font-bold">
                  {sources.length} {sources.length === 1 ? 'citation' : 'citations'}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sources.map((src, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-[#f5d9c2] text-[11px]">
                    <div className="font-bold text-[#17213f]">{src.authorName || 'Contributor'}</div>
                    <div className="text-[#737b8d] italic line-clamp-2">"{src.quoteText || src.previewText}"</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Content Layout with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        {/* Article Body */}
        <main className="lg:col-span-8 space-y-5 bg-white border border-[#e9e9ed] rounded-3xl p-6 sm:p-9 shadow-xs">
          {/* Render Blocks */}
          {(article.body || []).length > 0 ? (
            article.body.map((b) => (
              <div key={b.id} className="space-y-1">
                {b.type === 'heading1' && (
                  <h2 className="text-xl sm:text-2xl font-black text-[#17213f] pt-3 pb-1 border-b border-[#f0f0f2]">
                    {b.content}
                  </h2>
                )}
                {b.type === 'heading2' && (
                  <h3 className="text-lg sm:text-xl font-bold text-[#17213f] pt-2">
                    {b.content}
                  </h3>
                )}
                {b.type === 'heading3' && (
                  <h4 className="text-base font-bold text-[#17213f] pt-1">
                    {b.content}
                  </h4>
                )}
                {b.type === 'paragraph' && (
                  <p className="text-xs sm:text-[14px] text-[#2c3345] leading-relaxed whitespace-pre-line">
                    {b.content}
                  </p>
                )}
                {b.type === 'quote' && (
                  <blockquote className="border-l-3 border-[#c65d59] pl-3.5 py-1.5 italic bg-[#fffaf9] rounded-r-xl text-xs sm:text-[13.5px] text-[#553c39]">
                    "{b.content}"
                    {b.data?.authorName && (
                      <span className="block text-[10.5px] font-bold not-italic text-[#c65d59] mt-1">
                        — {b.data.authorName}
                      </span>
                    )}
                  </blockquote>
                )}
                {b.type === 'callout' && (
                  <div className="p-3.5 rounded-xl bg-[#f0f4ff] border border-[#d6e2ff] text-xs sm:text-[13px] text-[#2a3f9d] font-medium leading-relaxed">
                    {b.content}
                  </div>
                )}
                {b.type === 'sourceCitation' && (
                  <div className="p-3 rounded-xl bg-[#fbfbfd] border border-[#e8eaef] text-xs text-[#38425b]">
                    <span className="text-[10px] font-bold uppercase text-[#737b8d] block mb-0.5">Citation</span>
                    {b.content}
                  </div>
                )}
                {b.type === 'code' && (
                  <pre className="p-3.5 rounded-xl bg-[#1c2333] text-[#eef2f9] font-mono text-xs overflow-x-auto">
                    {b.content}
                  </pre>
                )}
              </div>
            ))
          ) : (
            <div className="prose prose-sm max-w-none text-xs sm:text-[14px] leading-relaxed whitespace-pre-line text-[#2c3345]">
              {article.content || article.summary}
            </div>
          )}

          {/* Helpfulness feedback footer */}
          <div className="border-t border-[#f0f0f2] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#17213f] block">Was this resource useful?</span>
              <span className="text-[11px] text-[#737b8d]">{helpfulCount} readers found this helpful</span>
            </div>
            <button
              type="button"
              onClick={handleToggleHelpful}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto ${
                hasVotedHelpful
                  ? 'bg-[#eaf6f0] border-[#bee3ce] text-[#2c7750]'
                  : 'bg-white border-[#e9e9ed] text-[#17213f] hover:bg-[#f7f7f8]'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasVotedHelpful ? 'fill-[#2c7750]' : ''}`} />
              <span>{hasVotedHelpful ? 'Helpful ✓' : 'Yes, helpful'}</span>
            </button>
          </div>
        </main>

        {/* Sidebar: Table of Contents & Related */}
        <aside className="lg:col-span-4 space-y-6 sticky top-20">
          {/* Table of Contents */}
          {headings.length > 0 && (
            <div className="bg-white border border-[#e9e9ed] rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#17213f] flex items-center gap-1.5 uppercase tracking-wider">
                <ListTree className="w-3.5 h-3.5 text-[#3f5ce8]" />
                <span>Table of Contents</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[#555d70]">
                {headings.map((h, idx) => (
                  <li
                    key={idx}
                    className={`leading-snug hover:text-[#3f5ce8] cursor-pointer ${
                      h.type === 'heading1' ? 'font-bold text-[#17213f]' : h.type === 'heading2' ? 'pl-2 font-medium' : 'pl-4 text-[#737b8d]'
                    }`}
                  >
                    {h.content}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="bg-white border border-[#e9e9ed] rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#17213f] uppercase tracking-wider">
                Related Resources
              </h4>
              <div className="space-y-2.5">
                {relatedArticles.map((rel) => (
                  <Link
                    key={rel._id}
                    to={`/knowledge/${rel._id}`}
                    className="block p-2.5 rounded-xl hover:bg-[#f7f7f8] transition-colors border border-transparent hover:border-[#e9e9ed]"
                  >
                    <span className="text-[10px] font-bold text-[#3f5ce8] uppercase">{rel.format || 'Guide'}</span>
                    <h5 className="text-xs font-bold text-[#17213f] leading-snug line-clamp-1">{rel.title}</h5>
                    <p className="text-[11px] text-[#737b8d] line-clamp-1 mt-0.5">{rel.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Origin Post Modal */}
      {activePost && (
        <PostDetailModal
          post={activePost}
          onClose={() => setActivePost(null)}
          onOpenDiscussion={(disc) => {
            setActivePost(null);
            const discId = typeof disc === 'string' ? disc : disc?._id;
            if (discId) navigate(`/discussions/${discId}`);
          }}
        />
      )}
    </div>
  );
}
