import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  ThumbsUp,
  Bookmark,
  Share2,
  Bot,
  MessageSquare,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  Sparkles,
  Send,
  Edit3,
  Check,
} from 'lucide-react';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function DiscussionReaderView() {
  const { discussionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useOutletContext?.() || { showToast: () => {} };

  const [discussion, setDiscussion] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContributionBody, setNewContributionBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState({});

  // Edit Discussion state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isAuthor =
    Boolean(user) &&
    (
      (
        Boolean(discussion?.authorId) &&
        String(user._id || user.id) === String(discussion?.authorId?._id || discussion?.authorId)
      ) ||
      user.platformRole === 'admin' ||
      user.platformRole === 'moderator' ||
      user.role === 'admin' ||
      user.role === 'moderator'
    );

  const fetchDiscussionData = () => {
    if (!discussionId) return;
    setLoading(true);
    apiGet(`/discussions/${discussionId}`)
      .then((res) => {
        if (res?.discussion) {
          setDiscussion(res.discussion);
          setContributions(res.contributions || []);
        }
      })
      .catch((err) => {
        alert(err.message || 'Discussion not found');
        navigate('/discover');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiscussionData();
  }, [discussionId]);

  const handleUpvote = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/discussions/${discussionId}/upvote`, {});
      setDiscussion((prev) => ({
        ...prev,
        votes: res.votes,
        hasVoted: res.hasVoted,
        isUpvoted: res.hasVoted,
      }));
      showToast?.(res.hasVoted ? 'Upvoted discussion' : 'Upvote removed');
    } catch {}
  };

  const handleDeleteDiscussion = async () => {
    if (!window.confirm('Are you sure you want to delete this discussion?')) return;
    try {
      await apiDelete(`/discussions/${discussionId}`);
      showToast?.('Discussion deleted');
      navigate('/discover');
    } catch (err) {
      alert(err.message || 'Failed to delete discussion');
    }
  };

  const handleSaveEditDiscussion = async () => {
    if (!editTitle.trim() || !editBody.trim()) return;
    try {
      setSavingEdit(true);
      const res = await apiPatch(`/discussions/${discussionId}`, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      if (res?.discussion) {
        setDiscussion((prev) => ({ ...prev, ...res.discussion }));
        setIsEditing(false);
        showToast?.('Discussion updated');
      }
    } catch (err) {
      alert(err.message || 'Failed to update discussion');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateKnowledge = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await apiPost(`/discussions/${discussionId}/knowledge-drafts`, {});
      if (res?.draft?._id) {
        showToast?.('Knowledge studio opened from discussion');
        navigate(`/knowledge/studio/${res.draft._id}`);
      }
    } catch (err) {
      alert(err.message || 'Could not initialize knowledge draft');
    }
  };

  const handleSubmitContribution = async (bodyText, parentId = null) => {
    const body = bodyText.trim();
    if (!body) return;
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiPost(`/discussions/${discussionId}/contributions`, {
        body,
        parentContributionId: parentId,
      });

      if (res?.contribution) {
        setContributions((current) => [...current, res.contribution]);
        setDiscussion((prev) => ({
          ...prev,
          commentsCount: (prev?.commentsCount || 0) + 1,
          contributorsCount: res.contributorsCount || prev?.contributorsCount || 1,
        }));
        showToast?.('Contribution added!');
      }
      setNewContributionBody('');
      setReplyingTo(null);
    } catch (err) {
      alert(err.message || 'Failed to add contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCollapse = (id) => {
    setCollapsedThreads((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Reddit / YouTube style contribution thread component
  const ContributionThread = ({ contribution, depth = 0 }) => {
    const isCollapsed = Boolean(collapsedThreads[contribution._id]);
    const isReplyingThis = replyingTo?._id === contribution._id;
    const [subBody, setSubBody] = useState('');

    const children = contributions.filter((c) => {
      const pid = c.parentContributionId?._id || c.parentContributionId;
      return pid?.toString() === contribution._id.toString();
    });

    const isDiscussionAuthor =
      String(contribution.authorId?._id || contribution.authorId) ===
      String(discussion?.authorId?._id || discussion?.authorId);

    return (
      <div className={`text-left ${depth > 0 ? 'ml-2 sm:ml-5 pl-2 sm:pl-3.5 border-l-2 border-slate-200 hover:border-slate-300 dark:border-slate-700 transition-colors' : ''} pt-3`}>
        <div className="flex items-center gap-2">
          <Avatar
            initials={contribution.authorInitials || contribution.authorName?.slice(0, 2).toUpperCase() || 'CM'}
            color={contribution.authorColor || 'blue'}
            size="w-6 h-6 text-[9.5px]"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#17213f] dark:text-slate-200">
              {contribution.authorName || 'Orvexa Contributor'}
            </span>
            {isDiscussionAuthor && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#eef1ff] text-[#3f5ce8] dark:bg-blue-900/40 dark:text-blue-300">
                Author
              </span>
            )}
            {contribution.isMigratedFromPost && (
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Migrated
              </span>
            )}
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] text-slate-400">
              {new Date(contribution.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggleCollapse(contribution._id)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
            title={isCollapsed ? 'Expand comment thread' : 'Collapse comment thread'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="pl-8 pt-1.5 space-y-2">
            <p className="text-xs text-[#2b354f] dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {contribution.body}
            </p>

            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(isReplyingThis ? null : contribution);
                  setSubBody('');
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-[#3f5ce8] dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </div>

            {/* Inline reply box */}
            {isReplyingThis && (
              <div className="pt-2 pb-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!subBody.trim()) return;
                    handleSubmitContribution(subBody, contribution._id);
                    setSubBody('');
                  }}
                  className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Replying to <b className="text-slate-700 dark:text-slate-200">{contribution.authorName}</b>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={subBody}
                    onChange={(e) => setSubBody(e.target.value)}
                    placeholder="Add your perspective..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#3f5ce8]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !subBody.trim()}
                      className="px-3 py-1 bg-[#3f5ce8] hover:bg-[#324ecc] text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? '...' : 'Reply'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-contributions */}
            {children.length > 0 && (
              <div className="space-y-1 mt-1">
                {children.map((child) => (
                  <ContributionThread key={child._id} contribution={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[#8b92a1]">
        Loading Discussion...
      </div>
    );
  }

  if (!discussion) return null;

  const topLevelContributions = contributions.filter((c) => !c.parentContributionId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-16">
      {/* Navigation Topline */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f2] dark:border-slate-800">
        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#737b8d] dark:text-slate-400 hover:text-[#17213f] dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateKnowledge}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fff0ee] hover:bg-[#fedbd7] text-[#c65d59] dark:bg-red-950/40 dark:text-red-300 transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Create Knowledge from Discussion</span>
          </button>

          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditTitle(discussion.title || '');
                  setEditBody(discussion.body || '');
                  setIsEditing((prev) => !prev);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg transition-colors cursor-pointer"
                title="Edit Discussion"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDeleteDiscussion}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Delete Discussion"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Discussion Container */}
      <article className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
        {/* Origin post banner if converted */}
        {discussion.originPostId && (
          <div className="bg-[#f0f4ff] dark:bg-blue-950/30 border border-[#d6e2ff] dark:border-blue-800/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#3f5ce8] dark:text-blue-300 font-bold">
              <MessageSquare className="w-4 h-4" />
              <span>Graduated from a community post</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">All original replies preserved</span>
          </div>
        )}

        {isEditing ? (
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Edit Discussion</div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
            />
            <textarea
              rows={4}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white leading-relaxed resize-none"
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
                disabled={savingEdit || !editTitle.trim() || !editBody.trim()}
                onClick={handleSaveEditDiscussion}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#3f5ce8] hover:bg-[#324ecc] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Category & Status */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#eef1ff] text-[#3f5ce8] dark:bg-blue-950/50 dark:text-blue-300">
                {discussion.category || 'General'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {contributions.length} contributions
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#17213f] dark:text-white leading-tight">
              {discussion.title}
            </h1>
          </>
        )}

        {/* Author row */}
        <div className="flex items-center gap-3 pt-1">
          <Avatar
            initials={discussion.authorInitials || discussion.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={discussion.authorColor || 'purple'}
            size="w-9 h-9 text-xs"
          />
          <div>
            <div className="text-xs font-bold text-[#17213f] dark:text-white">
              {discussion.authorName || 'Orvexa Member'}
            </div>
            <div className="text-[10px] text-slate-400">
              Started on {new Date(discussion.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Discussion Image if present */}
        {discussion.imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-96 bg-slate-100 dark:bg-slate-800">
            <img
              src={discussion.imageUrl}
              alt={discussion.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Body prompt */}
        {discussion.body && (
          <div className="text-sm text-[#38425b] dark:text-slate-300 leading-relaxed whitespace-pre-line pt-2">
            {discussion.body}
          </div>
        )}

        {/* Action Bar */}
        <div className="border-t border-[#f0f0f2] dark:border-slate-800 pt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpvote}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              discussion.isUpvoted || discussion.hasVoted
                ? 'bg-[#eef1ff] text-[#3f5ce8] dark:bg-blue-950/50 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#eef1ff]'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Upvote · {discussion.votes || 0}</span>
          </button>
        </div>
      </article>

      {/* Contributions Section */}
      <section className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#f0f0f2] dark:border-slate-800 pb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#17213f] dark:text-white">
            Contributions ({contributions.length})
          </h2>
        </div>

        {/* Main Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitContribution(newContributionBody);
          }}
          className="space-y-3"
        >
          <textarea
            rows={3}
            value={newContributionBody}
            onChange={(e) => setNewContributionBody(e.target.value)}
            placeholder="Share your perspective, research, or experience..."
            className="w-full p-4 text-xs rounded-2xl border border-[#e9e9ed] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus:outline-none focus:border-[#3f5ce8]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newContributionBody.trim()}
              className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Posting...' : 'Post Contribution'}</span>
            </button>
          </div>
        </form>

        {/* Reddit / YouTube Nested Comments Threading */}
        {contributions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] dark:border-slate-800 rounded-2xl">
            No contributions yet. Be the first to join the conversation!
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
            {topLevelContributions.map((c) => (
              <ContributionThread key={c._id} contribution={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
