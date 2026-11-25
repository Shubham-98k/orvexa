import React, { useState, useEffect, useRef } from 'react';
import { X, Bot, Send, Pencil, Trash2, Flag, Check, XCircle } from 'lucide-react';
import Avatar from '../common/Avatar';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import ReportModal from '../common/ReportModal';

const getId = (value) => value?._id || value?.id || value;

const isSameUser = (author, user) => {
  const authorId = getId(author);
  const userId = getId(user);
  return authorId != null && userId != null && String(authorId) === String(userId);
};

export default function DiscussionDetailModal({ discussion, onClose, onOpenAiStudio, onDiscussionUpdate }) {
  const { user } = useAuth();
  const [discussionData, setDiscussionData] = useState(discussion);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputBody, setInputBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingContributionId, setEditingContributionId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingContributionId, setDeletingContributionId] = useState(null);
  const [reportingContributionId, setReportingContributionId] = useState(null);
  const [replyingToContribution, setReplyingToContribution] = useState(null);
  const contributionInputRef = useRef(null);
  const [votes, setVotes] = useState(
    discussion.voteCount !== undefined ? discussion.voteCount : (discussion.votes || 0)
  );
  const [voted, setVoted] = useState(Boolean(discussion.hasUpvoted || discussion.viewerVote === 1));

  useEffect(() => {
    if (discussion?._id) {
      setLoading(true);
      apiGet(`/discussions/${discussion._id}`)
        .then((res) => {
          if (res?.discussion) {
            setDiscussionData(res.discussion);
            onDiscussionUpdate?.(res.discussion);
            const vCount = res.discussion.voteCount !== undefined ? res.discussion.voteCount : res.discussion.votes;
            setVotes(vCount);
            setVoted(Boolean(res.discussion.hasUpvoted || res.discussion.viewerVote === 1));
          }
          if (res?.contributions) {
            setContributions(res.contributions);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [discussion, onDiscussionUpdate]);

  useEffect(() => {
    if (discussion?._id) {
      requestAnimationFrame(() => contributionInputRef.current?.focus());
    }
  }, [discussion?._id]);

  const handleUpvote = async () => {
    try {
      const res = await apiPost(`/discussions/${discussion._id}/upvote`, {});
      const newVotes = res.voteCount !== undefined ? res.voteCount : res.votes;
      const hasUpvoted = Boolean(res.hasUpvoted || res.viewerVote === 1);
      const updatedDiscussion = {
        ...discussionData,
        votes: newVotes,
        voteCount: newVotes,
        hasUpvoted,
        viewerVote: hasUpvoted ? 1 : 0,
      };
      setVotes(newVotes);
      setVoted(hasUpvoted);
      setDiscussionData(updatedDiscussion);
      onDiscussionUpdate?.(updatedDiscussion);
    } catch {
      // rollback or handle error
    }
  };

  const handleAddContribution = async (e) => {
    e.preventDefault();
    if (!inputBody.trim()) return;

    try {
      setSubmitting(true);
      const res = await apiPost(`/discussions/${discussion._id}/contributions`, {
        body: inputBody.trim(),
        parentContributionId: replyingToContribution?._id || null,
      });
      if (res?.contribution) {
        setContributions((prev) => [...prev, res.contribution]);
        setInputBody('');
        setReplyingToContribution(null);
        const updatedDiscussion = {
          ...discussionData,
          contributionCount: res.contributionCount ?? res.commentsCount ?? discussionData.contributionCount + 1,
          contributorCount: res.contributorCount ?? res.contributorsCount ?? discussionData.contributorCount,
        };
        setDiscussionData(updatedDiscussion);
        onDiscussionUpdate?.(updatedDiscussion);
      }
    } catch (err) {
      alert(err.message || 'Unable to post contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContribution = async (e, contributionId) => {
    e.preventDefault();
    if (!editBody.trim()) return;

    try {
      setSavingEdit(true);
      const res = await apiPatch(
        `/discussions/${discussion._id}/contributions/${contributionId}`,
        { body: editBody.trim() }
      );
      if (res?.contribution) {
        setContributions((prev) => prev.map((contribution) => (
          contribution._id === contributionId ? res.contribution : contribution
        )));
        setEditingContributionId(null);
        setEditBody('');
      }
    } catch (err) {
      alert(err.message || 'Unable to edit contribution.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteContribution = async (contributionId) => {
    if (!window.confirm('Delete this contribution?')) return;

    try {
      setDeletingContributionId(contributionId);
      const res = await apiDelete(
        `/discussions/${discussion._id}/contributions/${contributionId}`
      );
      setContributions((prev) => prev.filter((contribution) => contribution._id !== contributionId));
      const updatedDiscussion = {
        ...discussionData,
        contributionCount: res.contributionCount ?? Math.max(0, contributions.length - 1),
        contributorCount: res.contributorCount ?? discussionData.contributorCount,
      };
      setDiscussionData(updatedDiscussion);
      onDiscussionUpdate?.(updatedDiscussion);
    } catch (err) {
      alert(err.message || 'Unable to delete contribution.');
    } finally {
      setDeletingContributionId(null);
    }
  };

  const totalContributions = discussionData.contributionCount !== undefined
    ? discussionData.contributionCount
    : contributions.length;

  const totalContributors = discussionData.contributorCount !== undefined
    ? discussionData.contributorCount
    : new Set(contributions.map((c) => c.authorName)).size;

  const ContributionThread = ({ contribution, depth = 0 }) => {
    const childContributions = contributions.filter((candidate) => {
      const parentId = candidate.parentContributionId?._id || candidate.parentContributionId;
      return parentId?.toString() === contribution._id.toString();
    });

    return (
      <div style={{ marginLeft: depth > 0 ? `${Math.min(depth, 3) * 18}px` : 0 }} className="space-y-2">
        <div className="border border-[#e9e9ed] rounded-xl p-3.5 bg-[#fcfcfd] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-[#17213f]">
              <Avatar
                initials={contribution.authorInitials || contribution.authorName?.slice(0, 2).toUpperCase() || 'OP'}
                color={contribution.authorColor || 'blue'}
                size="w-5 h-5 text-[9px]"
              />
              <span>{contribution.authorName}</span>
            </div>
            <span className="text-[10px] text-[#9298a7]">
              {new Date(contribution.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {isSameUser(contribution.authorId, user) ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingContributionId(contribution._id);
                  setEditBody(contribution.body);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#737b8d] hover:text-[#3f5ce8]"
                aria-label="Edit contribution"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteContribution(contribution._id)}
                disabled={deletingContributionId === contribution._id}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#c65d59] hover:text-red-700 disabled:opacity-50"
                aria-label="Delete contribution"
              >
                <Trash2 className="h-3 w-3" />
                {deletingContributionId === contribution._id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ) : (
            user && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setReportingContributionId(contribution._id)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#737b8d] hover:text-[#c65d59]"
                  aria-label="Report contribution"
                >
                  <Flag className="h-3 w-3" /> Report
                </button>
              </div>
            )
          )}
          {editingContributionId === contribution._id ? (
            <form onSubmit={(e) => handleUpdateContribution(e, contribution._id)} className="space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                required
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-[#e9e9ed] text-xs focus:outline-none focus:border-[#3f5ce8]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingContributionId(null);
                    setEditBody('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#737b8d] hover:bg-[#f0f0f4]"
                >
                  <XCircle className="h-3 w-3" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editBody.trim()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white bg-[#3f5ce8] hover:bg-[#324ecc] disabled:opacity-60"
                >
                  <Check className="h-3 w-3" /> {savingEdit ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-[#38425b] leading-relaxed whitespace-pre-line">{contribution.body}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setReplyingToContribution(contribution);
              setInputBody('');
              requestAnimationFrame(() => contributionInputRef.current?.focus());
            }}
            className="text-[10.5px] font-bold text-[#3f5ce8] hover:text-[#324ecc]"
          >
            Reply
          </button>
        </div>
        {childContributions.map((child) => (
          <ContributionThread key={child._id || child.id} contribution={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl border border-[#e9e9ed] space-y-5">
        <div className="flex items-start justify-between gap-4 pb-2 border-b border-[#f0f0f2]">
          <div className="flex items-center gap-2">
            <span className="bg-[#fff0ee] text-[#bd625e] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
              {discussionData.category || 'General'}
            </span>
            <span className="text-xs text-[#8b92a1]">● {discussionData.status || 'open'}</span>
          </div>
          <button onClick={onClose} className="text-[#8b92a1] hover:text-[#17213f] p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Origin Post Banner if converted from a post */}
        {discussionData.originPostId && (
          <div className="bg-[#fff8f2] border border-[#fde4cb] p-3.5 rounded-2xl flex items-center justify-between text-xs text-[#9d501b]">
            <div className="flex items-center gap-2">
              <span className="text-base">↗</span>
              <div>
                <span className="font-bold">Graduated from a community Post</span>
                <span className="text-[11px] text-[#b46c3b] block">
                  Originally posted by {discussionData.originMetadata?.authorName || discussionData.authorName}. Initial replies were carried over as contributions.
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17213f] leading-snug">{discussionData.title}</h2>
          <div className="flex items-center gap-2.5 mt-3 pt-2">
            <Avatar
              initials={discussionData.authorInitials || 'OP'}
              color={discussionData.authorColor || 'purple'}
              size="w-7 h-7 text-[10px]"
            />
            <span className="text-xs font-bold text-[#17213f]">{discussionData.authorName}</span>
          </div>
          <p className="text-xs sm:text-sm text-[#4a5265] mt-3 leading-relaxed whitespace-pre-line bg-[#fafafb] p-4 rounded-2xl border border-[#f0f0f2]">
            {discussionData.body}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#f0f0f2]">
          <button
            onClick={handleUpvote}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              voted ? 'bg-[#fddedb] text-[#c65d59]' : 'bg-[#fff0ee] hover:bg-[#fddedb] text-[#c65d59]'
            }`}
          >
            <span>↑ Upvote</span>
            <b>{votes}</b>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onOpenAiStudio) onOpenAiStudio(discussionData);
            }}
            className="bg-[#8b63d9] hover:bg-[#7a52c7] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Create Knowledge from this discussion</span>
          </button>
        </div>

        {/* Contributions Thread */}
        <div className="space-y-3 pt-3 border-t border-[#f0f0f2]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#17213f] uppercase tracking-wider">
              Contributions ({totalContributions})
            </h4>
            <span className="text-[11px] text-[#737b8d]">
              {totalContributors} {totalContributors === 1 ? 'contributor' : 'contributors'}
            </span>
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-[#8b92a1]">Loading contributions...</div>
          ) : contributions.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-xl">
              No contributions yet. Be the first to share a perspective!
            </div>
          ) : (
            <div className="space-y-2">
              {contributions
                .filter((contribution) => !(contribution.parentContributionId?._id || contribution.parentContributionId))
                .map((contribution) => (
                  <ContributionThread key={contribution._id || contribution.id} contribution={contribution} />
                ))}
            </div>
          )}

          {replyingToContribution && (
            <div className="flex items-center justify-between rounded-lg bg-[#f7f7f8] px-3 py-2 text-[10.5px] text-[#737b8d]">
              <span>Replying to <b className="text-[#17213f]">{replyingToContribution.authorName}</b></span>
              <button type="button" onClick={() => setReplyingToContribution(null)} className="text-[#737b8d] hover:text-[#17213f]">
                Cancel
              </button>
            </div>
          )}

          {/* Contribution Composer */}
          <form onSubmit={handleAddContribution} className="pt-2 flex items-center gap-2">
            <input
              ref={contributionInputRef}
              type="text"
              required
              value={inputBody}
              onChange={(e) => setInputBody(e.target.value)}
              placeholder="Add your perspective to this discussion..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none focus:border-[#3f5ce8]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? '...' : 'Contribute'}</span>
            </button>
          </form>
        </div>
      </div>
      {reportingContributionId && (
        <ReportModal
          targetType="contribution"
          targetId={reportingContributionId}
          onClose={() => setReportingContributionId(null)}
        />
      )}
    </div>
  );
}
