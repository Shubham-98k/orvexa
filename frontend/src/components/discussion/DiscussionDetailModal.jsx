import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Bot } from 'lucide-react';
import Avatar from '../common/Avatar';
import { apiGet, apiPost } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

export default function DiscussionDetailModal({ discussion, onClose, onOpenAiStudio }) {
  const { user } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputBody, setInputBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState(discussion.votes || 0);

  useEffect(() => {
    if (discussion?._id) {
      apiGet(`/discussions/${discussion._id}`)
        .then((res) => {
          if (res?.contributions) setContributions(res.contributions);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [discussion]);

  const handleUpvote = async () => {
    try {
      const res = await apiPost(`/discussions/${discussion._id}/upvote`, {});
      setVotes(res.votes);
    } catch {
      setVotes((prev) => prev + 1);
    }
  };

  const handleAddContribution = async (e) => {
    e.preventDefault();
    if (!inputBody.trim()) return;

    try {
      setSubmitting(true);
      const res = await apiPost(`/discussions/${discussion._id}/contributions`, {
        body: inputBody.trim(),
      });
      if (res?.contribution) {
        setContributions((prev) => [...prev, res.contribution]);
        setInputBody('');
      }
    } catch (err) {
      alert(err.message || 'Unable to post contribution.');
    } finally {
      setSubmitting(false);
    }
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
              {discussion.category || 'General'}
            </span>
            <span className="text-xs text-[#8b92a1]">● {discussion.status || 'open'}</span>
          </div>
          <button onClick={onClose} className="text-[#8b92a1] hover:text-[#17213f] p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#17213f] leading-snug">{discussion.title}</h2>
          <div className="flex items-center gap-2.5 mt-3 pt-2">
            <Avatar
              initials={discussion.authorInitials || 'OP'}
              color={discussion.authorColor || 'purple'}
              size="w-7 h-7 text-[10px]"
            />
            <span className="text-xs font-bold text-[#17213f]">{discussion.authorName}</span>
          </div>
          <p className="text-xs sm:text-sm text-[#4a5265] mt-3 leading-relaxed whitespace-pre-line bg-[#fafafb] p-4 rounded-2xl border border-[#f0f0f2]">
            {discussion.body}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[#f0f0f2]">
          <button
            onClick={handleUpvote}
            className="bg-[#fff0ee] hover:bg-[#fddedb] text-[#c65d59] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>↑ Upvote</span>
            <b>{votes}</b>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onOpenAiStudio) onOpenAiStudio(discussion);
            }}
            className="bg-[#8b63d9] hover:bg-[#7a52c7] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Create Knowledge from this discussion</span>
          </button>
        </div>

        {/* Contributions Thread */}
        <div className="space-y-3 pt-3 border-t border-[#f0f0f2]">
          <h4 className="text-xs font-bold text-[#17213f] uppercase tracking-wider">
            Contributions & Perspectives ({contributions.length})
          </h4>

          {loading ? (
            <div className="py-4 text-center text-xs text-[#8b92a1]">Loading contributions...</div>
          ) : contributions.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-xl">
              No contributions yet. Be the first to share a perspective!
            </div>
          ) : (
            contributions.map((c) => (
              <div key={c._id || c.id} className="border border-[#e9e9ed] rounded-xl p-3.5 bg-[#fcfcfd] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-[#17213f]">
                    <Avatar
                      initials={c.authorInitials || c.authorName?.slice(0, 2).toUpperCase() || 'OP'}
                      color={c.authorColor || 'blue'}
                      size="w-5 h-5 text-[9px]"
                    />
                    <span>{c.authorName}</span>
                  </div>
                  <span className="text-[10px] text-[#9298a7]">
                    {new Date(c.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[#38425b] leading-relaxed whitespace-pre-line">{c.body}</p>
              </div>
            ))
          )}

          {/* Contribution Composer */}
          <form onSubmit={handleAddContribution} className="pt-2 flex items-center gap-2">
            <input
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
    </div>
  );
}
