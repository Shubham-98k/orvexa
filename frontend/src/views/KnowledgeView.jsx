import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bot, Sparkles, BookOpen, ExternalLink, X } from 'lucide-react';
import KnowledgeCard from '../components/discover/KnowledgeCard';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';

export default function KnowledgeView() {
  const { onOpenCreate, showToast } = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [helpfulVoted, setHelpfulVoted] = useState(false);

  // AI Studio modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiOutline, setAiOutline] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    apiGet('/knowledge')
      .then((res) => {
        setArticles(res?.articles || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateOutline = async () => {
    if (!aiTopic.trim()) {
      showToast('Please enter a subject for the AI partner');
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiPost('/ai/knowledge/outline', { topic: aiTopic.trim() });
      setAiOutline(res.outline);
    } catch {
      setAiOutline({
        title: `${aiTopic}: An Actionable Framework`,
        sections: [
          '01 / Foundational Context & Core Problem',
          '02 / Real-World Patterns & Field Observations',
          '03 / Concrete Practices & Implementation Steps',
          '04 / Failure Modes & Countermeasures',
          '05 / Conclusion & Community Follow-Ups',
        ],
        draftSummary: `A comprehensive distillation of ${aiTopic}, designed to give teams and individuals immediate practical clarity.`,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePublishAiArticle = async () => {
    if (!aiOutline) return;
    try {
      const res = await apiPost('/knowledge', {
        title: aiOutline.title,
        summary: aiOutline.draftSummary || 'AI-assisted research outline',
        content: `### ${aiOutline.title}\n\n${aiOutline.draftSummary}\n\n${(aiOutline.sections || []).map((s) => `#### ${typeof s === 'string' ? s : s.heading}\nFocus on human-led verification and incremental execution.`).join('\n\n')}`,
        category: 'Thinking',
        readTime: '6 min read',
        source: 'Created with AI partner',
      });
      if (res?.article) {
        setArticles([res.article, ...articles]);
        setAiModalOpen(false);
        setAiOutline(null);
        setAiTopic('');
        showToast('Knowledge article published successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to publish.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Topline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2]">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            ORVEXA KNOWLEDGE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight">
            Knowledge worth keeping
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Durable, reusable guides and resources created by the community.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-[#8b63d9] hover:bg-[#7a52c7] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>AI Writing Partner</span>
          </button>
          <button
            onClick={() => onOpenCreate('Knowledge article')}
            className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Publish Article
          </button>
        </div>
      </div>

      {/* Featured Banner */}
      <section className="bg-[#526ce0] text-white p-6 sm:p-7 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_5px_15px_rgba(82,108,224,0.18)]">
        <div className="space-y-2 max-w-xl">
          <span className="inline-block bg-white/25 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
            FEATURED PUBLICATION
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Ideas that become useful knowledge.
          </h2>
          <p className="text-xs sm:text-sm text-[#eef1ff] leading-relaxed">
            Read thoughtful resources, follow their sources, and build on what the community has learned.
          </p>
        </div>
      </section>

      {/* Article List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8b92a1]">Loading knowledge base...</div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-2">
            <p className="font-semibold text-[#17213f]">No knowledge articles published yet.</p>
            <p>Use the AI Writing Partner or manual editor to publish the first guide!</p>
          </div>
        ) : (
          articles.map((item) => (
            <KnowledgeCard key={item._id} article={item} onOpenReader={(art) => setSelectedArticle(art)} />
          ))
        )}
      </div>

      {/* Reader Modal */}
      {selectedArticle && (
        <div
          onClick={(e) => e.target === e.currentTarget && setSelectedArticle(null)}
          className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-9 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e9e9ed] space-y-6">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-3">
              <span className="bg-[#eef1ff] text-[#5369ce] px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                {selectedArticle.category || 'Knowledge'}
              </span>
              <button onClick={() => setSelectedArticle(null)} className="text-[#8b92a1] hover:text-[#17213f] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#17213f] leading-tight">{selectedArticle.title}</h1>
              {selectedArticle.subtitle && (
                <p className="text-sm font-semibold text-[#737b8d] mt-1">{selectedArticle.subtitle}</p>
              )}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#f0f0f2]">
                <Avatar initials={selectedArticle.authorInitials || 'OP'} color={selectedArticle.authorColor || 'green'} />
                <div>
                  <div className="text-xs font-bold text-[#17213f]">{selectedArticle.authorName}</div>
                  <div className="text-[10px] text-[#9298a7]">Published in Orvexa Knowledge</div>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-[#231F20] text-xs sm:text-[13.5px] leading-relaxed whitespace-pre-line bg-[#fcfcfd] p-5 rounded-2xl border border-[#e9e9ed]">
              {selectedArticle.content || selectedArticle.summary}
            </div>

            <div className="border-t border-[#f0f0f2] pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#737b8d]">Was this resource useful?</span>
                <button
                  onClick={() => {
                    setHelpfulVoted((prev) => !prev);
                    showToast(helpfulVoted ? 'Feedback cleared' : 'Thank you for your feedback!');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    helpfulVoted ? 'bg-[#eaf6f0] text-[#57977b]' : 'bg-[#f0f1f4] text-[#17213f]'
                  }`}
                >
                  {helpfulVoted ? '✓ Yes, useful' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Studio Modal */}
      {aiModalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setAiModalOpen(false)}
          className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-xl shadow-2xl border border-[#e9e9ed] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f2]">
              <div className="flex items-center gap-2 text-[#8b63d9]">
                <Bot className="w-5 h-5 stroke-[2.5]" />
                <h2 className="text-base font-bold text-[#17213f]">Orvexa AI Writing Partner</h2>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-[#8b92a1] hover:text-[#17213f] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#737b8d] leading-relaxed">
              Plan and outline high-quality Knowledge. AI assists you in structuring ideas, while you review and publish the final article.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#17213f] mb-1">Subject / Question</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Building resilient async team rituals"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs focus:outline-none focus:border-[#8b63d9]"
                />
              </div>

              <button
                onClick={handleGenerateOutline}
                disabled={aiLoading}
                className="w-full bg-[#8b63d9] hover:bg-[#7a52c7] text-white py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4" />
                <span>{aiLoading ? 'Generating outline...' : 'Generate proposed structure'}</span>
              </button>

              {aiOutline && (
                <div className="p-4 rounded-xl bg-[#f8f6fc] border border-[#e8dff7] space-y-2 mt-3 animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-[#17213f]">{aiOutline.title}</h4>
                  <p className="text-[11px] text-[#737b8d]">{aiOutline.draftSummary}</p>
                  <ul className="space-y-1 text-xs text-[#4a5265] pt-1">
                    {(aiOutline.sections || []).map((s, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 font-medium">
                        <span className="text-[#8b63d9]">›</span>
                        <span>{typeof s === 'string' ? s : s.heading}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handlePublishAiArticle}
                    className="mt-3 w-full bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Accept & Publish to Knowledge
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
