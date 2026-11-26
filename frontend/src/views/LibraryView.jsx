import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bookmark, ExternalLink, X } from 'lucide-react';
import { apiGet, apiPost } from '../api/client';
import DiscussionDetailModal from '../components/discussion/DiscussionDetailModal';
import PostDetailModal from '../components/discover/PostDetailModal';

export default function LibraryView() {
  const { showToast } = useOutletContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Saved');
  const [activePost, setActivePost] = useState(null);
  const [activeDiscussion, setActiveDiscussion] = useState(null);
  const [activeKnowledge, setActiveKnowledge] = useState(null);

  useEffect(() => {
    apiGet('/library')
      .then((res) => setItems(res?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = activeTab === 'Saved'
    ? items
    : items.filter((item) => item.itemType === activeTab);

  const openItem = async (item) => {
    if (item.itemType === 'post') {
      try {
        const res = await apiGet(`/posts/${item.itemId}`);
        setActivePost(res.post);
      } catch (err) {
        showToast(err.message || 'Unable to open this post');
      }
    } else if (item.itemType === 'discussion') {
      setActiveDiscussion(item.content);
    } else if (item.itemType === 'knowledge') {
      setActiveKnowledge(item.content);
    }
  };

  const removeSaved = async (item) => {
    try {
      if (item.itemType === 'post') {
        await apiPost(`/posts/${item.itemId}/save`, {});
      } else if (item.itemType === 'knowledge') {
        await apiPost(`/knowledge/${item.itemId}/save`, {});
      }
      setItems((current) => current.filter((saved) => saved._id !== item._id));
      showToast('Removed from Saved');
    } catch (err) {
      showToast(err.message || 'Unable to remove saved item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#f0f0f2] dark:border-slate-800">
        <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
          PERSONAL SPACE
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] dark:text-white leading-tight">
          Your Library
        </h1>
        <p className="text-xs sm:text-[13.5px] text-[#737b8d] dark:text-slate-400 mt-1">
          Everything you have saved, followed, or want to return to later.
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto">
        {[
          ['Saved', 'All'],
          ['post', 'Posts'],
          ['discussion', 'Discussions'],
          ['knowledge', 'Knowledge'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === value
                ? 'bg-[#17213f] dark:bg-blue-600 text-white'
                : 'bg-[#f7f7f8] dark:bg-slate-800 text-[#737b8d] dark:text-slate-300 hover:text-[#17213f] dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#8b92a1]">Loading saved items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#8b92a1] dark:text-slate-400 border border-dashed border-[#e9e9ed] dark:border-slate-700 rounded-2xl space-y-2">
          <Bookmark className="w-8 h-8 text-[#8b92a1] dark:text-slate-500 mx-auto opacity-50" />
          <p className="font-semibold text-[#17213f] dark:text-white">Your library is empty.</p>
          <p>Click "Save" on any post, discussion or knowledge resource to collect it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              onClick={() => openItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openItem(item);
                }
              }}
              className="w-full cursor-pointer text-left border border-[#e9e9ed] dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shadow-2xs hover:border-[#d8dae3] dark:hover:border-slate-700 hover:shadow-xs transition-all"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f5ce8] dark:text-blue-300 bg-[#eef1ff] dark:bg-blue-950/40 px-2 py-0.5 rounded">
                  {item.itemType}
                </span>
                <h4 className="text-sm font-bold text-[#17213f] dark:text-white truncate mt-1">{item.title}</h4>
                <div className="text-xs text-[#737b8d] dark:text-slate-400">By {item.author || 'Author'}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSaved(item);
                  }}
                  className="p-2 rounded-lg text-[#737b8d] dark:text-slate-400 hover:bg-[#fff0ee] dark:hover:bg-red-950/40 hover:text-[#d56560] dark:hover:text-red-300"
                  title="Remove from saved"
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
                <ExternalLink className="w-4 h-4 text-[#3f5ce8]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {activePost && (
        <PostDetailModal
          post={activePost}
          onClose={() => setActivePost(null)}
          onPostUpdated={(updatedPost) => setActivePost(updatedPost)}
        />
      )}

      {activeDiscussion && (
        <DiscussionDetailModal
          discussion={activeDiscussion}
          onClose={() => setActiveDiscussion(null)}
          onDiscussionUpdate={(updated) => setActiveDiscussion(updated)}
        />
      )}

      {activeKnowledge && (
        <div
          onClick={(event) => event.target === event.currentTarget && setActiveKnowledge(null)}
          className="fixed inset-0 bg-[#17213f]/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <article className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl p-6 sm:p-7 w-full max-w-3xl max-h-[88vh] overflow-y-auto shadow-2xl border border-[#e9e9ed] dark:border-slate-800 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#f0f0f2] dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-[#5369ce] bg-[#eef1ff] px-2.5 py-0.5 rounded">{activeKnowledge.category || 'Knowledge'}</span>
              <button type="button" onClick={() => setActiveKnowledge(null)} className="p-1 text-[#737b8d] dark:text-slate-400 hover:text-[#17213f] dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#17213f] dark:text-white">{activeKnowledge.title}</h2>
            <div className="text-xs text-[#737b8d] dark:text-slate-400">By {activeKnowledge.authorName}</div>
            <div className="text-sm text-[#38425b] dark:text-slate-300 leading-relaxed whitespace-pre-line bg-[#fafafb] dark:bg-slate-800/60 p-5 rounded-2xl border border-[#f0f0f2] dark:border-slate-800">
              {activeKnowledge.content || activeKnowledge.summary || activeKnowledge.body || activeKnowledge.excerpt}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
