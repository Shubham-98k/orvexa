import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, ThumbsUp, Database, ExternalLink, Clock, Calendar, ListTree, UserPlus, UserCheck, Trash2, Edit3, Flag } from 'lucide-react';
import Avatar from '../components/common/Avatar';
import PostDetailModal from '../components/discover/PostDetailModal';
import ReportModal from '../components/common/ReportModal';
import { apiGet, apiPost, apiDelete } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const splitHeadingBlock = (content) => {
  const [title = '', ...followingLines] = String(content || '').split(/\r?\n/);
  return { title: title.trim(), followingText: followingLines.join('\n').trim() };
};

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
  const [savingEdit, setSavingEdit] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [reportingArticle, setReportingArticle] = useState(false);

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

  const isArticleOwner = Boolean(
    user &&
    article?.authorId &&
    String(user._id || user.id) === String(article.authorId?._id || article.authorId)
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

  const handleEditArticle = async () => {
    try {
      setSavingEdit(true);
      const response = await apiPost(`/knowledge/${articleId}/edit-draft`, {});
      if (response?.draft?._id) {
        navigate(`/knowledge/studio/${response.draft._id}`);
      } else {
        throw new Error('Unable to open the article in Knowledge Studio.');
      }
    } catch (error) {
      alert(error.message || 'Unable to open Knowledge Studio');
    } finally {
      setSavingEdit(false);
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

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[#8b92a1] dark:text-slate-400">
        Loading article...
      </div>
    );
  }

  if (!article) return null;

  // Extract headings for Table of Contents
  const headings = (article.body || []).filter(
    (b) => b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3'
  );
  const authorProfilePath = article.authorUsername
    ? `/profile/${encodeURIComponent(article.authorUsername)}`
    : null;
  const reportCircleId = article.circleId?._id
    || article.circleId
    || article.origin?.circleId?._id
    || article.origin?.circleId
    || article.originDetails?.circleId?._id
    || article.originDetails?.circleId
    || article.circleDetails?._id;

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto pb-16">
      {/* Navigation header */}
      <div className="flex items-center justify-between border-b border-[#f0f0f2] dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => navigate('/knowledge')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#737b8d] dark:text-slate-400 hover:text-[#17213f] dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge</span>
        </button>

        <div className="flex items-center gap-2">
          {isArticleOwner && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleEditArticle}
                disabled={savingEdit}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Edit article in Knowledge Studio"
                aria-label="Edit article in Knowledge Studio"
              >
                {savingEdit ? <span className="px-1 text-[10px]">...</span> : <Edit3 className="w-3.5 h-3.5" />}
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
            className="p-2 rounded-xl border border-[#e9e9ed] dark:border-slate-700 text-[#737b8d] dark:text-slate-400 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 cursor-pointer"
            title="Copy link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleSave}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              isSaved
                ? 'bg-[#eef1ff] dark:bg-indigo-950/50 border-[#d6e2ff] dark:border-indigo-800 text-[#3f5ce8] dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-[#e9e9ed] dark:border-slate-700 text-[#4a5265] dark:text-slate-300 hover:bg-[#f7f7f8] dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#3f5ce8]' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
          {user && article.authorId && !isArticleOwner && (
            <button
              type="button"
              onClick={() => setReportingArticle(true)}
              className="p-2 rounded-xl border border-red-200 text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
              title="Report Knowledge"
              aria-label="Report Knowledge"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Article Topline Editorial Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-[#eef1ff] dark:bg-indigo-950/50 text-[#3f5ce8] dark:text-indigo-300 px-2.5 py-0.5 rounded text-[10.5px] font-extrabold uppercase tracking-wider">
            {article.format || 'Guide'}
          </span>
          <span className="bg-[#f0f1f4] dark:bg-slate-800 text-[#555d70] dark:text-slate-300 px-2.5 py-0.5 rounded text-[10.5px] font-bold">
            {article.category || 'Thinking'}
          </span>
          <span className="text-xs text-[#8b92a1] dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{article.readTime || `${article.readingTimeMinutes || 5} min read`}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-[#17213f] dark:text-white leading-tight">
          {article.title}
        </h1>

        {article.subtitle && (
          <p className="text-sm sm:text-base text-[#616a7d] dark:text-slate-300 font-medium leading-relaxed">
            {article.subtitle}
          </p>
        )}

        {/* Author Bio Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#f0f0f2] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar
              initials={article.authorInitials || article.authorName?.slice(0, 2).toUpperCase() || 'OP'}
              color={article.authorColor || 'purple'}
              size="w-9 h-9 text-xs"
            />
            <div>
              {authorProfilePath ? (
                <Link to={authorProfilePath} className="text-xs font-bold text-[#17213f] dark:text-slate-100 hover:underline">
                  {article.authorName}
                </Link>
              ) : (
                <span className="text-xs font-bold text-[#17213f] dark:text-slate-100">{article.authorName}</span>
              )}
              <div className="text-[10px] text-[#8b92a1] dark:text-slate-400 flex items-center gap-1">
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
                  ? 'bg-[#eaf6f0] dark:bg-emerald-950/30 border-[#bee3ce] dark:border-emerald-900 text-[#2c7750] dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-900 border-[#e9e9ed] dark:border-slate-700 text-[#17213f] dark:text-slate-200 hover:bg-[#f7f7f8] dark:hover:bg-slate-800'
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

      {article.circleDetails && (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {article.origin?.circleId || article.originDetails?.circleId ? 'Source Circle' : 'Published in Circle'}
          </span>
          <Link
            to={`/circles/${encodeURIComponent(article.circleDetails.slug || article.circleDetails._id)}`}
            className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline dark:text-indigo-300"
          >
            {article.circleDetails.name}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </section>
      )}

      {/* Provenance Card if derived from a Discussion or Post */}
      {(article.originDetails || sources.length > 0) && (
        <section className="bg-[#fff9f4] dark:bg-amber-950/30 border border-[#fde5ce] dark:border-amber-900/60 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#a0521e] dark:text-amber-300 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#d97736]" />
              <span>
                {article.originDetails
                  ? `Derived from community ${article.originDetails.type === 'post' ? 'Post' : 'Discussion'}`
                  : 'Referenced community sources'}
              </span>
            </span>
            {sources.length > 0 && (
              <button
                type="button"
                onClick={() => setProvenanceOpen((prev) => !prev)}
                className="text-[11px] font-bold text-[#a0521e] dark:text-amber-300 underline cursor-pointer"
              >
                {provenanceOpen ? 'Hide source details' : 'View provenance details'}
              </button>
            )}
          </div>

          {article.originDetails && (
            <p className="text-xs text-[#7c390e] dark:text-amber-200 flex items-center gap-1.5 flex-wrap">
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
          )}

          {provenanceOpen && sources.length > 0 && (
            <div className="pt-2 border-t border-[#fde5ce] dark:border-amber-900/60 space-y-2 text-xs text-[#553c39] dark:text-amber-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span>Referenced Community Sources:</span>
                <span className="font-bold">
                  {sources.length} {sources.length === 1 ? 'citation' : 'citations'}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sources.map((src, idx) => (
                  <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-[#f5d9c2] dark:border-amber-900/60 text-[11px]">
                    <div className="font-bold text-[#17213f] dark:text-slate-100">{src.authorName || 'Contributor'}</div>
                    <div className="text-[#737b8d] dark:text-slate-400 italic line-clamp-2">"{src.quoteText || src.previewText}"</div>
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
        <main className="lg:col-span-8 space-y-5 bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-3xl p-6 sm:p-9 shadow-xs">
          {/* Render Blocks */}
          {(article.body || []).length > 0 ? (
            article.body.map((b) => {
              const { title, followingText } = splitHeadingBlock(b.content);
              return (
                <div key={b.id} className="space-y-1">
                  {b.type === 'heading1' && (
                    <>
                      <h2 className="text-xl sm:text-2xl font-black text-[#17213f] dark:text-white pt-3 pb-1 border-b border-[#f0f0f2] dark:border-slate-700">
                        {title}
                      </h2>
                      {followingText && (
                        <p className="text-xs sm:text-[14px] text-[#2c3345] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {followingText}
                        </p>
                      )}
                    </>
                  )}
                  {b.type === 'heading2' && (
                    <>
                      <h3 className="text-lg sm:text-xl font-bold text-[#17213f] dark:text-white pt-2">
                        {title}
                      </h3>
                      {followingText && (
                        <p className="text-xs sm:text-[14px] text-[#2c3345] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {followingText}
                        </p>
                      )}
                    </>
                  )}
                  {b.type === 'heading3' && (
                    <>
                      <h4 className="text-base font-bold text-[#17213f] dark:text-white pt-1">
                        {title}
                      </h4>
                      {followingText && (
                        <p className="text-xs sm:text-[14px] text-[#2c3345] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {followingText}
                        </p>
                      )}
                    </>
                  )}
                  {b.type === 'paragraph' && (
                    <p className="text-xs sm:text-[14px] text-[#2c3345] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {b.content}
                    </p>
                  )}
                  {b.type === 'quote' && (
                    <blockquote className="border-l-3 border-[#c65d59] pl-3.5 py-1.5 italic bg-[#fffaf9] dark:bg-rose-950/20 rounded-r-xl text-xs sm:text-[13.5px] text-[#553c39] dark:text-slate-300">
                      "{b.content}"
                      {b.data?.authorName && (
                        <span className="block text-[10.5px] font-bold not-italic text-[#c65d59] dark:text-rose-300 mt-1">
                          — {b.data.authorName}
                        </span>
                      )}
                    </blockquote>
                  )}
                  {b.type === 'callout' && (
                    <div className="p-3.5 rounded-xl bg-[#f0f4ff] dark:bg-indigo-950/30 border border-[#d6e2ff] dark:border-indigo-900 text-xs sm:text-[13px] text-[#2a3f9d] dark:text-indigo-200 font-medium leading-relaxed">
                      {b.content}
                    </div>
                  )}
                  {b.type === 'sourceCitation' && (
                    <div className="p-3 rounded-xl bg-[#fbfbfd] dark:bg-slate-800 border border-[#e8eaef] dark:border-slate-700 text-xs text-[#38425b] dark:text-slate-300">
                      <span className="text-[10px] font-bold uppercase text-[#737b8d] dark:text-slate-400 block mb-0.5">
                        Citation
                      </span>
                      {b.content}
                    </div>
                  )}
                  {b.type === 'code' && (
                    <pre className="p-3.5 rounded-xl bg-[#1c2333] text-[#eef2f9] font-mono text-xs overflow-x-auto">
                      {b.content}
                    </pre>
                  )}
                  {b.type === 'image' && b.content && (
                    <figure className="space-y-2 py-2">
                      <img src={b.content} alt={b.data?.caption || ''} className="max-h-[36rem] w-full rounded-2xl object-contain" />
                      {b.data?.caption && (
                        <figcaption className="text-center text-xs text-[#737b8d] dark:text-slate-400">
                          {b.data.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </div>
              );
            })
          ) : (
            <div className="prose prose-sm max-w-none text-xs sm:text-[14px] leading-relaxed whitespace-pre-line text-[#2c3345] dark:text-slate-300">
              {article.content || article.summary}
            </div>
          )}

          {/* Helpfulness feedback footer */}
          <div className="border-t border-[#f0f0f2] dark:border-slate-700 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#17213f] dark:text-white block">Was this resource useful?</span>
              <span className="text-[11px] text-[#737b8d] dark:text-slate-400">{helpfulCount} readers found this helpful</span>
            </div>
            <button
              type="button"
              onClick={handleToggleHelpful}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto ${
                hasVotedHelpful
                  ? 'bg-[#eaf6f0] dark:bg-emerald-950/30 border-[#bee3ce] dark:border-emerald-900 text-[#2c7750] dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-900 border-[#e9e9ed] dark:border-slate-700 text-[#17213f] dark:text-slate-200 hover:bg-[#f7f7f8] dark:hover:bg-slate-800'
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
            <div className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#17213f] dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                <ListTree className="w-3.5 h-3.5 text-[#3f5ce8]" />
                <span>Table of Contents</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[#555d70] dark:text-slate-300">
                {headings.map((h, idx) => (
                  <li
                    key={idx}
                    className={`leading-snug hover:text-[#3f5ce8] cursor-pointer ${
                      h.type === 'heading1' ? 'font-bold text-[#17213f] dark:text-white' : h.type === 'heading2' ? 'pl-2 font-medium' : 'pl-4 text-[#737b8d] dark:text-slate-400'
                    }`}
                  >
                    {splitHeadingBlock(h.content).title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#17213f] dark:text-white uppercase tracking-wider">
                Related Resources
              </h4>
              <div className="space-y-2.5">
                {relatedArticles.map((rel) => (
                  <Link
                    key={rel._id}
                    to={`/knowledge/${rel._id}`}
                    className="block p-2.5 rounded-xl hover:bg-[#f7f7f8] dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-[#e9e9ed] dark:hover:border-slate-700"
                  >
                    <span className="text-[10px] font-bold text-[#3f5ce8] uppercase">{rel.format || 'Guide'}</span>
                    <h5 className="text-xs font-bold text-[#17213f] dark:text-white leading-snug line-clamp-1">{rel.title}</h5>
                    <p className="text-[11px] text-[#737b8d] dark:text-slate-400 line-clamp-1 mt-0.5">{rel.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Origin Post Modal */}
      {reportingArticle && (
        <ReportModal
          targetType="knowledge"
          targetId={article._id}
          circleId={reportCircleId}
          onClose={() => setReportingArticle(false)}
        />
      )}
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
