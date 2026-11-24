import React from 'react';
import Avatar from '../common/Avatar';

export default function KnowledgeCard({ article, onOpenReader }) {
  return (
    <article
      onClick={() => onOpenReader(article)}
      className="border border-[#e9e9ed] rounded-2xl bg-white p-5 shadow-2xs hover:border-[#dedee5] hover:shadow-xs transition-all cursor-pointer flex gap-4 items-start font-sans"
    >
      <div className="w-14 sm:w-16 aspect-square rounded-xl bg-gradient-to-br from-[#9aa9f1] to-[#526ce0] flex items-center justify-center text-white text-2xl font-bold shrink-0">
        ▤
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-[10.5px] font-bold text-[#727b8d]">
          <span className="bg-[#eef1ff] text-[#5369ce] px-2 py-0.5 rounded">
            {article.category || 'General'}
          </span>
          <span>{article.readTime || '5 min read'}</span>
          <span className="ml-auto text-[#8b92a1]">♥ {article.savesCount || 0} saves</span>
        </div>

        <h3 className="text-base font-bold text-[#17213f] hover:text-[#3f5ce8] transition-colors leading-snug">
          {article.title}
        </h3>
        <p className="text-xs text-[#737b8d] leading-relaxed line-clamp-2">
          {article.summary}
        </p>

        <div className="flex items-center gap-2 pt-1 text-[11px] text-[#798192]">
          <Avatar
            initials={article.authorInitials || article.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={article.authorColor || 'green'}
            size="w-5 h-5 text-[9px]"
          />
          <span className="font-semibold text-[#17213f]">{article.authorName}</span>
          <span>·</span>
          <span className="text-[#8b92a1]">{article.source || 'Independent article'}</span>
        </div>
      </div>
    </article>
  );
}
