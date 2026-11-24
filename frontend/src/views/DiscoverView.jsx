import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import PostCard from '../components/discover/PostCard';
import DiscussionCard from '../components/discover/DiscussionCard';
import KnowledgeCard from '../components/discover/KnowledgeCard';
import DiscussionDetailModal from '../components/discussion/DiscussionDetailModal';
import Avatar from '../components/common/Avatar';
import { apiGet } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function DiscoverView() {
  const { onOpenCreate, showToast } = useOutletContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('For you');
  const [contentTypeFilter, setContentTypeFilter] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All topics');
  const [searchQuery, setSearchQuery] = useState('');

  const [posts, setPosts] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [loading, setLoading] = useState(true);

  // Discussion modal
  const [activeDiscussion, setActiveDiscussion] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet(`/posts?mode=${activeTab.toLowerCase().replace(' ', '-')}`),
      apiGet('/discussions'),
      apiGet('/knowledge'),
    ])
      .then(([postsRes, discRes, knowRes]) => {
        setPosts(postsRes?.posts || []);
        setDiscussions(discRes?.discussions || []);
        setKnowledge(knowRes?.articles || []);
      })
      .catch((err) => {
        console.warn('[DiscoverView] Error fetching feed:', err.message);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Combined and filtered items
  const filteredPosts = posts.filter((p) => {
    if (selectedTopic !== 'All topics' && !p.tags?.some((t) => t.includes(selectedTopic))) return false;
    if (searchQuery && !p.body?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredDiscussions = discussions.filter((d) => {
    if (selectedTopic !== 'All topics' && d.category !== selectedTopic) return false;
    if (searchQuery && !d.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !d.body?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredKnowledge = knowledge.filter((k) => {
    if (selectedTopic !== 'All topics' && k.category !== selectedTopic) return false;
    if (searchQuery && !k.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalItems =
    (contentTypeFilter === 'All' || contentTypeFilter === 'Posts' ? filteredPosts.length : 0) +
    (contentTypeFilter === 'All' || contentTypeFilter === 'Discussions' ? filteredDiscussions.length : 0) +
    (contentTypeFilter === 'All' || contentTypeFilter === 'Knowledge' ? filteredKnowledge.length : 0);

  return (
    <div className="space-y-6">
      {/* Topline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2]">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            ORVEXA COMMUNITY
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight">
            Discover what's possible
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Explore conversations, discussions, and knowledge worth your attention.
          </p>
        </div>
      </div>

      {/* Feature Spotlight */}
      <section className="bg-[#e96f68] text-white p-6 sm:p-7 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_5px_15px_rgba(233,111,104,0.18)]">
        <div className="space-y-2 max-w-xl">
          <span className="inline-block bg-white/25 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
            COMMUNITY SPOTLIGHT
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Small questions can spark big discoveries.
          </h2>
          <p className="text-xs sm:text-sm text-[#fff1ef] leading-relaxed">
            Find a discussion worth exploring, add your perspective, or discover something new to learn.
          </p>
          <button
            onClick={() => onOpenCreate('Discussion')}
            className="mt-2 bg-[#27334f] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1a2336] transition-colors cursor-pointer"
          >
            Start a discussion →
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e9e9ed] text-xs font-bold text-[#777f90]">
        {['For you', 'Trending', 'Following', 'Latest'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab ? 'border-[#e66c68] text-[#e66c68]' : 'border-transparent hover:text-[#17213f]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar: Search & Content Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8b92a1] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, discussions, knowledge..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e9e9ed] bg-white text-xs text-[#17213f] focus:outline-none focus:border-[#3f5ce8]"
          />
        </div>

        {/* Content Type Filter */}
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[#e9e9ed] bg-white text-xs text-[#4a5265] focus:outline-none"
        >
          <option value="All">All content</option>
          <option value="Posts">Posts only</option>
          <option value="Discussions">Discussions only</option>
          <option value="Knowledge">Knowledge only</option>
        </select>

        {/* Topic Filter */}
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[#e9e9ed] bg-white text-xs text-[#4a5265] focus:outline-none"
        >
          <option>All topics</option>
          <option>Culture</option>
          <option>Technology</option>
          <option>UX</option>
          <option>Engineering</option>
          <option>Learning</option>
          <option>Work & Culture</option>
        </select>
      </div>

      {/* Quick Composer */}
      <div className="border border-[#e9e9ed] rounded-2xl p-3.5 sm:p-4 bg-white flex items-center gap-3 shadow-2xs">
        <Avatar
          initials={user?.initials || 'OP'}
          color={user?.avatarColor || 'purple'}
          src={user?.avatar}
          size="w-9 h-9 text-xs"
        />
        <button
          onClick={() => onOpenCreate('Post')}
          className="flex-1 text-left bg-[#f7f7f8] hover:bg-[#f0f0f2] border border-[#f0f0f2] rounded-full px-4 py-2.5 text-xs text-[#858c9b] transition-colors cursor-pointer"
        >
          What’s on your mind, {user?.displayName || 'friend'}?
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenCreate('Discussion')}
            className="text-xs font-bold text-[#657087] hover:bg-[#fff0ee] hover:text-[#c65d59] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ✧ Discussion
          </button>
          <button
            onClick={() => onOpenCreate('Knowledge article')}
            className="text-xs font-bold text-[#657087] hover:bg-[#fff0ee] hover:text-[#c65d59] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ▤ Knowledge
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8b92a1]">Loading feed items...</div>
        ) : totalItems === 0 ? (
          <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-2">
            <p className="font-semibold text-[#17213f]">No content found matching your filter.</p>
            <p>Publish a post or start a discussion to share your perspective with the community.</p>
          </div>
        ) : (
          <>
            {/* Discussions */}
            {(contentTypeFilter === 'All' || contentTypeFilter === 'Discussions') &&
              filteredDiscussions.map((d) => (
                <DiscussionCard key={d._id} discussion={d} onOpenDetail={(disc) => setActiveDiscussion(disc)} />
              ))}

            {/* Posts */}
            {(contentTypeFilter === 'All' || contentTypeFilter === 'Posts') &&
              filteredPosts.map((p) => <PostCard key={p._id} post={p} />)}

            {/* Knowledge */}
            {(contentTypeFilter === 'All' || contentTypeFilter === 'Knowledge') &&
              filteredKnowledge.map((k) => (
                <KnowledgeCard
                  key={k._id}
                  article={k}
                  onOpenReader={() => showToast(`Opening article: ${k.title}`)}
                />
              ))}
          </>
        )}
      </div>

      {/* Discussion Detail Modal */}
      {activeDiscussion && (
        <DiscussionDetailModal
          discussion={activeDiscussion}
          onClose={() => setActiveDiscussion(null)}
          onOpenAiStudio={(disc) => onOpenCreate('Knowledge article')}
        />
      )}
    </div>
  );
}
