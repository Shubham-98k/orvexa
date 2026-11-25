import React, { useEffect, useState } from 'react';
import { Heart, Bookmark, Send, X, MessageSquare, Bot, ArrowRight } from 'lucide-react';
import Avatar from '../common/Avatar';
import { apiGet, apiPost } from '../../api/client';
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

  // Conversion confirmation state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTitle, setConvertTitle] = useState('');
  const [converting, setConverting] = useState(false);
  const [conversionError, setConversionError] = useState('');

  const isAuthor =
    user &&
    postData?.authorId &&
    String(user._id || user.id) === String(postData.authorId?._id || postData.authorId);

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
        setPostData(res.post);
        setReplies(res.replies || []);
        onPostUpdated?.(res.post);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [post?._id, onPostUpdated]);

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
      onPostUpdated?.(updated);
    } catch {
      // Keep state if request fails
    }
  };

  const handleSave = async () => {
    try {
      const res = await apiPost(`/posts/${postData._id}/save`, {});
      const updated = { ...postData, saved: res.saved, isSaved: res.saved };
      setPostData(updated);
      onPostUpdated?.(updated);
    } catch {
      // Keep state if request fails
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();
    const body = replyBody.trim();
    if (!body) return;

    try {
      setSubmitting(true);
      const res = await apiPost(`/posts/${postData._id}/replies`, {
        body,
        parentReplyId: replyingTo?._id || null,
      });
      setReplies((current) => [...current, res.reply]);
      setReplyBody('');
      setReplyingTo(null);
      const updated = {
        ...postData,
        commentCount: res.replyCount,
        commentsCount: res.replyCount,
      };
      setPostData(updated);
      onPostUpdated?.(updated);
    } catch (err) {
      alert(err.message || 'Unable to add your reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToDiscussion = async (e) => {
    e.preventDefault();
    try {
      setConverting(true);
      setConversionError('');
      const res = await apiPost(`/posts/${postData._id}/convert-to-discussion`, {
        title: convertTitle.trim() || undefined,
      });

      if (res?.discussion) {
        const updated = {
          ...postData,
          convertedToDiscussionId: res.discussion._id,
          convertedAt: new Date(),
        };
        setPostData(updated);
        onPostUpdated?.(updated);
        setShowConvertModal(false);

        if (onOpenDiscussion) {
          onClose();
          onOpenDiscussion(res.discussion);
        }
      }
    } catch (err) {
      setConversionError(err.message || 'Conversion failed. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const liked = Boolean(postData?.hasLiked || postData?.isLiked);
  const saved = Boolean(postData?.saved || postData?.isSaved);
  const replyCount = replies.length || postData?.commentCount || postData?.commentsCount || 0;
  const topLevelReplies = replies.filter((reply) => !reply.parentReplyId);

  const ReplyThread = ({ reply, depth = 0 }) => {
    const childReplies = replies.filter((candidate) => {
      const parentId = candidate.parentReplyId?._id || candidate.parentReplyId;
      return parentId?.toString() === reply._id.toString();
    });

    return (
      <div style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 18}px` : 0 }} className="space-y-2">
        <div className="border border-[#e9e9ed] rounded-xl p-3.5 bg-[#fcfcfd] space-y-1.5">
          <div className="flex items-center gap-2">
            <Avatar
              initials={reply.authorInitials || reply.authorName?.slice(0, 2).toUpperCase() || 'OP'}
              color={reply.authorColor || 'blue'}
              size="w-6 h-6 text-[9px]"
            />
            <div>
              <div className="text-xs font-bold text-[#17213f]">{reply.authorName}</div>
              <div className="text-[10px] text-[#9298a7]">{new Date(reply.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <p className="text-xs text-[#38425b] leading-relaxed whitespace-pre-line">{reply.body}</p>
          {!postData?.convertedToDiscussionId && (
            <button
              type="button"
              onClick={() => {
                setReplyingTo(reply);
                setReplyBody('');
                focusReplyInput();
              }}
              className="text-[10.5px] font-bold text-[#3f5ce8] hover:text-[#324ecc] cursor-pointer"
            >
              Reply
            </button>
          )}
        </div>
        {childReplies.map((child) => (
          <ReplyThread key={child._id} reply={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans"
    >
      <div className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl border border-[#e9e9ed] space-y-5">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#f0f0f2]">
          <div className="flex items-center gap-3">
            <Avatar
              initials={postData?.authorInitials || postData?.authorName?.slice(0, 2).toUpperCase() || 'OP'}
              color={postData?.authorColor || 'purple'}
            />
            <div>
              <div className="text-xs font-bold text-[#17213f]">
                {postData?.authorName || 'Orvexa Member'}
                {postData?.circleName && <span className="text-[#8991a0] font-normal"> · in {postData.circleName}</span>}
              </div>
              <div className="text-[10px] text-[#9298a7]">
                {new Date(postData?.createdAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#737b8d] hover:text-[#17213f] cursor-pointer" aria-label="Close post">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action ribbon for conversion & knowledge creation */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#fafafc] border border-[#f0f0f4]">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCreateKnowledge) {
                onOpenCreateKnowledge(postData);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#fff0ee] hover:bg-[#fedbd7] text-[#c65d59] transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Create Knowledge from Post</span>
          </button>

          {isAuthor && !postData?.convertedToDiscussionId && (
            <button
              type="button"
              onClick={() => {
                setConvertTitle(postData.title || postData.body.slice(0, 70));
                setShowConvertModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#eef1ff] hover:bg-[#dce3ff] text-[#3f5ce8] transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Convert to Discussion</span>
            </button>
          )}
        </div>

        {/* Converted Post Banner */}
        {postData?.convertedToDiscussionId && (
          <div className="bg-[#f0f4ff] border border-[#d6e2ff] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#17213f] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#3f5ce8]" />
                <span>Conversation moved to Discussion</span>
              </div>
              <p className="text-[11px] text-[#556987] mt-0.5">
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

        {postData?.title && <h2 className="text-xl sm:text-2xl font-black text-[#17213f] leading-tight">{postData.title}</h2>}
        <p className="text-sm text-[#38425b] leading-relaxed whitespace-pre-line">{postData?.body}</p>

        {postData?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {postData.tags.map((tag) => (
              <span key={tag} className="text-[10.5px] font-semibold text-[#bd625e] bg-[#fff0ee] px-2 py-0.5 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-[#f0f0f2] pt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              liked ? 'bg-[#fff0ee] text-[#d56560]' : 'text-[#737b8d] hover:bg-[#fff0ee] hover:text-[#d56560]'
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
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#737b8d] hover:bg-[#f7f7f8] disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Reply · {replyCount}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              saved ? 'bg-[#eef1ff] text-[#3f5ce8]' : 'text-[#737b8d] hover:bg-[#f7f7f8]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#3f5ce8]' : ''}`} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Replies List */}
        <div className="space-y-3 pt-3 border-t border-[#f0f0f2]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17213f]">
              {postData?.convertedToDiscussionId ? `Historical Replies (${replyCount})` : `Replies (${replyCount})`}
            </h3>
            {postData?.convertedToDiscussionId && (
              <span className="text-[10.5px] text-[#556987] font-semibold">Migrated to Discussion</span>
            )}
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-[#8b92a1]">Loading replies...</div>
          ) : replies.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-xl">
              No replies yet.
            </div>
          ) : (
            <div className="space-y-2">
              {topLevelReplies.map((reply) => (
                <ReplyThread key={reply._id} reply={reply} />
              ))}
            </div>
          )}

          {/* Reply composer or Conversion Lockdown notice */}
          {postData?.convertedToDiscussionId ? (
            <div className="p-4 rounded-2xl bg-[#fafafc] border border-[#e9e9ed] text-center space-y-2 mt-3">
              <p className="text-xs font-bold text-[#17213f]">Conversation moved to Discussion</p>
              <p className="text-[11px] text-[#737b8d] max-w-sm mx-auto">
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
            <>
              {replyingTo && (
                <div className="flex items-center justify-between rounded-lg bg-[#f7f7f8] px-3 py-2 text-[10.5px] text-[#737b8d]">
                  <span>Replying to <b className="text-[#17213f]">{replyingTo.authorName}</b></span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="text-[#737b8d] hover:text-[#17213f]">
                    Cancel
                  </button>
                </div>
              )}

              <form onSubmit={handleReply} className="pt-2 flex items-center gap-2">
                <input
                  id="post-reply-input"
                  type="text"
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Write a reply...'}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none focus:border-[#3f5ce8]"
                />
                <button
                  type="submit"
                  disabled={submitting || !replyBody.trim()}
                  className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? '...' : 'Reply'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Conversion */}
      {showConvertModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-[#17213f]/50 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#e9e9ed] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f2]">
              <div className="flex items-center gap-2 text-[#3f5ce8]">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#17213f]">Convert Post to Discussion</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="text-[#8b92a1] hover:text-[#17213f] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#556987] leading-relaxed">
              This creates a separate, structured Discussion linked to this post.
            </p>
            <ul className="text-[11.5px] text-[#4a5265] space-y-1.5 list-disc list-inside bg-[#fcfcfd] p-3 rounded-xl border border-[#e9e9ed]">
              <li>Existing replies are carried over as initial contributions with timestamps intact.</li>
              <li>Future conversation moves to the Discussion.</li>
              <li>The original post remains visible, with its likes and engagement preserved.</li>
            </ul>

            {conversionError && (
              <div className="p-3 rounded-xl bg-[#fff0ee] text-[#bd625e] text-xs">
                {conversionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1">Discussion Title</label>
              <input
                type="text"
                value={convertTitle}
                onChange={(e) => setConvertTitle(e.target.value)}
                placeholder="Give the discussion a clear title..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e9e9ed] focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f2]">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#737b8d] hover:bg-[#f7f7f8] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertToDiscussion}
                disabled={converting}
                className="px-4 py-2 text-xs font-bold bg-[#3f5ce8] hover:bg-[#324ecc] text-white rounded-xl disabled:opacity-60 cursor-pointer"
              >
                {converting ? 'Converting...' : 'Confirm & Convert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
