import React from 'react';
import { Plus, Heading1, Heading2, AlignLeft, Quote, AlertCircle, Bookmark, Code } from 'lucide-react';

export default function EditorToolbar({ onAddBlock }) {
  const tools = [
    { type: 'paragraph', label: '+ Paragraph', icon: AlignLeft },
    { type: 'heading2', label: '+ Section Heading', icon: Heading2 },
    { type: 'quote', label: '+ Quote', icon: Quote },
    { type: 'callout', label: '+ Callout', icon: AlertCircle },
    { type: 'sourceCitation', label: '+ Citation', icon: Bookmark },
    { type: 'code', label: '+ Code', icon: Code },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#f8f9fa] border border-[#e9e9ed] rounded-2xl">
      <span className="text-[10px] font-bold uppercase text-[#8b92a1] px-2">Add Content</span>
      {tools.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAddBlock(type)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#eef1ff] hover:text-[#3f5ce8] text-[#4a5265] text-xs font-semibold border border-[#e9e9ed] shadow-2xs transition-colors cursor-pointer"
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
