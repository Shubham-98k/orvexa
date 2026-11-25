import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Bookmark } from 'lucide-react';
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
      className="group rounded-3xl bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#3f5ce8]/40 dark:hover:border-blue-500/40 transition-all space-y-3 font-sans cursor-pointer flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top badge & author */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Post
          </span>
          <div className="text-[10.5px] text-slate-400">
            {new Date(post.createdAt || Date.now()).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Post Image thumbnail if present */}
        {post.imageUrl && (
          <div className="rounded-2xl overflow-hidden max-h-48 w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={post.imageUrl}
              alt={post.title || 'Post image'}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {post.title && (
          <h3 className="text-base sm:text-lg font-black text-[#17213f] dark:text-white group-hover:text-[#3f5ce8] dark:group-hover:text-blue-400 transition-colors leading-snug">
            {post.title}
          </h3>
        )}

        <p className="text-xs sm:text-[13px] text-[#38425b] dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
          {post.body}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-[#bd625e] bg-[#fff0ee] dark:bg-red-950/30 dark:text-red-300 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#f0f0f2] dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Avatar
            initials={post.authorInitials || post.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={post.authorColor || 'purple'}
            size="w-6 h-6 text-[10px]"
          />
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
            {post.authorName || 'Orvexa Member'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-[11px]">{likes}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.(post, true);
            }}
            className="flex items-center gap-1 hover:text-[#3f5ce8] transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px]">{post.commentCount || 0}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
