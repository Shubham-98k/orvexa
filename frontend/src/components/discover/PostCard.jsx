import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Bookmark, Share2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import { apiPost } from '../../api/client';

export default function PostCard({ post, onPostUpdated, onOpenDetail }) {
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [liked, setLiked] = useState(Boolean(post.hasLiked || post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved || post.saved));

  useEffect(() => {
    setLikes(post.likeCount || 0);
    setLiked(Boolean(post.hasLiked || post.isLiked));
    setSaved(Boolean(post.isSaved || post.saved));
  }, [post.likeCount, post.hasLiked, post.isLiked, post.isSaved, post.saved]);

  const handleLike = async () => {
    try {
      const res = await apiPost(`/posts/${post._id}/like`, {});
      setLikes(res.likeCount);
      setLiked(res.hasLiked ?? res.isLiked);
    } catch {
      // toggle locally if offline
      setLiked((prev) => !prev);
      setLikes((prev) => (liked ? prev - 1 : prev + 1));
    }
  };

  const handleSave = async () => {
    try {
      const res = await apiPost(`/posts/${post._id}/save`, {});
      setSaved(res.saved);
    } catch {
      setSaved((prev) => !prev);
    }
  };

  return (
    <article
      onClick={() => onOpenDetail?.(post)}
      className="border border-[#e9e9ed] rounded-2xl bg-white p-5 shadow-2xs hover:border-[#dedee5] hover:shadow-xs transition-all space-y-3 font-sans cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            initials={post.authorInitials || post.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={post.authorColor || 'purple'}
            size="w-8 h-8 text-xs"
          />
          <div>
            <div className="text-xs font-bold text-[#17213f] flex items-center gap-1.5">
              <span>{post.authorName || 'Orvexa Member'}</span>
              {post.circleName && <span className="text-[#8991a0] font-normal">· in {post.circleName}</span>}
            </div>
            <div className="text-[10px] text-[#9298a7]">
              {new Date(post.createdAt || Date.now()).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {post.title && <h3 className="text-sm font-bold text-[#17213f]">{post.title}</h3>}
      <p className="text-xs sm:text-[13.5px] text-[#38425b] leading-relaxed whitespace-pre-line">{post.body}</p>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="text-[10.5px] font-semibold text-[#bd625e] bg-[#fff0ee] px-2 py-0.5 rounded-md">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        onClick={() => onOpenDetail?.(post)}
        className="border-t border-[#f0f0f2] pt-3 flex items-center justify-between text-[11px] text-[#798192] cursor-pointer"
      >
        <span>♡ {likes} likes</span>
        <span>{post.commentCount || 0} comments</span>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-[#f0f0f2] pt-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            handleLike();
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            liked ? 'bg-[#fff0ee] text-[#d56560]' : 'text-[#737b8d] hover:bg-[#fff0ee] hover:text-[#d56560]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#d56560]' : ''}`} />
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail?.(post, true);
          }}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-[#737b8d] hover:bg-[#f7f7f8] hover:text-[#17213f] transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Reply</span>
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            handleSave();
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            saved ? 'text-[#3f5ce8]' : 'text-[#737b8d] hover:bg-[#f7f7f8] hover:text-[#17213f]'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-[#3f5ce8]' : ''}`} />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </article>
  );
}
