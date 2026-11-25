import React from 'react';
import { Bookmark, ArrowRight, Clock } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function KnowledgeCard({ article, onOpenReader }) {
  return (
    <article
      onClick={() => onOpenReader(article)}
      className="group rounded-3xl bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#3f5ce8]/40 dark:hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between gap-4 font-sans"
    >
      <div className="space-y-3">
        {/* Top badge row */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Knowledge
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{article.readTime || '5 min read'}</span>
          </div>
        </div>

        {/* Cover image if available */}
        {article.coverImage && (
          <div className="rounded-2xl overflow-hidden max-h-48 w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <h3 className="text-base sm:text-lg font-black text-[#17213f] dark:text-white group-hover:text-[#3f5ce8] dark:group-hover:text-blue-400 transition-colors leading-snug">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-xs text-[#55607a] dark:text-slate-400 leading-relaxed line-clamp-2">
            {article.summary}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-[#f0f0f2] dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Avatar
            initials={article.authorInitials || article.authorName?.slice(0, 2).toUpperCase() || 'OP'}
            color={article.authorColor || 'green'}
            size="w-6 h-6 text-[10px]"
          />
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
            {article.authorName || 'Orvexa Member'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenReader(article);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3f5ce8] dark:text-blue-400 hover:gap-1.5 transition-all cursor-pointer"
        >
          <span>Read more</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}
