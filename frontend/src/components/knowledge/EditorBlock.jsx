import { Trash2, ChevronUp, ChevronDown, Quote, Heading1, Heading2, Heading3, AlignLeft, Bookmark, AlertCircle, Code, Sparkles, Image, Upload } from 'lucide-react';

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph', icon: AlignLeft },
  { type: 'heading1', label: 'H1', icon: Heading1 },
  { type: 'heading2', label: 'H2', icon: Heading2 },
  { type: 'heading3', label: 'H3', icon: Heading3 },
  { type: 'quote', label: 'Quote', icon: Quote },
  { type: 'callout', label: 'Callout', icon: AlertCircle },
  { type: 'sourceCitation', label: 'Citation', icon: Bookmark },
  { type: 'code', label: 'Code', icon: Code },
  { type: 'image', label: 'Image', icon: Image },
];

export default function EditorBlock({
  block,
  index,
  totalBlocks,
  onChangeContent,
  onChangeBlockData,
  onChangeType,
  onMoveUp,
  onMoveDown,
  onDelete,
  selectedText,
  onSelectionChange,
  onRewriteSelection,
  onUploadImage,
}) {
  const handleSelection = (event) => {
    const { selectionStart, selectionEnd, value } = event.currentTarget;
    if (selectionEnd > selectionStart) {
      onSelectionChange?.({
        blockId: block.id,
        selectedText: value.slice(selectionStart, selectionEnd),
      });
    } else {
      onSelectionChange?.(null);
    }
  };
  const selectionProps = { onSelect: handleSelection };

  return (
    <div id={`editor-block-${block.id}`} className="group relative border border-transparent hover:border-[#e9e9ed] focus-within:border-[#3f5ce8]/40 rounded-2xl p-3 bg-white hover:bg-[#fafafc] transition-all">
      {/* Floating block control toolbar on hover / focus */}
      <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-between pb-2 mb-1 border-b border-[#f0f0f4] text-xs">
        <div className="flex items-center gap-1">
          <select
            value={block.type}
            onChange={(e) => onChangeType(block.id, e.target.value)}
            className="px-2 py-1 rounded-lg border border-[#e9e9ed] bg-white text-[11px] font-semibold text-[#17213f] focus:outline-none"
          >
            {BLOCK_TYPES.map(({ type, label }) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          {block.data?.sourceLabel && (
            <span className="text-[10px] font-bold text-[#c65d59] bg-[#fff0ee] px-2 py-0.5 rounded">
              {block.data.sourceLabel}
            </span>
          )}
          {selectedText?.blockId === block.id && onRewriteSelection && (
            <button
              type="button"
              onClick={() => onRewriteSelection(selectedText)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#eef1ff] text-[#3f5ce8] text-[10px] font-bold"
            >
              <Sparkles className="w-3 h-3" /> Rewrite selection
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-[#737b8d]">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            className="p-1 rounded hover:bg-[#f0f0f2] disabled:opacity-30 cursor-pointer"
            title="Move Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalBlocks - 1}
            onClick={() => onMoveDown(index)}
            className="p-1 rounded hover:bg-[#f0f0f2] disabled:opacity-30 cursor-pointer"
            title="Move Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(block.id)}
            className="p-1 rounded hover:bg-[#fff0ee] hover:text-[#bd625e] cursor-pointer"
            title="Delete Block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Block Body Inputs */}
      {block.type === 'heading1' && (
        <input
          {...selectionProps}
          type="text"
          value={block.content}
          onChange={(e) => onChangeContent(block.id, e.target.value)}
          placeholder="Heading 1..."
          className="w-full text-xl sm:text-2xl font-black text-[#17213f] bg-transparent focus:outline-none border-none placeholder-[#b0b6c4]"
        />
      )}

      {block.type === 'heading2' && (
        <input
          {...selectionProps}
          type="text"
          value={block.content}
          onChange={(e) => onChangeContent(block.id, e.target.value)}
          placeholder="Heading 2..."
          className="w-full text-lg sm:text-xl font-extrabold text-[#17213f] bg-transparent focus:outline-none border-none placeholder-[#b0b6c4]"
        />
      )}

      {block.type === 'heading3' && (
        <input
          {...selectionProps}
          type="text"
          value={block.content}
          onChange={(e) => onChangeContent(block.id, e.target.value)}
          placeholder="Heading 3..."
          className="w-full text-base font-bold text-[#17213f] bg-transparent focus:outline-none border-none placeholder-[#b0b6c4]"
        />
      )}

      {block.type === 'paragraph' && (
        <textarea
          {...selectionProps}
          rows={3}
          value={block.content}
          onChange={(e) => onChangeContent(block.id, e.target.value)}
          placeholder="Write paragraph content..."
          className="w-full text-xs sm:text-[13.5px] text-[#2c3345] leading-relaxed bg-transparent focus:outline-none border-none resize-none placeholder-[#b0b6c4]"
        />
      )}

      {block.type === 'quote' && (
        <div className="border-l-3 border-[#c65d59] pl-3 py-1 bg-[#fffaf9] rounded-r-xl">
          <textarea
            {...selectionProps}
            rows={2}
            value={block.content}
            onChange={(e) => onChangeContent(block.id, e.target.value)}
            placeholder="Quote content..."
            className="w-full italic text-xs sm:text-[13px] text-[#553c39] bg-transparent focus:outline-none border-none resize-none"
          />
          {block.data?.authorName && (
            <div className="text-[10px] font-bold text-[#bd625e] mt-1">
              — {block.data.authorName}
            </div>
          )}
        </div>
      )}

      {block.type === 'callout' && (
        <div className="bg-[#f0f4ff] border border-[#d6e2ff] p-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#3f5ce8] shrink-0 mt-0.5" />
          <textarea
            {...selectionProps}
            rows={2}
            value={block.content}
            onChange={(e) => onChangeContent(block.id, e.target.value)}
            placeholder="Important takeaway, framework note, or caveat..."
            className="w-full text-xs text-[#2a3f9d] bg-transparent focus:outline-none border-none resize-none font-medium"
          />
        </div>
      )}

      {block.type === 'sourceCitation' && (
        <div className="bg-[#fbfbfd] border border-[#e8eaef] p-3 rounded-xl space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#737b8d] flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-[#3f5ce8]" />
            <span>Community Citation / Evidence</span>
          </div>
          <textarea
            {...selectionProps}
            rows={2}
            value={block.content}
            onChange={(e) => onChangeContent(block.id, e.target.value)}
            placeholder="Citation reference text..."
            className="w-full text-xs text-[#38425b] bg-transparent focus:outline-none border-none resize-none"
          />
        </div>
      )}

      {block.type === 'code' && (
        <div className="bg-[#1c2333] text-[#eef2f9] p-3 rounded-xl font-mono text-xs">
          <textarea
            {...selectionProps}
            rows={3}
            value={block.content}
            onChange={(e) => onChangeContent(block.id, e.target.value)}
            placeholder="// Add code snippet or pseudo-workflow..."
            className="w-full bg-transparent focus:outline-none border-none resize-none font-mono text-xs text-[#eef2f9]"
          />
        </div>
      )}

      {block.type === 'image' && (
        <figure className="space-y-2">
          {block.content ? (
            <img
              src={block.content}
              alt={block.data?.caption || ''}
              className="max-h-[32rem] w-full rounded-xl object-contain"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[#d6dbe6] p-8 text-center text-xs text-[#737b8d]">
              Choose a photo to add it to your article.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onUploadImage?.(block.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9e9ed] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a5265] hover:bg-[#f7f7f8]"
            >
              <Upload className="h-3.5 w-3.5" />
              {block.content ? 'Replace image' : 'Upload image'}
            </button>
            <input
              type="text"
              value={block.data?.caption || ''}
              onChange={(event) => onChangeBlockData?.(block.id, { caption: event.target.value })}
              placeholder="Optional image caption"
              aria-label="Image caption"
              className="min-w-0 flex-1 rounded-lg border border-[#e9e9ed] px-2.5 py-1.5 text-xs text-[#4a5265]"
            />
          </div>
        </figure>
      )}
    </div>
  );
}
