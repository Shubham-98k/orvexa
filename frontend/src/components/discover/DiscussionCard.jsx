import React, { useState, useEffect } from 'react';
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
    } catch {
      // rollback or no-op on unauthenticated
    }
  };

  const contributionCount = discussion.contributionCount !== undefined
    ? discussion.contributionCount
    : (discussion.commentsCount || 0);

  const contributorCount = discussion.contributorCount !== undefined
    ? discussion.contributorCount
    : (discussion.contributorsCount || 0);

  return (
    <article
      onClick={() => onOpenDetail(discussion)}
      className="border border-[#e9e9ed] rounded-2xl bg-white p-5 shadow-2xs hover:border-[#dedee5] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-4 font-sans"
    >
      <div className="flex items-start gap-4">
        {/* Upvote button */}
        <div
          onClick={handleUpvote}
          title="Click to upvote this discussion"
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors shrink-0 text-center w-14 cursor-pointer ${
            voted ? 'bg-[#fddedb]' : 'bg-[#fff0ee] hover:bg-[#fddedb]'
          }`}
        >
          <span className="text-[#e66c68] text-base font-black">↑</span>
          <b className="text-base font-extrabold text-[#c65d59] leading-none my-0.5">{votes}</b>
          <span className="text-[9px] font-semibold text-[#8b92a1]">votes</span>
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#17213f] leading-snug hover:text-[#3f5ce8] transition-colors">
            {discussion.title}
          </h3>
          <p className="text-xs sm:text-[13px] text-[#737b8d] leading-relaxed line-clamp-2">
            {discussion.body}
          </p>

          <div className="flex items-center gap-2 pt-2 text-[11px] text-[#727b8d]">
            <span className="bg-[#fff0ee] text-[#bd625e] px-2 py-0.5 rounded font-bold text-[10px]">
              {discussion.category || 'General'}
            </span>
            {discussion.originPostId && (
              <span className="bg-[#fff8f2] text-[#b46c3b] px-2 py-0.5 rounded font-bold text-[10px] border border-[#fde4cb]">
                ↗ From Post
              </span>
            )}
            <span>• {contributorCount} {contributorCount === 1 ? 'contributor' : 'contributors'}</span>
            <span className="text-[#e66c68] font-bold">◉ {discussion.status || 'open'}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#f0f0f2] pt-3 flex items-center justify-between text-xs text-[#798192]">
        <div className="flex items-center gap-2">
          <Avatar
            initials={discussion.authorInitials || discussion.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={discussion.authorColor || 'purple'}
            size="w-6 h-6 text-[10px]"
          />
          <span className="font-semibold text-[#17213f]">{discussion.authorName}</span>
        </div>
        <span>💬 {contributionCount} {contributionCount === 1 ? 'contribution' : 'contributions'}</span>
      </div>
    </article>
  );
}
