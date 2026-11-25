import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PenLine, BookOpen, Layers, Filter, Sparkles, ChevronRight } from 'lucide-react';
import KnowledgeCard from '../components/discover/KnowledgeCard';
import { apiGet } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const FORMATS = ['All', 'Guide', 'Explainer', 'Research', 'Perspective', 'Notes'];
const CATEGORIES = ['All topics', 'Thinking', 'Culture', 'Technology', 'UX', 'Engineering', 'Learning', 'Work & Culture'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'saved', label: 'Most saved' },
  { value: 'helpful', label: 'Most helpful' },
];

export default function KnowledgeView() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [draftsCount, setDraftsCount] = useState(0);

  // Filters & Search
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All topics');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load user drafts count if logged in
  useEffect(() => {
    if (user) {
      apiGet('/knowledge/drafts')
        .then((res) => {
          if (Array.isArray(res?.drafts)) {
            setDraftsCount(res.drafts.length);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Fetch articles from backend API
  const fetchArticles = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory !== 'All topics') params.set('category', selectedCategory);
    if (selectedFormat !== 'All') params.set('format', selectedFormat.toLowerCase());
    if (selectedSort) params.set('sort', selectedSort);
    if (debouncedSearch) params.set('search', debouncedSearch);
    params.set('page', String(page));
    params.set('limit', '12');

    apiGet(`/knowledge?${params.toString()}`)
      .then((res) => {
        setArticles(res?.articles || []);
        setTotal(res?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedFormat, selectedSort, debouncedSearch, page]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const featuredArticle = articles.length > 0 ? articles[0] : null;

  return (
    <div className="space-y-6 font-sans">
      {/* Topline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2]">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            ORVEXA KNOWLEDGE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17213f] leading-tight">
            Knowledge worth keeping
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Durable, reusable guides and resources created by the community.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {user && draftsCount > 0 && (
            <button
              onClick={() => navigate('/knowledge/studio')}
              className="bg-[#f0f4ff] hover:bg-[#e6edff] text-[#3f5ce8] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Drafts ({draftsCount})</span>
            </button>
          )}

          <button
            onClick={() => navigate('/knowledge/studio')}
            className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Write Article</span>
          </button>
        </div>
      </div>

      {/* Featured Publication Banner */}
      {featuredArticle && !debouncedSearch && selectedCategory === 'All topics' && selectedFormat === 'All' && (
        <section
          onClick={() => navigate(`/knowledge/${featuredArticle._id}`)}
          className="bg-gradient-to-br from-[#4f67e0] to-[#3a52c7] text-white p-6 sm:p-8 rounded-3xl cursor-pointer hover:shadow-lg transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="bg-white/25 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
              FEATURED PUBLICATION
            </span>
            <span className="text-xs text-[#e0e5ff] font-semibold">{featuredArticle.readTime || '5 min read'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            {featuredArticle.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#eef1ff] leading-relaxed line-clamp-2 max-w-2xl">
            {featuredArticle.summary}
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#e0e5ff]">
            <span>By {featuredArticle.authorName}</span>
            <span>·</span>
            <span>{featuredArticle.category}</span>
            <span className="ml-auto flex items-center gap-1 font-bold text-white">
              Read Guide <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </section>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e9e9ed] rounded-2xl p-4 shadow-2xs space-y-3">
        {/* Search input & Sort */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8b92a1] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge by title, topic, or keyword..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#e9e9ed] focus:outline-none focus:border-[#3f5ce8]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] font-semibold text-[#737b8d]">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-bold text-[#17213f] bg-[#f7f7f8] border border-[#e9e9ed] rounded-xl focus:outline-none cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format & Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#f0f0f2]">
          <span className="text-[10px] font-bold uppercase text-[#8b92a1] mr-1">Format:</span>
          {FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => {
                setSelectedFormat(fmt);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedFormat === fmt
                  ? 'bg-[#3f5ce8] text-white'
                  : 'bg-[#f7f7f8] text-[#555d70] hover:bg-[#eef1ff] hover:text-[#3f5ce8]'
              }`}
            >
              {fmt}
            </button>
          ))}

          <span className="text-xs text-[#d1d5db] mx-1">|</span>

          <span className="text-[10px] font-bold uppercase text-[#8b92a1] mr-1">Category:</span>
          {CATEGORIES.slice(0, 5).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#17213f] text-white font-bold'
                  : 'bg-[#f7f7f8] text-[#737b8d] hover:text-[#17213f]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Article Grid / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#8b92a1]">
            Loading knowledge articles...
          </div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-3xl space-y-2 bg-white">
            <BookOpen className="w-8 h-8 text-[#b0b6c4] mx-auto" />
            <p className="font-bold text-[#17213f]">No knowledge articles found</p>
            <p className="text-[11.5px] max-w-sm mx-auto text-[#737b8d]">
              {debouncedSearch || selectedFormat !== 'All' || selectedCategory !== 'All topics'
                ? 'Try adjusting your filters or search terms.'
                : 'Be the first to synthesize a discussion or write a practical guide.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/knowledge/studio')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#3f5ce8] hover:bg-[#324ecc] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Write first article</span>
            </button>
          </div>
        ) : (
          articles.map((item) => (
            <KnowledgeCard
              key={item._id}
              article={item}
              onOpenReader={(art) => navigate(`/knowledge/${art._id}`)}
            />
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {total > 12 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#f0f0f2] text-xs font-semibold text-[#737b8d]">
          <span>
            Showing {articles.length} of {total} publications
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-[#e9e9ed] bg-white disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={page * 12 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-xl border border-[#e9e9ed] bg-white disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
