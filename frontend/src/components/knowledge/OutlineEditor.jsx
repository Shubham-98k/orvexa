import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ListOrdered } from 'lucide-react';

export default function OutlineEditor({ outline = [], onUpdateOutline, onInsertHeadingFromOutline }) {
  const [newHeading, setNewHeading] = useState('');

  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newHeading.trim()) return;

    const newSec = {
      sectionId: `sec-${Date.now()}`,
      heading: newHeading.trim(),
      notes: 'Author custom section',
      suggestedFocus: 'Elaborate on this specific dimension.',
      mappedSourceIds: [],
      order: outline.length + 1,
    };

    onUpdateOutline([...outline, newSec]);
    setNewHeading('');
  };

  const handleDeleteSection = (index) => {
    const updated = outline.filter((_, i) => i !== index);
    onUpdateOutline(updated);
  };

  const handleMove = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= outline.length) return;
    const updated = [...outline];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onUpdateOutline(updated);
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-[#17213f] flex items-center gap-1.5 uppercase tracking-wider">
          <ListOrdered className="w-4 h-4 text-[#3f5ce8]" />
          <span>Article Outline ({outline.length})</span>
        </h4>
      </div>

      <div className="space-y-2">
        {outline.map((sec, idx) => (
          <div
            key={sec.sectionId || idx}
            className="p-3 bg-[#fcfcfd] border border-[#e9e9ed] rounded-xl text-xs space-y-1 hover:border-[#3f5ce8]/30 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-[#17213f] leading-snug">{sec.heading}</span>
              <div className="flex items-center gap-1 shrink-0 text-[#8b92a1]">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, -1)}
                  className="p-1 hover:bg-[#f0f0f2] rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === outline.length - 1}
                  onClick={() => handleMove(idx, 1)}
                  className="p-1 hover:bg-[#f0f0f2] rounded disabled:opacity-30 cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(idx)}
                  className="p-1 hover:text-[#bd625e] rounded cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {sec.notes && <p className="text-[11px] text-[#737b8d] leading-relaxed">{sec.notes}</p>}
            {onInsertHeadingFromOutline && (
              <button
                type="button"
                onClick={() => onInsertHeadingFromOutline(sec.heading)}
                className="text-[10px] font-bold text-[#3f5ce8] hover:underline cursor-pointer"
              >
                + Insert into draft body
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAddSection} className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          value={newHeading}
          onChange={(e) => setNewHeading(e.target.value)}
          placeholder="Add custom outline section..."
          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#e9e9ed] focus:outline-none focus:border-[#3f5ce8]"
        />
        <button
          type="submit"
          disabled={!newHeading.trim()}
          className="px-3 py-1.5 bg-[#3f5ce8] hover:bg-[#324ecc] text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
        >
          Add
        </button>
      </form>
    </div>
  );
}
