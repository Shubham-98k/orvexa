import { useState } from 'react';
import { Database, Quote, ExternalLink, RefreshCw } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function SourceSelectionPanel({
  snapshot,
  analysis,
  onInsertQuote,
  useSourceContext = true,
  onToggleSourceContext,
  onRefreshSources,
  refreshing = false,
}) {
  const [activeTab, setActiveTab] = useState('sources');

  if (!snapshot) {
    return (
      <div className="p-4 rounded-2xl bg-[#fafafc] border border-[#e9e9ed] text-center text-xs text-[#8b92a1] space-y-1">
        <Database className="w-5 h-5 mx-auto text-[#b0b6c4]" />
        <p className="font-semibold text-[#17213f]">Independent Article</p>
        <p className="text-[11px]">This draft was created independently without attached community discussion.</p>
      </div>
    );
  }

  const manifest = snapshot.sourceManifest || [];
  const themes = analysis?.themes || [];

  return (
    <div className="space-y-4 font-sans">
      {/* Snapshot Header Stats */}
      <div className="p-3.5 rounded-2xl bg-[#f0f4ff] border border-[#d6e2ff] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#17213f] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#3f5ce8]" />
            <span>Source Snapshot</span>
          </span>
          <span className="text-[10px] font-bold text-[#3f5ce8] uppercase bg-white px-2 py-0.5 rounded">
            {snapshot.sourceType}
          </span>
        </div>
        <p className="text-xs font-semibold text-[#2c3345] line-clamp-1">{snapshot.sourceTitle}</p>
        {snapshot.sourceType && (
          <a
            href={snapshot.sourceType === 'discussion'
              ? `/discussions/${snapshot.sourceId}`
              : `/discover?postId=${snapshot.sourceId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3f5ce8] hover:underline"
          >
            Open original {snapshot.sourceType === 'discussion' ? 'discussion' : 'Post'} <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#d6e2ff]/60 text-[11px] text-[#556987]">
          <div>
            Total source items: <b>{snapshot.totalEligibleSources}</b>
          </div>
          <div>
            Contributors: <b>{snapshot.uniqueContributors}</b>
          </div>
          <div className="col-span-2">
            Items shown below: <b>{snapshot.selectedCount ?? manifest.length}</b> (bounded sample)
          </div>
          <label className="col-span-2 flex items-start gap-2 border-t border-[#d6e2ff]/60 pt-2 text-[11px] text-[#38425b]">
            <input
              type="checkbox"
              checked={useSourceContext}
              onChange={(event) => onToggleSourceContext?.(event.target.checked)}
              className="mt-0.5 accent-[#3f5ce8]"
            />
            <span>Include this source snapshot in AI requests. Turning this off keeps provenance but excludes source text.</span>
          </label>
          {onRefreshSources && (
            <button
              type="button"
              onClick={onRefreshSources}
              disabled={refreshing}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d6e2ff] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#3f5ce8] disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing sources...' : 'Refresh source snapshot'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e9e9ed] text-xs font-bold text-[#737b8d]">
        <button
          type="button"
          onClick={() => setActiveTab('sources')}
          className={`pb-2 px-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'sources' ? 'border-[#3f5ce8] text-[#3f5ce8]' : 'border-transparent hover:text-[#17213f]'
          }`}
        >
          Source sample ({manifest.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`pb-2 px-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'themes' ? 'border-[#3f5ce8] text-[#3f5ce8]' : 'border-transparent hover:text-[#17213f]'
          }`}
        >
          Keyword stats ({themes.length})
        </button>
      </div>

      {/* Tab: Source metadata */}
      {activeTab === 'themes' && (
        <div className="space-y-2.5">
          {themes.length === 0 ? (
            <p className="text-xs text-[#8b92a1]">No keyword statistics are available yet.</p>
          ) : (
            themes.map((theme) => (
              <div key={theme.themeId} className="p-3 bg-white border border-[#e9e9ed] rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17213f]">{theme.label}</span>
                  <span className="text-[10px] font-semibold text-[#8b92a1] bg-[#f7f7f8] px-1.5 py-0.5 rounded">
                    {theme.contributionCount} sampled items
                  </span>
                </div>
                <p className="text-[11px] text-[#737b8d] leading-relaxed">{theme.summary}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(theme.keywords || []).map((kw) => (
                    <span key={kw} className="text-[10px] font-semibold text-[#3f5ce8] bg-[#eef1ff] px-2 py-0.5 rounded">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Sources / Contributions */}
      {activeTab === 'sources' && (
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {manifest.map((item, idx) => (
            <div key={idx} className="p-3 bg-white border border-[#e9e9ed] rounded-xl space-y-1.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Avatar
                    initials={item.authorInitials || 'OP'}
                    color={item.authorColor || 'purple'}
                    size="w-5 h-5 text-[9px]"
                  />
                  <span className="font-bold text-[#17213f]">{item.authorName}</span>
                </div>
                {item.selectionReason && (
                  <span className="text-[9px] font-bold text-[#bd625e] bg-[#fff0ee] px-1.5 py-0.5 rounded">
                    {item.selectionReason}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-[#38425b] leading-relaxed line-clamp-3">
                "{item.contentPreview}"
              </p>
              {onInsertQuote && (
                <button
                  type="button"
                  onClick={() =>
                    onInsertQuote({
                      quoteText: item.contentPreview,
                      authorName: item.authorName,
                      sourceId: item.sourceId,
                      sourceType: item.sourceType,
                    })
                  }
                  className="text-[10px] font-bold text-[#3f5ce8] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <Quote className="w-3 h-3" />
                  <span>Insert Quote into Draft</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
