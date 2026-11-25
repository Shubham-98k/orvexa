import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, ThumbsUp } from 'lucide-react';
import Avatar from '../common/Avatar';
import { apiPost } from '../../api/client';

export default function DiscussionCard({ discussion, onOpenDetail }) {
  const [votes, setVotes] = useState(discussion.votes || 0);
  const [voted, setVoted] = useState(Boolean(discussion.hasUpvoted || discussion.voted));

  useEffect(() => {
    setVotes(discussion.votes || 0);
    setVoted(Boolean(discussion.hasUpvoted || discussion.voted));
  }, [discussion.votes, discussion.hasUpvoted, discussion.voted]);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    try {
      const res = await apiPost(`/discussions/${discussion._id}/upvote`, {});
      const newVotes = res.voteCount !== undefined ? res.voteCount : res.votes;
      setVotes(newVotes);
      setVoted(Boolean(res.hasUpvoted || res.viewerVote === 1));
    } catch {}
  };

  const contributionCount =
    discussion.contributionCount !== undefined
      ? discussion.contributionCount
      : (discussion.commentsCount || 0);

  return (
    <article
      onClick={() => onOpenDetail(discussion)}
      className="group rounded-3xl bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#3f5ce8]/40 dark:hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between gap-4 font-sans"
    >
      <div className="space-y-3">
        {/* Top badge row */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            Discussion
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {discussion.category || 'General'}
          </span>
        </div>

        {/* Discussion Image if present */}
        {discussion.imageUrl && (
          <div className="rounded-2xl overflow-hidden max-h-48 w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={discussion.imageUrl}
              alt={discussion.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <h3 className="text-base sm:text-lg font-black text-[#17213f] dark:text-white group-hover:text-[#3f5ce8] dark:group-hover:text-blue-400 transition-colors leading-snug">
          {discussion.title}
        </h3>

        {discussion.body && (
          <p className="text-xs text-[#55607a] dark:text-slate-400 leading-relaxed line-clamp-2">
            {discussion.body}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-[#f0f0f2] dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpvote}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              voted
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{votes}</span>
          </button>

          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{contributionCount}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(discussion);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3f5ce8] dark:text-blue-400 hover:gap-1.5 transition-all cursor-pointer"
        >
          <span>Join discussion</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}
