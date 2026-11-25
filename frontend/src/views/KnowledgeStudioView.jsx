import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Check, AlertCircle, BookOpen, Layers, Sparkles, Send } from 'lucide-react';
import EditorBlock from '../components/knowledge/EditorBlock';
import EditorToolbar from '../components/knowledge/EditorToolbar';
import OutlineEditor from '../components/knowledge/OutlineEditor';
import SourceSelectionPanel from '../components/knowledge/SourceSelectionPanel';
import { apiGet, apiPost, apiPatch } from '../api/client';

const FORMATS = ['guide', 'explainer', 'research', 'perspective', 'notes', 'other'];
const CATEGORIES = ['Thinking', 'Culture', 'Technology', 'UX', 'Engineering', 'Learning', 'Work & Culture'];

export default function KnowledgeStudioView() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext?.() || { showToast: () => {} };

  const [draft, setDraft] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Autosave status: 'saved' | 'saving' | 'dirty' | 'error'
  const [saveStatus, setSaveStatus] = useState('saved');
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [sidePaneOpen, setSidePaneOpen] = useState(true);

  // Debounce timer reference
  const debounceTimerRef = useRef(null);

  // Fetch or create draft on mount
  useEffect(() => {
    if (!draftId) {
      // Create a new blank draft if none supplied
      apiPost('/knowledge/drafts', { title: 'Untitled Knowledge Article' })
        .then((res) => {
          if (res?.draft?._id) {
            navigate(`/knowledge/studio/${res.draft._id}`, { replace: true });
          }
        })
        .catch((err) => {
          alert('Failed to initialize draft: ' + err.message);
          navigate('/knowledge');
        });
      return;
    }

    setLoading(true);
    apiGet(`/knowledge/drafts/${draftId}`)
      .then((res) => {
        if (res?.draft) {
          setDraft(res.draft);
          setSnapshot(res.snapshot);
          setAnalysis(res.analysis);
        }
      })
      .catch((err) => {
        alert(err.message || 'Unable to open draft');
        navigate('/knowledge');
      })
      .finally(() => setLoading(false));
  }, [draftId, navigate]);

  // Autosave function
  const triggerAutosave = useCallback((draftData) => {
    if (!draftData?._id) return;
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await apiPatch(`/knowledge/drafts/${draftData._id}`, {
          title: draftData.title,
          subtitle: draftData.subtitle,
          summary: draftData.summary,
          format: draftData.format,
          category: draftData.category,
          topics: draftData.topics,
          body: draftData.body,
          outline: draftData.outline,
          sourceReferences: draftData.sourceReferences,
        });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 1200);
  }, []);

  // Block modification handlers
  const handleBlockContentChange = (id, newContent) => {
    setDraft((prev) => {
      const updatedBlocks = prev.body.map((b) => (b.id === id ? { ...b, content: newContent } : b));
      const nextDraft = { ...prev, body: updatedBlocks };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleBlockTypeChange = (id, newType) => {
    setDraft((prev) => {
      const updatedBlocks = prev.body.map((b) => (b.id === id ? { ...b, type: newType } : b));
      const nextDraft = { ...prev, body: updatedBlocks };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleMoveBlock = (index, dir) => {
    setDraft((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.body.length) return prev;
      const updatedBlocks = [...prev.body];
      const temp = updatedBlocks[index];
      updatedBlocks[index] = updatedBlocks[target];
      updatedBlocks[target] = temp;
      const nextDraft = { ...prev, body: updatedBlocks };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleDeleteBlock = (id) => {
    setDraft((prev) => {
      const updatedBlocks = prev.body.filter((b) => b.id !== id);
      const nextDraft = { ...prev, body: updatedBlocks };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleAddBlock = (type) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
      data: {},
    };
    setDraft((prev) => {
      const nextDraft = { ...prev, body: [...prev.body, newBlock] };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleInsertQuoteFromSource = ({ quoteText, authorName, sourceId, sourceType }) => {
    const quoteBlock = {
      id: `quote-${Date.now()}`,
      type: 'quote',
      content: quoteText,
      data: { authorName, sourceId, sourceType },
    };
    setDraft((prev) => {
      const sourceReferences = prev.sourceReferences || [];
      const updatedRefs = sourceReferences.some((r) => r.sourceId === sourceId)
        ? sourceReferences
        : [...sourceReferences, { sourceType, sourceId, authorName, quoteText, label: `Quote from ${authorName}` }];

      const nextDraft = {
        ...prev,
        body: [...prev.body, quoteBlock],
        sourceReferences: updatedRefs,
      };
      triggerAutosave(nextDraft);
      showToast?.(`Quote by ${authorName} inserted into draft`);
      return nextDraft;
    });
  };

  const handleInsertHeadingFromOutline = (heading) => {
    const headingBlock = {
      id: `heading-${Date.now()}`,
      type: 'heading2',
      content: heading,
      data: {},
    };
    setDraft((prev) => {
      const nextDraft = { ...prev, body: [...prev.body, headingBlock] };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleUpdateOutline = (newOutline) => {
    setDraft((prev) => {
      const nextDraft = { ...prev, outline: newOutline };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handlePublish = async () => {
    if (!draft.title?.trim() || draft.title === 'Untitled Knowledge Article') {
      alert('Please enter a clear title for your Knowledge article.');
      return;
    }
    if (!draft.body || draft.body.length === 0) {
      alert('Article content cannot be empty.');
      return;
    }

    try {
      setPublishing(true);
      const res = await apiPost(`/knowledge/drafts/${draft._id}/publish`, {});
      if (res?.article) {
        showToast?.('Knowledge article published successfully!');
        navigate(`/knowledge/${res.article._id}`);
      }
    } catch (err) {
      alert(err.message || 'Publishing failed. Please check your content.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-[#8b92a1]">
        Loading Knowledge Studio...
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="space-y-5 font-sans">
      {/* Top Studio Control Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 pb-3 pt-1 border-b border-[#f0f0f2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/knowledge')}
            className="p-2 rounded-xl border border-[#e9e9ed] text-[#737b8d] hover:bg-[#f7f7f8] cursor-pointer"
            title="Return to Knowledge"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#e66c68]">
                Knowledge Studio
              </span>
              <span className="text-xs text-[#8b92a1]">●</span>
              <span className="text-[11px] font-semibold text-[#8b92a1] flex items-center gap-1">
                {saveStatus === 'saving' && <span className="text-[#3f5ce8]">Saving changes...</span>}
                {saveStatus === 'saved' && <span className="text-[#3aa76d] flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                {saveStatus === 'error' && <span className="text-[#bd625e]">Autosave failed</span>}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#17213f] leading-tight line-clamp-1">
              {draft.title || 'Untitled Draft'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setSidePaneOpen((prev) => !prev)}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              sidePaneOpen ? 'bg-[#eef1ff] border-[#d6e2ff] text-[#3f5ce8]' : 'bg-white border-[#e9e9ed] text-[#737b8d]'
            }`}
            title="Toggle Outline & Sources Pane"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sources & Outline</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              previewMode ? 'bg-[#17213f] text-white border-[#17213f]' : 'bg-white border-[#e9e9ed] text-[#4a5265]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
          </button>

          <button
            type="button"
            disabled={publishing}
            onClick={handlePublish}
            className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish Article'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Body Column */}
        <div className={sidePaneOpen ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 max-w-4xl mx-auto space-y-4'}>
          {previewMode ? (
            /* Preview Mode */
            <div className="bg-white border border-[#e9e9ed] rounded-3xl p-6 sm:p-9 shadow-sm space-y-6">
              <div className="space-y-2 border-b border-[#f0f0f2] pb-5">
                <span className="bg-[#eef1ff] text-[#3f5ce8] px-2.5 py-0.5 rounded text-[10.5px] font-bold uppercase tracking-wider">
                  {draft.format || 'Guide'} · {draft.category}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-[#17213f] leading-tight">{draft.title}</h1>
                {draft.subtitle && <p className="text-sm font-semibold text-[#737b8d]">{draft.subtitle}</p>}
              </div>

              <div className="space-y-4 text-xs sm:text-[13.5px] text-[#2c3345] leading-relaxed">
                {(draft.body || []).map((b) => (
                  <div key={b.id}>
                    {b.type === 'heading1' && <h2 className="text-xl sm:text-2xl font-black text-[#17213f] pt-2">{b.content}</h2>}
                    {b.type === 'heading2' && <h3 className="text-lg sm:text-xl font-bold text-[#17213f] pt-2">{b.content}</h3>}
                    {b.type === 'heading3' && <h4 className="text-base font-bold text-[#17213f] pt-1">{b.content}</h4>}
                    {b.type === 'paragraph' && <p className="whitespace-pre-line">{b.content}</p>}
                    {b.type === 'quote' && (
                      <blockquote className="border-l-3 border-[#c65d59] pl-3 py-1 italic bg-[#fffaf9] rounded-r-xl text-[#553c39]">
                        "{b.content}"
                        {b.data?.authorName && <span className="block text-[10px] font-bold not-italic text-[#c65d59] mt-1">— {b.data.authorName}</span>}
                      </blockquote>
                    )}
                    {b.type === 'callout' && (
                      <div className="p-3 rounded-xl bg-[#f0f4ff] border border-[#d6e2ff] text-[#2a3f9d] font-medium">
                        {b.content}
                      </div>
                    )}
                    {b.type === 'code' && (
                      <pre className="p-3 rounded-xl bg-[#1c2333] text-[#eef2f9] font-mono text-xs overflow-x-auto">
                        {b.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Editing Canvas */
            <div className="space-y-4">
              {/* Title & Article Metadata card */}
              <div className="bg-white border border-[#e9e9ed] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
                <div>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setDraft((prev) => {
                        const next = { ...prev, title };
                        triggerAutosave(next);
                        return next;
                      });
                    }}
                    placeholder="Article Title..."
                    className="w-full text-xl sm:text-3xl font-black text-[#17213f] focus:outline-none border-none placeholder-[#b0b6c4]"
                  />
                  <input
                    type="text"
                    value={draft.subtitle || ''}
                    onChange={(e) => {
                      const subtitle = e.target.value;
                      setDraft((prev) => {
                        const next = { ...prev, subtitle };
                        triggerAutosave(next);
                        return next;
                      });
                    }}
                    placeholder="Add an editorial subtitle or summary hook..."
                    className="w-full text-xs sm:text-sm font-semibold text-[#737b8d] mt-2 focus:outline-none border-none placeholder-[#b0b6c4]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#f0f0f2]">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8b92a1] uppercase mb-1">Format</label>
                    <select
                      value={draft.format || 'guide'}
                      onChange={(e) => {
                        const format = e.target.value;
                        setDraft((prev) => {
                          const next = { ...prev, format };
                          triggerAutosave(next);
                          return next;
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#e9e9ed] text-xs font-semibold text-[#17213f] bg-white"
                    >
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8b92a1] uppercase mb-1">Category</label>
                    <select
                      value={draft.category || 'Thinking'}
                      onChange={(e) => {
                        const category = e.target.value;
                        setDraft((prev) => {
                          const next = { ...prev, category };
                          triggerAutosave(next);
                          return next;
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#e9e9ed] text-xs font-semibold text-[#17213f] bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#8b92a1] uppercase mb-1">Topics</label>
                    <input
                      type="text"
                      value={(draft.topics || []).join(', ')}
                      onChange={(e) => {
                        const topics = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                        setDraft((prev) => {
                          const next = { ...prev, topics };
                          triggerAutosave(next);
                          return next;
                        });
                      }}
                      placeholder="RemoteWork, UX"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#e9e9ed] text-xs font-semibold text-[#17213f]"
                    />
                  </div>
                </div>
              </div>

              {/* Block List */}
              <div className="space-y-3">
                {(draft.body || []).map((block, idx) => (
                  <EditorBlock
                    key={block.id}
                    block={block}
                    index={idx}
                    totalBlocks={draft.body.length}
                    onChangeContent={handleBlockContentChange}
                    onChangeType={handleBlockTypeChange}
                    onMoveUp={(index) => handleMoveBlock(index, -1)}
                    onMoveDown={(index) => handleMoveBlock(index, 1)}
                    onDelete={handleDeleteBlock}
                  />
                ))}
              </div>

              {/* Block Insertion Toolbar */}
              <EditorToolbar onAddBlock={handleAddBlock} />
            </div>
          )}
        </div>

        {/* Side Pane: Sources & Outline */}
        {sidePaneOpen && (
          <div className="lg:col-span-4 bg-white border border-[#e9e9ed] rounded-3xl p-5 shadow-xs space-y-6 sticky top-20 max-h-[85vh] overflow-y-auto">
            {/* Outline Editor */}
            <OutlineEditor
              outline={draft.outline || []}
              onUpdateOutline={handleUpdateOutline}
              onInsertHeadingFromOutline={handleInsertHeadingFromOutline}
            />

            {/* Source Selection & Provenance Panel */}
            <div className="border-t border-[#f0f0f2] pt-4">
              <SourceSelectionPanel
                snapshot={snapshot}
                analysis={analysis}
                onInsertQuote={handleInsertQuoteFromSource}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
