import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { apiGet } from '../api/client';

export default function LibraryView() {
  const { showToast } = useOutletContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/library')
      .then((res) => setItems(res?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#f0f0f2]">
        <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
          PERSONAL SPACE
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight">
          Your Library
        </h1>
        <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
          Everything you have saved, followed, or want to return to later.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#8b92a1]">Loading saved items...</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-2">
          <Bookmark className="w-8 h-8 text-[#8b92a1] mx-auto opacity-50" />
          <p className="font-semibold text-[#17213f]">Your library is empty.</p>
          <p>Click "Save" on any post, discussion or knowledge resource to collect it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item._id}
              className="border border-[#e9e9ed] rounded-2xl p-4 bg-white flex items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f5ce8] bg-[#eef1ff] px-2 py-0.5 rounded">
                  {item.itemType}
                </span>
                <h4 className="text-sm font-bold text-[#17213f] truncate">{item.title}</h4>
                <div className="text-xs text-[#737b8d]">By {item.author || 'Author'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
