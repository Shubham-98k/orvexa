import { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Heading2,
  Type,
  Quote,
  List,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit3,
  Upload,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import { apiPost } from '../../api/client';
import { compressImageFile } from '../../utils/imageUpload';

const CATEGORIES = [
  'Culture',
  'Technology',
  'UX',
  'Engineering',
  'Learning',
  'Work & Culture',
  'Thinking',
];

const CIRCLE_CATEGORIES = [
  'Technology',
  'Business',
  'Education',
  'Science',
  'Health and Fitness',
  'Arts and Creativity',
  'Books and Literature',
  'Personal Finance',
  'Lifestyle',
  'Gaming',
  'Travel',
  'Community',
  'Other',
];

const SAMPLE_PRESET_IMAGES = [
  {
    label: 'Books & Desk',
    url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Headphones & Focus',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Reading & Coffee',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Modern Office',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Creative Lightbulb',
    url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Architecture & Ideas',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  },
];

let blockCounter = 1;
function createBlock(type = 'paragraph', value = '') {
  return {
    id: `blk-${Date.now()}-${blockCounter++}`,
    type,
    value,
    caption: '',
  };
}

export default function CreateModal({ isOpen, onClose, onItemCreated, defaultType = 'Post', defaultCircleId = null }) {
  const [contentType, setContentType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultType === 'Circle' ? 'Other' : 'Culture');
  const [tags, setTags] = useState('');
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [circleVisibility, setCircleVisibility] = useState('public');
  const [joinPolicy, setJoinPolicy] = useState('open');
  const [circleAvatar, setCircleAvatar] = useState('');
  const [circleCoverImage, setCircleCoverImage] = useState('');

  // Structured blocks state
  const [blocks, setBlocks] = useState([
    createBlock('paragraph', ''),
  ]);

  const fileInputRef = useRef(null);
  const [targetBlockIdForUpload, setTargetBlockIdForUpload] = useState(null);

  if (!isOpen) return null;

  // Block management
  const addBlock = (type) => {
    const newBlk = createBlock(type, '');
    setBlocks((prev) => [...prev, newBlk]);
  };

  const updateBlock = (id, updates) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const removeBlock = (id) => {
    if (blocks.length <= 1) {
      setBlocks([createBlock('paragraph', '')]);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    setBlocks((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // Image Upload helper
  const handleTriggerUpload = (blockId) => {
    setTargetBlockIdForUpload(blockId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await compressImageFile(file);
      if (targetBlockIdForUpload) {
        updateBlock(targetBlockIdForUpload, { value: dataUrl });
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to process this image.');
    }
  };

  const handleCircleImageChange = async (event, setImage, maxDimension) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setImage(await compressImageFile(file, { maxDimension }));
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to process this image.');
    }
  };

  // Serialize blocks into markdown body & find primary image
  const serializeContent = () => {
    let primaryImageUrl = '';
    const parts = [];

    for (const b of blocks) {
      if (b.type === 'heading') {
        if (b.value.trim()) parts.push(`## ${b.value.trim()}`);
      } else if (b.type === 'quote') {
        if (b.value.trim()) parts.push(`> ${b.value.trim()}`);
      } else if (b.type === 'list') {
        const lines = b.value.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          parts.push(lines.map((l) => (l.startsWith('-') ? l : `- ${l}`)).join('\n'));
        }
      } else if (b.type === 'image') {
        if (b.value.trim()) {
          if (!primaryImageUrl) primaryImageUrl = b.value.trim();
          parts.push(`![${b.caption || 'Image'}](${b.value.trim()})`);
        }
      } else {
        if (b.value.trim()) parts.push(b.value.trim());
      }
    }

    const fullBody = parts.join('\n\n');
    return { fullBody, primaryImageUrl };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (contentType === 'Knowledge article') {
      setError('Create or edit Knowledge articles in Knowledge Studio.');
      return;
    }
    const { fullBody, primaryImageUrl } = serializeContent();

    if (!fullBody && contentType !== 'Circle') {
      setError('Please add some content to your blocks.');
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
          body: fullBody,
          imageUrl: primaryImageUrl || undefined,
          tags: parsedTags.length > 0 ? parsedTags : ['#OrvexaCommunity'],
          ...(defaultCircleId ? { circleId: defaultCircleId, visibility: 'circle' } : {}),
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
          body: fullBody,
          imageUrl: primaryImageUrl || undefined,
          category,
          tags: parsedTags,
          ...(defaultCircleId ? { circleId: defaultCircleId, visibility: 'circle' } : {}),
        });
        if (onItemCreated) onItemCreated(res.discussion, 'Discussion');
      } else if (contentType === 'Circle') {
        if (!title.trim()) {
          setError('Circle name is required.');
          setSubmitting(false);
          return;
        }
        const res = await apiPost('/circles', {
          name: title.trim(),
          description: fullBody || 'Community circle on Orvexa',
          category,
          visibility: circleVisibility,
          joinPolicy,
          avatar: circleAvatar,
          coverImage: circleCoverImage,
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
      className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200 font-sans"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-5 sm:p-7 w-full max-w-2xl shadow-2xl border border-[#e9e9ed] dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f2] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e66c68]" />
            <h2 className="text-base font-bold text-[#17213f] dark:text-white">Create on Orvexa</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit / Preview toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  mode === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  mode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-[#8b92a1] hover:text-[#17213f] dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#fff0ee] dark:bg-red-950/40 text-[#bd625e] dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Type Selector */}
          <div>
            <label className="block text-xs font-bold text-[#17213f] dark:text-slate-200 mb-1.5">
              Content Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'Post', label: 'Post', sub: 'Everyday update' },
                { type: 'Discussion', label: 'Discussion', sub: 'Collaborative thread' },
                { type: 'Circle', label: 'Circle', sub: 'Community' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    setContentType(opt.type);
                    setCategory(opt.type === 'Circle' ? 'Other' : 'Culture');
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    contentType === opt.type
                      ? 'bg-[#3f5ce8]/10 dark:bg-[#3f5ce8]/20 border-[#3f5ce8] text-[#3f5ce8] dark:text-indigo-400 font-bold shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#17213f] dark:text-slate-200 mb-1">
              {contentType === 'Circle'
                ? 'Circle Name'
                : contentType === 'Post'
                ? 'Title (optional for everyday posts)'
                : 'Title *'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                contentType === 'Circle'
                  ? 'e.g. Design Thinkers'
                  : 'Give it a clear, compelling title...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-[#17213f] dark:text-white placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8]"
            />
          </div>

          {/* BLOCK EDITOR VIEW */}
          {mode === 'edit' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17213f] dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#3f5ce8]" />
                  <span>Content Blocks</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
                </span>
              </div>

              {/* Block List */}
              <div className="space-y-2.5">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors space-y-2 group"
                  >
                    {/* Block Toolbar Header */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-bold">
                        {block.type === 'heading' && <Heading2 className="w-3.5 h-3.5 text-indigo-500" />}
                        {block.type === 'paragraph' && <Type className="w-3.5 h-3.5 text-slate-500" />}
                        {block.type === 'quote' && <Quote className="w-3.5 h-3.5 text-amber-500" />}
                        {block.type === 'list' && <List className="w-3.5 h-3.5 text-emerald-500" />}
                        {block.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-rose-500" />}
                        <span className="capitalize">{block.type}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveBlock(index, -1)}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(index, 1)}
                          disabled={index === blocks.length - 1}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="Delete Block"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Block Input Content */}
                    {block.type === 'heading' && (
                      <input
                        type="text"
                        value={block.value}
                        onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                        placeholder="Subheading..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3f5ce8]"
                      />
                    )}

                    {block.type === 'paragraph' && (
                      <textarea
                        rows={3}
                        value={block.value}
                        onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                        placeholder="Write your thoughts, observations or details here..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3f5ce8] resize-none leading-relaxed"
                      />
                    )}

                    {block.type === 'quote' && (
                      <textarea
                        rows={2}
                        value={block.value}
                        onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                        placeholder="Quote, takeaway, or key highlight..."
                        className="w-full px-3 py-2 rounded-xl border-l-4 border-amber-500 border-t border-r border-b border-slate-300 dark:border-slate-600 bg-amber-50/50 dark:bg-amber-950/20 text-xs sm:text-sm italic text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
                      />
                    )}

                    {block.type === 'list' && (
                      <div>
                        <textarea
                          rows={3}
                          value={block.value}
                          onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                          placeholder="Item one&#10;Item two&#10;Item three"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3f5ce8] resize-none leading-relaxed font-mono"
                        />
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Each line will become a bullet point.
                        </div>
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="space-y-2">
                        {/* URL or Upload */}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={block.value}
                            onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                            placeholder="Paste image URL (https://...)"
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3f5ce8]"
                          />
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(block.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                          </button>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
                          {SAMPLE_PRESET_IMAGES.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => updateBlock(block.id, { value: preset.url })}
                              className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                                block.value === preset.url
                                  ? 'bg-[#3f5ce8] text-white border-[#3f5ce8]'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Image Preview & Caption */}
                        {block.value && (
                          <div className="space-y-1.5 pt-1">
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-44 bg-slate-100 dark:bg-slate-800">
                              <img
                                src={block.value}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <input
                              type="text"
                              value={block.caption || ''}
                              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                              placeholder="Photo caption (optional)..."
                              className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Block Addition Toolbar */}
              <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                  Add Block:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addBlock('paragraph')}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Type className="w-3 h-3 text-slate-500" />
                    <span>Paragraph</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addBlock('heading')}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Heading2 className="w-3 h-3 text-indigo-500" />
                    <span>Heading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addBlock('quote')}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Quote className="w-3 h-3 text-amber-500" />
                    <span>Quote</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addBlock('list')}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <List className="w-3 h-3 text-emerald-500" />
                    <span>List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addBlock('image')}
                    className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <ImageIcon className="w-3 h-3 text-rose-600" />
                    <span>+ Photo</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW VIEW */
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3 min-h-[220px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Live Preview
              </div>
              {title && (
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h2>
              )}

              <div className="space-y-3">
                {blocks.map((b) => {
                  if (b.type === 'heading' && b.value) {
                    return (
                      <h3
                        key={b.id}
                        className="text-sm font-bold text-slate-800 dark:text-slate-200 pt-1"
                      >
                        {b.value}
                      </h3>
                    );
                  }
                  if (b.type === 'quote' && b.value) {
                    return (
                      <blockquote
                        key={b.id}
                        className="pl-3 border-l-4 border-amber-500 text-xs italic text-slate-700 dark:text-slate-300 py-0.5"
                      >
                        {b.value}
                      </blockquote>
                    );
                  }
                  if (b.type === 'list' && b.value) {
                    const items = b.value.split('\n').filter(Boolean);
                    return (
                      <ul
                        key={b.id}
                        className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1"
                      >
                        {items.map((it, i) => (
                          <li key={i}>{it.replace(/^-\s*/, '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (b.type === 'image' && b.value) {
                    return (
                      <div key={b.id} className="space-y-1">
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-60 bg-black/5">
                          <img
                            src={b.value}
                            alt={b.caption || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {b.caption && (
                          <p className="text-[11px] text-slate-500 italic text-center">
                            {b.caption}
                          </p>
                        )}
                      </div>
                    );
                  }
                  if (b.type === 'paragraph' && b.value) {
                    return (
                      <p
                        key={b.id}
                        className="text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
                      >
                        {b.value}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {contentType === 'Circle' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CircleImageUpload
                  label="Circle avatar"
                  image={circleAvatar}
                  onChange={(event) => handleCircleImageChange(event, setCircleAvatar, 512)}
                  onRemove={() => setCircleAvatar('')}
                  shape="avatar"
                />
                <CircleImageUpload
                  label="Cover image"
                  image={circleCoverImage}
                  onChange={(event) => handleCircleImageChange(event, setCircleCoverImage, 1600)}
                  onRemove={() => setCircleCoverImage('')}
                  shape="cover"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-[#17213f] dark:text-slate-200">
                  Visibility
                  <select
                    value={circleVisibility}
                    onChange={(e) => setCircleVisibility(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-[#17213f] dark:text-white"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[#17213f] dark:text-slate-200">
                  Joining policy
                  <select
                    value={joinPolicy}
                    onChange={(e) => setJoinPolicy(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal text-[#17213f] dark:text-white"
                  >
                    <option value="open">Anyone can join</option>
                    <option value="approval_required">Request to join</option>
                    <option value="invite_only">Invite only</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Category & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className={contentType === 'Circle' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-bold text-[#17213f] dark:text-slate-200 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#17213f] dark:text-white focus:outline-none"
              >
                {(contentType === 'Circle' ? CIRCLE_CATEGORIES : CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17213f] dark:text-slate-200 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Productivity, UX, Design"
                className="w-full px-3 py-2 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#17213f] dark:text-white placeholder-[#8b92a1] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f2] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#737b8d] dark:text-slate-400 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitting ? 'Publishing...' : 'Publish'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CircleImageUpload({ label, image, onChange, onRemove, shape }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <label className="block text-xs font-bold text-[#17213f] dark:text-slate-200">
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold dark:text-slate-300 dark:file:bg-slate-800"
        />
      </label>
      {image ? (
        <div className="mt-3 flex items-center gap-3">
          <img
            src={image}
            alt={`${label} preview`}
            className={shape === 'avatar' ? 'h-14 w-14 rounded-xl object-cover' : 'h-14 w-28 rounded-xl object-cover'}
          />
          <button type="button" onClick={onRemove} className="text-xs font-bold text-red-600 dark:text-red-400">Remove</button>
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Optional · JPG, PNG, or WebP</p>
      )}
    </div>
  );
}
