import React, { useEffect, useState, useRef } from 'react';
import {
  Heart,
  Bookmark,
  Send,
  X,
  MessageSquare,
  Bot,
  ArrowRight,
  Trash2,
  Edit3,
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export default function PostDetailModal({
  post,
  onClose,
  onPostUpdated,
  focusReply = false,
  onOpenDiscussion,
  onOpenCreateKnowledge,
}) {
  const { user } = useAuth();
  const [postData, setPostData] = useState(post);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [collapsedThreads, setCollapsedThreads] = useState({});

  // Conversion confirmation state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTitle, setConvertTitle] = useState('');
  const [converting, setConverting] = useState(false);
  const [conversionError, setConversionError] = useState('');

  // Edit post state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post?.title || '');
  const [editBody, setEditBody] = useState(post?.body || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const onPostUpdatedRef = useRef(onPostUpdated);
  useEffect(() => {
    onPostUpdatedRef.current = onPostUpdated;
  }, [onPostUpdated]);

  const isOwner =
    Boolean(user) &&
    Boolean(postData?.authorId) &&
    String(user._id || user.id) === String(postData?.authorId?._id || postData?.authorId);

  const focusReplyInput = () => {
    requestAnimationFrame(() => {
      document.getElementById('post-reply-input')?.focus();
    });
  };

  useEffect(() => {
    if (focusReply && !postData?.convertedToDiscussionId) {
      setReplyingTo(null);
      focusReplyInput();
    }
  }, [focusReply, post?._id, postData?.convertedToDiscussionId]);

  useEffect(() => {
    if (!post?._id) return;
    let active = true;
    setLoading(true);
    apiGet(`/posts/${post._id}`)
      .then((res) => {
        if (!active) return;
        if (res?.post) {
          setPostData(res.post);
          onPostUpdatedRef.current?.(res.post);
        }
        setReplies(res?.replies || []);
      })
      .catch((err) => {
        console.warn('Failed to fetch full post replies:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [post?._id]);

  const handleLike = async () => {
    try {
      const res = await apiPost(`/posts/${postData._id}/like`, {});
      const updated = {
        ...postData,
        likeCount: res.likeCount,
        hasLiked: Boolean(res.hasLiked || res.isLiked),
        isLiked: Boolean(res.hasLiked || res.isLiked),
      };
      setPostData(updated);
      onPostUpdatedRef.current?.(updated);
    } catch {}
  };

  const handleSave = async () => {
    try {
      const res = await apiPost(`/posts/${postData._id}/save`, {});
      const updated = { ...postData, saved: res.saved, isSaved: res.saved };
      setPostData(updated);
      onPostUpdatedRef.current?.(updated);
    } catch {}
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await apiDelete(`/posts/${postData._id}`);
      onPostUpdatedRef.current?.({ ...postData, status: 'deleted' });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const handleReplySubmit = async (bodyText, parentId = null) => {
    const body = bodyText.trim();
    if (!body) return;

    try {
      setSubmitting(true);
      const res = await apiPost(`/posts/${postData._id}/replies`, {
        body,
        parentReplyId: parentId,
      });
      if (res?.reply) {
        setReplies((current) => [...current, res.reply]);
      }
      setReplyBody('');
      setReplyingTo(null);
      const updated = {
        ...postData,
        commentCount: res?.replyCount || replies.length + 1,
        commentsCount: res?.replyCount || replies.length + 1,
      };
      setPostData(updated);
      onPostUpdatedRef.current?.(updated);
    } catch (err) {
      alert(err.message || 'Unable to add reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (e) => {
    e?.preventDefault();
    try {
      setConverting(true);
      setConversionError('');
      const res = await apiPost(`/posts/${postData._id}/convert-to-discussion`, {
        title: convertTitle.trim() || postData.title || 'Discussion',
      });

      if (res?.discussion) {
        const updated = {
          ...postData,
          convertedToDiscussionId: res.discussion._id,
          convertedAt: new Date(),
        };
        setPostData(updated);
        onPostUpdatedRef.current?.(updated);
        setShowConvertModal(false);

        if (onOpenDiscussion) {
          onClose();
          const targetId = res.discussion?._id || res.discussion;
          onOpenDiscussion(targetId);
        }
      }
    } catch (err) {
      setConversionError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editBody.trim()) return;
    try {
      setSavingEdit(true);
      const res = await apiPatch(`/posts/${postData._id}`, {
        title: editTitle.trim(),
        body: editBody.trim(),
      });
      if (res?.post) {
        setPostData(res.post);
        onPostUpdatedRef.current?.(res.post);
        setIsEditing(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to update post.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleCollapse = (replyId) => {
    setCollapsedThreads((prev) => ({
      ...prev,
      [replyId]: !prev[replyId],
    }));
  };

  const liked = Boolean(postData?.hasLiked || postData?.isLiked);
  const saved = Boolean(postData?.saved || postData?.isSaved);
  const replyCount = replies.length || postData?.commentCount || postData?.commentsCount || 0;
  const topLevelReplies = replies.filter((reply) => !reply.parentReplyId);

  // Reddit/YouTube Style Nested Comment Component
  const RedditCommentItem = ({ reply, depth = 0 }) => {
    const isCollapsed = Boolean(collapsedThreads[reply._id]);
    const isReplyingThis = replyingTo?._id === reply._id;
    const [inlineBody, setInlineBody] = useState('');

    const childReplies = replies.filter((candidate) => {
      const parentId = candidate.parentReplyId?._id || candidate.parentReplyId;
      return parentId?.toString() === reply._id.toString();
    });

    const isPostAuthor =
      String(reply.authorId?._id || reply.authorId) ===
      String(postData.authorId?._id || postData.authorId);

    return (
      <div className={`text-left ${depth > 0 ? 'ml-2 sm:ml-5 pl-2 sm:pl-3.5 border-l-2 border-slate-200 hover:border-slate-300 dark:border-slate-700/80 transition-colors' : ''} pt-2.5`}>
        {/* Author Header */}
        <div className="flex items-center gap-2">
          <Avatar
            initials={reply.authorInitials || reply.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={reply.authorColor || 'blue'}
            size="w-6 h-6 text-[9.5px]"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#17213f] dark:text-slate-200">
              {reply.authorName || 'Orvexa Member'}
            </span>
            {isPostAuthor && (
              <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#eef1ff] text-[#3f5ce8] dark:bg-blue-900/40 dark:text-blue-300">
                OP
              </span>
            )}
            <span className="text-[10.5px] text-slate-400">·</span>
            <span className="text-[10.5px] text-slate-400">
              {new Date(reply.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggleCollapse(reply._id)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
            title={isCollapsed ? 'Expand comment thread' : 'Collapse comment thread'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Comment Body & Actions (hidden if collapsed) */}
        {!isCollapsed && (
          <div className="pl-8 pt-1 space-y-2">
            <p className="text-xs text-[#2b354f] dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {reply.body}
            </p>

            {/* Actions: Upvote, Reply */}
            {!postData?.convertedToDiscussionId && (
              <div className="flex items-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(isReplyingThis ? null : reply);
                    setInlineBody('');
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-[#3f5ce8] dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              </div>
            )}

            {/* Inline reply composer */}
            {isReplyingThis && (
              <div className="pt-2 pb-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!inlineBody.trim()) return;
                    handleReplySubmit(inlineBody, reply._id);
                    setInlineBody('');
                  }}
                  className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Replying to <b className="text-slate-700 dark:text-slate-200">{reply.authorName}</b>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={inlineBody}
                    onChange={(e) => setInlineBody(e.target.value)}
                    placeholder="Write a response..."
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
                      disabled={submitting || !inlineBody.trim()}
                      className="px-3 py-1 bg-[#3f5ce8] hover:bg-[#324ecc] text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Child Comments / Sub-replies */}
            {childReplies.length > 0 && (
              <div className="space-y-1 mt-1">
                {childReplies.map((child) => (
                  <RedditCommentItem key={child._id} reply={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 font-sans"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-5 sm:p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e9e9ed] dark:border-slate-800 space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#f0f0f2] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar
              initials={postData?.authorInitials || postData?.authorName?.slice(0, 2).toUpperCase() || 'OP'}
              color={postData?.authorColor || 'purple'}
            />
            <div>
              <div className="text-xs font-bold text-[#17213f] dark:text-white">
                {postData?.authorName || 'Orvexa Member'}
                {postData?.circleName && (
                  <span className="text-[#8991a0] dark:text-slate-400 font-normal"> · in {postData.circleName}</span>
                )}
              </div>
              <div className="text-[10px] text-[#9298a7] dark:text-slate-400">
                {new Date(postData?.createdAt || Date.now()).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={handleDeletePost}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#737b8d] dark:text-slate-400 hover:text-[#17213f] dark:hover:text-white cursor-pointer"
              aria-label="Close post"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action ribbon for conversion, knowledge creation, edit & delete */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#fafafc] dark:bg-slate-800/50 border border-[#f0f0f4] dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenCreateKnowledge) {
                  onOpenCreateKnowledge(postData);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fff0ee] hover:bg-[#fedbd7] text-[#c65d59] dark:bg-red-950/40 dark:text-red-300 transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Create Knowledge from Post</span>
            </button>

            {isOwner && !postData?.convertedToDiscussionId && (
              <button
                type="button"
                onClick={() => {
                  setConvertTitle(postData.title || postData.body.slice(0, 70));
                  setShowConvertModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#eef1ff] hover:bg-[#dce3ff] text-[#3f5ce8] dark:bg-blue-950/50 dark:text-blue-300 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Convert to Discussion</span>
              </button>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditTitle(postData.title || '');
                  setEditBody(postData.body || '');
                  setIsEditing((prev) => !prev);
                }}
                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit Post"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Converted Post Banner */}
        {postData?.convertedToDiscussionId && (
          <div className="bg-[#f0f4ff] dark:bg-blue-950/30 border border-[#d6e2ff] dark:border-blue-800/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#17213f] dark:text-blue-200 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#3f5ce8]" />
                <span>Conversation moved to Discussion</span>
              </div>
              <p className="text-[11px] text-[#556987] dark:text-blue-300/80 mt-0.5">
                This post was graduated into a full Discussion. Existing replies and new perspectives are housed there.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDiscussion?.(postData.convertedToDiscussionId);
              }}
              className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View Discussion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit Form or Normal Content Display */}
        {isEditing ? (
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Edit Post</div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title (optional)..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
            />
            <textarea
              rows={4}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="Content..."
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
                disabled={savingEdit || !editBody.trim()}
                onClick={handleSaveEdit}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#3f5ce8] hover:bg-[#324ecc] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Post Title & Content */}
            {postData?.title && (
              <h2 className="text-xl sm:text-2xl font-black text-[#17213f] dark:text-white leading-tight">
                {postData.title}
              </h2>
            )}

            {/* Post Image attachment if present */}
            {postData?.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-80 bg-slate-100 dark:bg-slate-800">
                <img
                  src={postData.imageUrl}
                  alt={postData.title || 'Post attachment'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <p className="text-sm text-[#38425b] dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {postData?.body}
            </p>

            {postData?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {postData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10.5px] font-semibold text-[#bd625e] bg-[#fff0ee] dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stats & Reactions */}
        <div className="border-t border-[#f0f0f2] dark:border-slate-800 pt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              liked
                ? 'bg-[#fff0ee] text-[#d56560] dark:bg-red-950/40 dark:text-red-300'
                : 'text-[#737b8d] dark:text-slate-400 hover:bg-[#fff0ee] hover:text-[#d56560]'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-[#d56560]' : ''}`} />
            {liked ? 'Liked' : 'Like'} · {postData?.likeCount || 0}
          </button>
          <button
            type="button"
            disabled={Boolean(postData?.convertedToDiscussionId)}
            onClick={() => {
              setReplyingTo(null);
              focusReplyInput();
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#737b8d] dark:text-slate-400 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Reply · {replyCount}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              saved
                ? 'bg-[#eef1ff] text-[#3f5ce8] dark:bg-blue-950/50 dark:text-blue-300'
                : 'text-[#737b8d] dark:text-slate-400 hover:bg-[#f7f7f8] dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#3f5ce8]' : ''}`} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Replies Section */}
        <div className="space-y-3 pt-3 border-t border-[#f0f0f2] dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17213f] dark:text-white">
              {postData?.convertedToDiscussionId ? `Historical Replies (${replyCount})` : `Replies (${replyCount})`}
            </h3>
            {postData?.convertedToDiscussionId && (
              <span className="text-[10.5px] text-[#556987] dark:text-blue-300 font-semibold">
                Migrated to Discussion
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-[#8b92a1]">Loading replies...</div>
          ) : replies.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] dark:border-slate-800 rounded-2xl">
              No replies yet. Start the thread!
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
              {topLevelReplies.map((reply) => (
                <RedditCommentItem key={reply._id} reply={reply} />
              ))}
            </div>
          )}

          {/* Main Reply Input or Conversion Lockdown Notice */}
          {postData?.convertedToDiscussionId ? (
            <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-slate-800/40 border border-[#e9e9ed] dark:border-slate-800 text-center space-y-2 mt-3">
              <p className="text-xs font-bold text-[#17213f] dark:text-white">Conversation moved to Discussion</p>
              <p className="text-[11px] text-[#737b8d] dark:text-slate-400 max-w-sm mx-auto">
                Further conversation happens in the dedicated Discussion. New contributions cannot be added directly to this post.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDiscussion?.(postData.convertedToDiscussionId);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3f5ce8] hover:bg-[#324ecc] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <span>Go to Discussion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleReplySubmit(replyBody, null);
            }} className="pt-2 flex items-center gap-2">
              <input
                id="post-reply-input"
                type="text"
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#3f5ce8]"
              />
              <button
                type="submit"
                disabled={submitting || !replyBody.trim()}
                className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
              >
                {submitting ? '...' : 'Reply'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Conversion */}
      {showConvertModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-[#17213f]/50 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#e9e9ed] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f2] dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#3f5ce8]">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#17213f] dark:text-white">Convert Post to Discussion</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="text-[#8b92a1] hover:text-[#17213f] dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#556987] dark:text-slate-300 leading-relaxed">
              This creates a separate, structured Discussion linked to this post.
            </p>
            <ul className="text-[11.5px] text-[#4a5265] dark:text-slate-300 space-y-1.5 list-disc list-inside bg-[#fcfcfd] dark:bg-slate-800/50 p-3 rounded-xl border border-[#e9e9ed] dark:border-slate-800">
              <li>Existing replies are carried over as initial contributions with timestamps intact.</li>
              <li>Future conversation moves to the Discussion.</li>
              <li>The original post remains visible, with its likes and engagement preserved.</li>
            </ul>

            {conversionError && (
              <div className="p-3 rounded-xl bg-[#fff0ee] dark:bg-red-950/40 text-[#bd625e] dark:text-red-300 text-xs">
                {conversionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#17213f] dark:text-white mb-1">Discussion Title</label>
              <input
                type="text"
                value={convertTitle}
                onChange={(e) => setConvertTitle(e.target.value)}
                placeholder="Give your discussion a title..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#737b8d] dark:text-slate-400 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={converting || !convertTitle.trim()}
                onClick={handleConvert}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#3f5ce8] hover:bg-[#324ecc] text-white disabled:opacity-60 cursor-pointer shadow-sm"
              >
                {converting ? 'Converting...' : 'Convert to Discussion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
