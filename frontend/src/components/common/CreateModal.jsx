import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiPost } from '../../api/client';

export const CATEGORIES = ['Culture', 'Technology', 'UX', 'Engineering', 'Learning', 'Work & Culture', 'Thinking'];

export default function CreateModal({ isOpen, onClose, onItemCreated, defaultType = 'Post' }) {
  const [contentType, setContentType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Culture');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Content is required.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);

      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));

      if (contentType === 'Post') {
        const res = await apiPost('/posts', {
          title: title.trim(),
          body: body.trim(),
          tags: parsedTags.length > 0 ? parsedTags : ['#OrvexaCommunity'],
        });
        if (onItemCreated) onItemCreated(res.post, 'Post');
      } else if (contentType === 'Discussion') {
        if (!title.trim()) {
          setError('Discussions require a title.');
          setSubmitting(false);
          return;
        }
        const res = await apiPost('/discussions', {
          title: title.trim(),
          body: body.trim(),
          category,
          tags: parsedTags,
        });
        if (onItemCreated) onItemCreated(res.discussion, 'Discussion');
      } else if (contentType === 'Knowledge article') {
        if (!title.trim()) {
          setError('Knowledge articles require a title.');
          setSubmitting(false);
          return;
        }
        const res = await apiPost('/knowledge', {
          title: title.trim(),
          summary: body.trim().slice(0, 160),
          content: body.trim(),
          category,
          readTime: '5 min read',
        });
        if (onItemCreated) onItemCreated(res.article, 'Knowledge');
      } else if (contentType === 'Circle') {
        if (!title.trim()) {
          setError('Circle name is required.');
          setSubmitting(false);
          return;
        }
        const res = await apiPost('/circles', {
          name: title.trim(),
          description: body.trim(),
          category,
        });
        if (onItemCreated) onItemCreated(res.circle, 'Circle');
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to publish.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-[#e9e9ed] space-y-4 font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f2]">
          <h2 className="text-base font-bold text-[#17213f]">Create on Orvexa</h2>
          <button
            onClick={onClose}
            className="text-[#8b92a1] hover:text-[#17213f] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#fff0ee] text-[#bd625e] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] focus:outline-none focus:border-[#3f5ce8]"
            >
              <option value="Post">Post (everyday update or observation)</option>
              <option value="Discussion">Discussion (dedicated exploratory thread)</option>
              <option value="Knowledge article">Knowledge article (durable guide or resource)</option>
              <option value="Circle">Circle (community space)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1">
              {contentType === 'Circle' ? 'Circle Name' : 'Title (optional for Posts, required for Discussions & Knowledge)'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={contentType === 'Circle' ? 'e.g. Design Thinkers' : 'Give it a clear title...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1">
              {contentType === 'Circle' ? 'Description' : 'Content & Context'}
            </label>
            <textarea
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What perspective would you like to share?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="FutureOfWork, UX"
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#737b8d] hover:bg-[#f7f7f8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
