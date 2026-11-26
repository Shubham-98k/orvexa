import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Check, Layers, Sparkles, Send, Trash2, X, MessageCircle, ClipboardCheck } from 'lucide-react';
import EditorBlock from '../components/knowledge/EditorBlock';
import EditorToolbar from '../components/knowledge/EditorToolbar';
import OutlineEditor from '../components/knowledge/OutlineEditor';
import SourceSelectionPanel from '../components/knowledge/SourceSelectionPanel';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client';
import { compressImageFile } from '../utils/imageUpload';

const FORMATS = ['guide', 'explainer', 'research', 'perspective', 'synthesis', 'freeform', 'notes', 'other'];
const CATEGORIES = ['Thinking', 'Culture', 'Technology', 'UX', 'Engineering', 'Learning', 'Work & Culture'];
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function KnowledgeStudioView() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCircleId = searchParams.get('circleId');
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
  const [sideTab, setSideTab] = useState('outline');
  const [aiStatus, setAIStatus] = useState(null);
  const [aiBusy, setAIBusy] = useState('');
  const [aiError, setAIError] = useState('');
  const [proposal, setProposal] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [reviewSuggestions, setReviewSuggestions] = useState([]);
  const [saveError, setSaveError] = useState('');
  const [refreshingSources, setRefreshingSources] = useState(false);

  const debounceTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const latestDraftRef = useRef(null);
  const saveRevisionRef = useRef(0);
  const creatingRef = useRef(false);
  const imageInputRef = useRef(null);
  const imageTargetBlockIdRef = useRef(null);

  // Fetch or create draft on mount
  useEffect(() => {
    if (!draftId) {
      if (creatingRef.current) return;
      creatingRef.current = true;
      apiPost('/knowledge/drafts', {
        title: '',
        ...(initialCircleId ? { circleId: initialCircleId, visibility: 'circle' } : {}),
      })
        .then((postRes) => {
          if (postRes?.draft?._id) {
            navigate(`/knowledge/studio/${postRes.draft._id}`, { replace: true });
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
          latestDraftRef.current = res.draft;
          setSnapshot(res.snapshot);
          setAnalysis(res.analysis);
        }
      })
      .catch((err) => {
        alert(err.message || 'Unable to open draft');
        navigate('/knowledge');
      })
      .finally(() => setLoading(false));
  }, [draftId, initialCircleId, navigate]);

  useEffect(() => {
    apiGet('/ai/status')
      .then(setAIStatus)
      .catch((err) => setAIStatus({ available: false, reason: err.message || 'AI status is unavailable.' }));
  }, []);

  const persistDraft = useCallback((draftData, revision) => {
    const request = saveQueueRef.current.catch(() => {}).then(() =>
      apiPatch(`/knowledge/drafts/${draftData._id}`, {
        title: draftData.title,
        subtitle: draftData.subtitle,
        summary: draftData.summary,
        format: draftData.format,
        category: draftData.category,
        topics: draftData.topics,
        body: draftData.body,
        outline: draftData.outline,
        sourceReferences: draftData.sourceReferences,
        useSourceContext: draftData.useSourceContext,
        aiAssisted: draftData.aiAssisted,
        aiDisclosure: draftData.aiDisclosure,
      })
    );
    saveQueueRef.current = request;
    return request.then(() => {
      if (revision === saveRevisionRef.current) {
        setSaveStatus('saved');
        setSaveError('');
      }
      return true;
    }).catch((err) => {
      if (revision === saveRevisionRef.current) {
        setSaveStatus('error');
        setSaveError(err.message || 'Autosave failed. Your changes are still in this editor.');
      }
      return false;
    });
  }, []);

  const triggerAutosave = useCallback((draftData) => {
    if (!draftData?._id) return;
    latestDraftRef.current = draftData;
    const revision = ++saveRevisionRef.current;
    setSaveStatus('dirty');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      persistDraft(draftData, revision);
    }, 1000);
  }, [persistDraft]);

  const flushAutosave = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const draftData = latestDraftRef.current;
    if (!draftData?._id) return true;
    const revision = saveRevisionRef.current;
    setSaveStatus('saving');
    const saved = await persistDraft(draftData, revision);
    if (!saved) throw new Error(saveError || 'Unable to save the latest changes.');
    return true;
  }, [persistDraft, saveError]);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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

  const handleBlockDataChange = (id, data) => {
    setDraft((prev) => {
      const body = (prev.body || []).map((block) => (
        block.id === id ? { ...block, data: { ...(block.data || {}), ...data } } : block
      ));
      const nextDraft = { ...prev, body };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const requestImageUpload = (blockId = null) => {
    if (!blockId && (draft?.body || []).filter((block) => block.type === 'image').length >= 8) {
      window.alert('Articles can contain at most 8 inline images.');
      return;
    }
    imageTargetBlockIdRef.current = blockId;
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const content = await compressImageFile(file, { maxDimension: 1600, maxBytes: 750_000 });
      const targetBlockId = imageTargetBlockIdRef.current;
      imageTargetBlockIdRef.current = null;
      setDraft((current) => {
        const body = current.body || [];
        const nextBody = targetBlockId
          ? body.map((block) => (block.id === targetBlockId ? { ...block, content } : block))
          : [...body, { id: createId('image'), type: 'image', content, data: { caption: '' } }];
        const nextDraft = { ...current, body: nextBody };
        triggerAutosave(nextDraft);
        return nextDraft;
      });
    } catch (error) {
      imageTargetBlockIdRef.current = null;
      window.alert(error.message || 'Unable to add this image.');
    }
  };

  const handleNavigateToSection = (section) => {
    const sectionBlock = draft.body.find((block) => (
      block.type?.startsWith('heading') && block.content?.trim() === section.heading?.trim()
    ));
    if (!sectionBlock) return;
    setPreviewMode(false);
    window.setTimeout(() => {
      document.getElementById(`editor-block-${sectionBlock.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
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
      id: createId('block'),
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
      const updatedRefs = sourceReferences.some((r) => String(r.sourceId) === String(sourceId))
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

  const handleInsertAllOutlineHeadings = () => {
    const headings = (draft.outline || []).filter((section) => section.heading?.trim()).map((section) => ({
      id: createId('heading'),
      type: 'heading2',
      content: section.heading.trim(),
      data: {},
    }));
    if (!headings.length) return;
    setDraft((prev) => {
      const nextDraft = { ...prev, body: [...(prev.body || []), ...headings] };
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

  const handleToggleSourceContext = (enabled) => {
    setDraft((current) => {
      const nextDraft = { ...current, useSourceContext: enabled };
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handleRefreshSources = async () => {
    try {
      setRefreshingSources(true);
      const response = await apiPost(`/knowledge/drafts/${draft._id}/update-sources`, {});
      if (response.snapshot) setSnapshot(response.snapshot);
      if (response.updatedAnalysis) setAnalysis(response.updatedAnalysis);
      showToast?.(response.message || 'Source snapshot refreshed.');
    } catch (err) {
      setAIError(err.message || 'Unable to refresh source snapshot.');
    } finally {
      setRefreshingSources(false);
    }
  };

  const requestAI = async (action, endpoint, payload) => {
    if (!aiStatus?.available) {
      setAIError(aiStatus?.reason || 'AI assistance is not available. You can continue writing manually.');
      return null;
    }
    if (aiBusy) return null;
    setAIBusy(action);
    setAIError('');
    try {
      await flushAutosave();
      return await apiPost(endpoint, { ...payload, draftId: draft._id });
    } catch (err) {
      setAIError(err.message || 'The AI request failed. Your draft was not changed.');
      return null;
    } finally {
      setAIBusy('');
    }
  };

  const handleGenerateOutline = async () => {
    const result = await requestAI('outline', '/ai/knowledge/outline', { topic: draft.title });
    if (result?.outline) {
      setProposal({ kind: 'outline', outline: result.outline.sections });
    }
  };

  const handleGenerateDraft = async () => {
    const result = await requestAI('draft', '/ai/knowledge/draft', {});
    if (result?.proposal) setProposal({ kind: 'draft', data: result.proposal });
  };

  const handleDraftSection = async (section) => {
    const result = await requestAI('section', '/ai/knowledge/draft-section', {
      sectionHeading: section.heading,
      authorNotes: section.notes || '',
    });
    if (result?.draftText) {
      setProposal({ kind: 'section', section, text: result.draftText });
    }
  };

  const handleRewriteSelection = async (selection) => {
    const enteredInstruction = window.prompt('How should this passage be improved? (Optional)', '');
    if (enteredInstruction === null) return;
    const result = await requestAI('rewrite', '/ai/knowledge/rewrite', {
      selectedText: selection.selectedText,
      instruction: enteredInstruction,
    });
    if (result?.rewrittenText) {
      setProposal({ kind: 'rewrite', selection, text: result.rewrittenText });
    }
  };

  const handleAssistantSubmit = async (event) => {
    event.preventDefault();
    if (!assistantInput.trim()) return;
    const question = assistantInput.trim();
    const conversation = assistantMessages.slice(-8).map((message) => ({
      role: message.role,
      text: message.text || message.answer || '',
    }));
    setAssistantMessages((messages) => [...messages, { role: 'user', text: question }]);
    setAssistantInput('');
    const result = await requestAI('assistant', '/ai/knowledge/assistant', { question, conversation });
    if (result) {
      setAssistantMessages((messages) => [...messages, { role: 'assistant', ...result }]);
    }
  };

  const handleReviewDraft = async () => {
    const reviewedContent = new Map((draft.body || []).map((block) => [block.id, block.content]));
    const result = await requestAI('review', '/ai/knowledge/review', {});
    if (result) {
      setReviewSuggestions((result.suggestions || []).map((suggestion) => ({
        ...suggestion,
        reviewedContent: reviewedContent.get(suggestion.blockId),
        status: 'pending',
      })));
      setSideTab('assistant');
    }
  };

  const markAIAssisted = (current) => ({
    ...current,
    aiAssisted: true,
    aiDisclosure: 'AI-assisted text was generated with Gemini and reviewed or edited by the author.',
  });

  const handleApplyProposal = (mode = 'replace') => {
    if (!proposal) return;
    if (proposal.kind === 'outline') {
      const newSections = proposal.outline.map((section, index) => ({
        sectionId: createId('section'),
        heading: section.heading,
        notes: section.notes || '',
        mappedSourceIds: [],
        order: index + 1,
      }));
      setDraft((current) => {
        const baseOutline = mode === 'append' ? current.outline || [] : [];
        const nextDraft = markAIAssisted({
          ...current,
          outline: [...baseOutline, ...newSections].map((section, index) => ({ ...section, order: index + 1 })),
        });
        triggerAutosave(nextDraft);
        return nextDraft;
      });
    } else if (proposal.kind === 'draft') {
      const generated = proposal.data;
      const newBlocks = generated.blocks.map((block) => ({
        id: createId('block'),
        type: block.type,
        content: block.content,
        data: {},
      }));
      const generatedOutline = generated.outline.map((section, index) => ({
        sectionId: createId('section'),
        heading: section.heading,
        notes: section.notes || '',
        mappedSourceIds: [],
        order: index + 1,
      }));
      setDraft((current) => {
        const append = mode === 'append';
        const nextDraft = markAIAssisted({
          ...current,
          ...(append ? {} : {
            title: generated.title,
            subtitle: generated.subtitle,
            summary: generated.summary,
            format: generated.format,
          }),
          body: append
            ? [...(current.body || []), ...newBlocks]
            : [...newBlocks, ...(current.body || []).filter((block) => block.type === 'image')],
          outline: append ? [...(current.outline || []), ...generatedOutline] : generatedOutline,
        });
        triggerAutosave(nextDraft);
        return nextDraft;
      });
    } else if (proposal.kind === 'section') {
      setDraft((current) => {
        const nextDraft = markAIAssisted({
          ...current,
          body: [
            ...(current.body || []),
            { id: createId('heading'), type: 'heading2', content: proposal.section.heading, data: {} },
            { id: createId('paragraph'), type: 'paragraph', content: proposal.text, data: {} },
          ],
        });
        triggerAutosave(nextDraft);
        return nextDraft;
      });
    } else if (proposal.kind === 'rewrite') {
      const { blockId, selectedText: original } = proposal.selection;
      const currentBlock = draft.body.find((block) => block.id === blockId);
      if (!currentBlock?.content.includes(original)) {
        setAIError('That passage changed while the rewrite was being prepared. Select it again before applying.');
        return;
      }
      const body = draft.body.map((block) => (
          block.id === blockId
            ? { ...block, content: block.content.replace(original, proposal.text) }
            : block
        ));
      const nextDraft = markAIAssisted({ ...draft, body });
      setDraft(nextDraft);
      triggerAutosave(nextDraft);
    }
    setProposal(null);
    setSelectedText(null);
    setPreviewMode(false);
  };

  const handleApplyReviewSuggestion = (index) => {
    const suggestion = reviewSuggestions[index];
    if (!suggestion?.replacementText || !suggestion.blockId) return;
    const currentBlock = draft.body.find((block) => block.id === suggestion.blockId);
    if (!currentBlock || currentBlock.content !== suggestion.reviewedContent) {
      setAIError('This paragraph changed after review. Run the review again before applying its suggestion.');
      return;
    }
    const body = draft.body.map((block) => {
        if (block.id !== suggestion.blockId) return block;
        return { ...block, content: suggestion.replacementText };
      });
    const nextDraft = markAIAssisted({ ...draft, body });
    setDraft(nextDraft);
    triggerAutosave(nextDraft);
    setReviewSuggestions((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, status: 'applied' } : item
    )));
  };

  const handleInsertAssistantSuggestion = (suggestion) => {
    setDraft((current) => {
      const nextDraft = markAIAssisted({
        ...current,
        body: [...(current.body || []), {
          id: createId('paragraph'),
          type: 'paragraph',
          content: suggestion.content,
          data: {},
        }],
      });
      triggerAutosave(nextDraft);
      return nextDraft;
    });
  };

  const handlePublish = async () => {
    if (!draft.title?.trim() || ['Untitled Knowledge Article', 'Untitled Knowledge Draft', 'Untitled Draft'].includes(draft.title.trim())) {
      alert('Please enter a clear title for your Knowledge article.');
      return;
    }
    if (!(draft.body || []).some((block) => block.content?.trim())) {
      alert('Article content cannot be empty.');
      return;
    }

    try {
      setPublishing(true);
      await flushAutosave();
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

  const handleDeleteDraft = async () => {
    if (!draft?._id) return;
    if (!window.confirm('Are you sure you want to delete this draft? This cannot be undone.')) {
      return;
    }
    try {
      await apiDelete(`/knowledge/drafts/${draft._id}`);
      showToast?.('Draft deleted.');
      navigate('/knowledge');
    } catch (err) {
      alert(err.message || 'Failed to delete draft');
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
                {saveStatus === 'dirty' && <span className="text-[#a76d13]">Unsaved changes</span>}
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
            disabled={!aiStatus?.available || Boolean(aiBusy) || (!draft.title?.trim() && !(draft.body || []).some((block) => block.content?.trim()))}
            onClick={handleGenerateDraft}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#d6e2ff] bg-[#eef1ff] text-[#3f5ce8] hover:bg-[#e2e8ff] disabled:opacity-50"
            title={aiStatus?.reason || 'Generate a complete draft proposal'}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1" />
            {aiBusy === 'draft' ? 'Drafting...' : 'Draft with AI'}
          </button>
          <button
            type="button"
            disabled={!aiStatus?.available || Boolean(aiBusy) || !draft.title?.trim()}
            onClick={handleGenerateOutline}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#e9e9ed] text-[#4a5265] hover:bg-[#f7f7f8] disabled:opacity-50"
            title={aiStatus?.reason || 'Generate an outline proposal'}
          >
            {aiBusy === 'outline' ? 'Outlining...' : 'Generate outline'}
          </button>
          <button
            type="button"
            disabled={!aiStatus?.available || Boolean(aiBusy) || !(draft.body || []).some((block) => block.content?.trim())}
            onClick={handleReviewDraft}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#e9e9ed] text-[#4a5265] hover:bg-[#f7f7f8] disabled:opacity-50"
            title={aiStatus?.reason || 'Review the draft and propose changes'}
          >
            <ClipboardCheck className="w-3.5 h-3.5 inline mr-1" />
            {aiBusy === 'review' ? 'Reviewing...' : 'Review'}
          </button>
          <button
            type="button"
            onClick={handleDeleteDraft}
            className="p-2 rounded-xl text-xs font-bold border border-[#fdd8d5] text-[#d6554f] hover:bg-[#fff0ee] transition-colors cursor-pointer flex items-center gap-1.5"
            title="Delete this draft"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete Draft</span>
          </button>

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

      {saveError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-[#f2c7c3] bg-[#fff4f3] px-4 py-2.5 text-xs text-[#a8433d]">
          <span>{saveError}</span>
          <button type="button" onClick={() => flushAutosave().catch((err) => setSaveError(err.message))} className="font-bold underline">
            Retry save
          </button>
        </div>
      )}
      {aiError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-[#f2c7c3] bg-[#fff4f3] px-4 py-2.5 text-xs text-[#a8433d]">
          <span>{aiError}</span>
          <button type="button" onClick={() => setAIError('')} aria-label="Dismiss AI error"><X className="w-4 h-4" /></button>
        </div>
      )}
      {aiStatus && !aiStatus.available && (
        <div className="rounded-xl border border-[#e9e9ed] bg-[#f8f9fa] px-4 py-2.5 text-xs text-[#737b8d]">
          {aiStatus.reason} Manual editing remains available.
        </div>
      )}
      {aiStatus?.available && (
        <div className="rounded-xl border border-[#d6e2ff] bg-[#f5f7ff] px-4 py-2.5 text-xs text-[#556987]">
          Gemini is configured; connectivity is checked when you request AI assistance. {aiStatus.monthlyRequestsRemaining} requests remain this month; proposals are only applied when you accept them.
        </div>
      )}

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
                    {b.type === 'image' && b.content && (
                      <figure className="space-y-2">
                        <img src={b.content} alt={b.data?.caption || ''} className="max-h-[32rem] w-full rounded-2xl object-contain" />
                        {b.data?.caption && <figcaption className="text-center text-xs text-[#737b8d]">{b.data.caption}</figcaption>}
                      </figure>
                    )}
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
                    value={draft.title || ''}
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
                  <textarea
                    value={draft.summary || ''}
                    onChange={(e) => {
                      const summary = e.target.value;
                      setDraft((prev) => {
                        const next = { ...prev, summary };
                        triggerAutosave(next);
                        return next;
                      });
                    }}
                    rows={2}
                    placeholder="Short article summary (optional)"
                    className="w-full text-xs text-[#737b8d] mt-3 focus:outline-none border-none resize-y placeholder-[#b0b6c4]"
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
                {(draft.body || []).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#d6dbe6] bg-white p-8 text-center">
                    <h2 className="text-sm font-bold text-[#17213f]">Your article starts here</h2>
                    <p className="mt-1 text-xs text-[#737b8d]">
                      This canvas is intentionally blank. Add your own content, insert the outline, or review an AI draft proposal before applying it.
                    </p>
                  </div>
                )}
                {(draft.body || []).map((block, idx) => (
                  <EditorBlock
                    key={block.id}
                    block={block}
                    index={idx}
                    totalBlocks={draft.body.length}
                    onChangeContent={handleBlockContentChange}
                    onChangeBlockData={handleBlockDataChange}
                    onChangeType={handleBlockTypeChange}
                    onUploadImage={requestImageUpload}
                    onMoveUp={(index) => handleMoveBlock(index, -1)}
                    onMoveDown={(index) => handleMoveBlock(index, 1)}
                    onDelete={handleDeleteBlock}
                    selectedText={selectedText}
                    onSelectionChange={setSelectedText}
                    onRewriteSelection={handleRewriteSelection}
                  />
                ))}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelected}
                />
              </div>

              {/* Block Insertion Toolbar */}
              <EditorToolbar onAddBlock={handleAddBlock} onAddImage={() => requestImageUpload()} />
            </div>
          )}
        </div>

        {/* Side Pane: Sources & Outline */}
        {sidePaneOpen && (
          <div className="lg:col-span-4 bg-white border border-[#e9e9ed] rounded-3xl p-5 shadow-xs space-y-6 sticky top-20 max-h-[85vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-1 border-b border-[#e9e9ed] pb-2">
              {[
                ['outline', 'Outline'],
                ['sources', 'Sources'],
                ['assistant', 'AI tools'],
              ].map(([tab, label]) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setSideTab(tab)}
                  className={`rounded-lg px-2 py-2 text-[10px] font-bold ${
                    sideTab === tab ? 'bg-[#eef1ff] text-[#3f5ce8]' : 'text-[#737b8d] hover:bg-[#f7f7f8]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {sideTab === 'outline' && (
              <OutlineEditor
                outline={draft.outline || []}
                onUpdateOutline={handleUpdateOutline}
                onInsertAllHeadings={handleInsertAllOutlineHeadings}
                onDraftSection={handleDraftSection}
                bodyBlocks={draft.body || []}
                onNavigateToSection={handleNavigateToSection}
              />
            )}

            {sideTab === 'sources' && (
              <SourceSelectionPanel
                snapshot={snapshot}
                analysis={analysis}
                onInsertQuote={handleInsertQuoteFromSource}
                useSourceContext={draft.useSourceContext !== false}
                onToggleSourceContext={handleToggleSourceContext}
                onRefreshSources={snapshot ? handleRefreshSources : null}
                refreshing={refreshingSources}
              />
            )}

            {sideTab === 'assistant' && (
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#17213f]">
                    <MessageCircle className="w-4 h-4 text-[#3f5ce8]" /> Writing assistant
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#737b8d]">
                    Ask for feedback or ideas. The assistant will suggest changes; nothing is inserted without your action.
                  </p>
                </div>

                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {assistantMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className="rounded-xl border border-[#e9e9ed] bg-[#fafafc] p-3 text-xs">
                      <p className="font-bold text-[#17213f]">{message.role === 'user' ? 'You' : 'Assistant'}</p>
                      <p className="mt-1 whitespace-pre-line text-[#4a5265]">{message.text || message.answer}</p>
                      {message.role === 'assistant' && (message.suggestions || []).map((suggestion, suggestionIndex) => (
                        <div key={`${suggestion.label}-${suggestionIndex}`} className="mt-2 border-t border-[#e9e9ed] pt-2">
                          <p className="font-bold text-[#17213f]">{suggestion.label}</p>
                          <p className="mt-1 whitespace-pre-line text-[#4a5265]">{suggestion.content}</p>
                          <button
                            type="button"
                            onClick={() => handleInsertAssistantSuggestion(suggestion)}
                            className="mt-2 text-[10px] font-bold text-[#3f5ce8] hover:underline"
                          >
                            Add to article
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAssistantSubmit} className="space-y-2">
                  <textarea
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Ask about structure, clarity, or a specific section..."
                    className="w-full rounded-xl border border-[#e9e9ed] p-3 text-xs text-[#17213f] focus:outline-none focus:border-[#3f5ce8]"
                  />
                  <button
                    type="submit"
                    disabled={!aiStatus?.available || Boolean(aiBusy) || !assistantInput.trim()}
                    className="w-full rounded-xl bg-[#3f5ce8] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {aiBusy === 'assistant' ? 'Thinking...' : 'Ask assistant'}
                  </button>
                </form>

                <div className="border-t border-[#f0f0f2] pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-[#17213f]">Draft review</h4>
                    <button
                      type="button"
                      disabled={!aiStatus?.available || Boolean(aiBusy) || !(draft.body || []).some((block) => block.content?.trim())}
                      onClick={handleReviewDraft}
                      className="rounded-lg border border-[#e9e9ed] px-2 py-1 text-[10px] font-bold text-[#3f5ce8] disabled:opacity-50"
                    >
                      {aiBusy === 'review' ? 'Reviewing...' : 'Review article'}
                    </button>
                  </div>
                  {reviewSuggestions.map((suggestion, index) => (
                    <div key={`${suggestion.blockId}-${index}`} className="mt-3 rounded-xl border border-[#e9e9ed] p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#3f5ce8]">{suggestion.category}</span>
                        {suggestion.status === 'applied' && <span className="text-[10px] text-[#3aa76d]">Applied</span>}
                      </div>
                      <p className="mt-1 text-[#17213f]">{suggestion.finding}</p>
                      <p className="mt-1 text-[#737b8d]">{suggestion.recommendation}</p>
                      {suggestion.status === 'pending' && suggestion.replacementText && suggestion.blockId && (
                        <button
                          type="button"
                          onClick={() => handleApplyReviewSuggestion(index)}
                          className="mt-2 font-bold text-[#3f5ce8] hover:underline"
                        >
                          Apply replacement
                        </button>
                      )}
                      {suggestion.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setReviewSuggestions((items) => items.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, status: 'dismissed' } : item
                          )))}
                          className="ml-3 mt-2 font-semibold text-[#737b8d] hover:underline"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {proposal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="ai-proposal-title">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-[#f0f0f2] pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#3f5ce8]">AI proposal · Gemini</p>
                <h2 id="ai-proposal-title" className="mt-1 text-lg font-black text-[#17213f]">
                  {proposal.kind === 'outline' ? 'Review the outline' :
                    proposal.kind === 'draft' ? 'Review the article draft' :
                      proposal.kind === 'section' ? 'Review the section draft' : 'Review the rewrite'}
                </h2>
                <p className="mt-1 text-xs text-[#737b8d]">Nothing changes in your article until you choose an apply action.</p>
              </div>
              <button type="button" onClick={() => setProposal(null)} aria-label="Close proposal" className="rounded-lg p-2 text-[#737b8d] hover:bg-[#f7f7f8]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {proposal.kind === 'outline' && (
              <div className="mt-5 space-y-3">
                {proposal.outline.map((section, index) => (
                  <div key={index} className="rounded-xl border border-[#e9e9ed] p-3">
                    <input
                      value={section.heading}
                      onChange={(event) => setProposal((current) => ({
                        ...current,
                        outline: current.outline.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, heading: event.target.value } : item
                        )),
                      }))}
                      className="w-full font-bold text-[#17213f] focus:outline-none"
                      aria-label={`Proposed section ${index + 1} heading`}
                    />
                    <textarea
                      value={section.notes || ''}
                      onChange={(event) => setProposal((current) => ({
                        ...current,
                        outline: current.outline.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, notes: event.target.value } : item
                        )),
                      }))}
                      rows={2}
                      className="mt-2 w-full resize-y text-xs text-[#737b8d] focus:outline-none"
                      aria-label={`Proposed section ${index + 1} notes`}
                    />
                  </div>
                ))}
              </div>
            )}

            {proposal.kind === 'draft' && (
              <div className="mt-5 space-y-4">
                <label className="block text-xs font-bold text-[#17213f]">
                  Title
                  <input
                    value={proposal.data.title}
                    onChange={(event) => setProposal((current) => ({
                      ...current,
                      data: { ...current.data, title: event.target.value },
                    }))}
                    className="mt-1 w-full rounded-xl border border-[#e9e9ed] px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="block text-xs font-bold text-[#17213f]">
                  Subtitle
                  <input
                    value={proposal.data.subtitle || ''}
                    onChange={(event) => setProposal((current) => ({
                      ...current,
                      data: { ...current.data, subtitle: event.target.value },
                    }))}
                    className="mt-1 w-full rounded-xl border border-[#e9e9ed] px-3 py-2 text-xs font-normal"
                  />
                </label>
                <label className="block text-xs font-bold text-[#17213f]">
                  Summary
                  <textarea
                    rows={2}
                    value={proposal.data.summary || ''}
                    onChange={(event) => setProposal((current) => ({
                      ...current,
                      data: { ...current.data, summary: event.target.value },
                    }))}
                    className="mt-1 w-full rounded-xl border border-[#e9e9ed] px-3 py-2 text-xs font-normal"
                  />
                </label>
                <div className="space-y-3">
                  {proposal.data.blocks.map((block, index) => (
                    <label key={index} className="block text-[10px] font-bold uppercase text-[#737b8d]">
                      {block.type === 'heading2' ? 'Section heading' : block.type}
                      <textarea
                        rows={block.type === 'heading2' ? 1 : 4}
                        value={block.content}
                        onChange={(event) => setProposal((current) => ({
                          ...current,
                          data: {
                            ...current.data,
                            blocks: current.data.blocks.map((item, itemIndex) => (
                              itemIndex === index ? { ...item, content: event.target.value } : item
                            )),
                          },
                        }))}
                        className="mt-1 w-full resize-y rounded-xl border border-[#e9e9ed] p-3 text-xs font-normal normal-case text-[#2c3345]"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(proposal.kind === 'section' || proposal.kind === 'rewrite') && (
              <div className="mt-5 space-y-3">
                {proposal.kind === 'section' && (
                  <p className="text-xs font-bold text-[#17213f]">{proposal.section.heading}</p>
                )}
                {proposal.kind === 'rewrite' && (
                  <div className="rounded-xl bg-[#f7f7f8] p-3 text-xs text-[#737b8d]">
                    Selected text: “{proposal.selection.selectedText}”
                  </div>
                )}
                <textarea
                  value={proposal.text}
                  onChange={(event) => setProposal((current) => ({ ...current, text: event.target.value }))}
                  rows={10}
                  className="w-full resize-y rounded-xl border border-[#e9e9ed] p-3 text-sm leading-relaxed text-[#2c3345]"
                  aria-label="Edit AI proposal"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#f0f0f2] pt-4">
              <button type="button" onClick={() => setProposal(null)} className="rounded-xl border border-[#e9e9ed] px-4 py-2 text-xs font-bold text-[#737b8d]">
                Cancel
              </button>
              {proposal.kind === 'outline' && (
                <>
                  <button type="button" onClick={() => handleApplyProposal('append')} className="rounded-xl border border-[#d6e2ff] px-4 py-2 text-xs font-bold text-[#3f5ce8]">
                    Append to outline
                  </button>
                  <button type="button" onClick={() => handleApplyProposal('replace')} className="rounded-xl bg-[#3f5ce8] px-4 py-2 text-xs font-bold text-white">
                    Replace outline
                  </button>
                </>
              )}
              {proposal.kind === 'draft' && (
                <>
                  <button type="button" onClick={() => handleApplyProposal('append')} className="rounded-xl border border-[#d6e2ff] px-4 py-2 text-xs font-bold text-[#3f5ce8]">
                    Add to article
                  </button>
                  <button type="button" onClick={() => handleApplyProposal('replace')} className="rounded-xl bg-[#3f5ce8] px-4 py-2 text-xs font-bold text-white">
                    Replace article
                  </button>
                </>
              )}
              {proposal.kind === 'section' && (
                <button type="button" onClick={() => handleApplyProposal()} className="rounded-xl bg-[#3f5ce8] px-4 py-2 text-xs font-bold text-white">
                  Add section to article
                </button>
              )}
              {proposal.kind === 'rewrite' && (
                <button type="button" onClick={() => handleApplyProposal()} className="rounded-xl bg-[#3f5ce8] px-4 py-2 text-xs font-bold text-white">
                  Replace selected text
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
