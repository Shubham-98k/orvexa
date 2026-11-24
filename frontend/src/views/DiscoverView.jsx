import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Search, Sparkles, Users, Compass } from 'lucide-react';
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
  const [authRequired, setAuthRequired] = useState(false);

  // Discussion modal
  const [activeDiscussion, setActiveDiscussion] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setAuthRequired(false);

    const modeParam = activeTab.toLowerCase().replace(' ', '-');

    if (activeTab === 'Following' && !user) {
      setPosts([]);
      setDiscussions([]);
      setKnowledge([]);
      setAuthRequired(true);
      setLoading(false);
      return;
    }

    Promise.allSettled([
      apiGet(`/posts?mode=${modeParam}`),
      apiGet(`/discussions?mode=${modeParam}`),
      apiGet(`/knowledge?mode=${modeParam}`),
    ])
      .then(([postsRes, discRes, knowRes]) => {
        if (!isMounted) return;

        let needsAuth = false;

        if (postsRes.status === 'fulfilled') {
          setPosts(postsRes.value?.posts || []);
        } else {
          if (postsRes.reason?.status === 401 || postsRes.reason?.code === 'AUTHENTICATION_REQUIRED') {
            needsAuth = true;
          }
          setPosts([]);
        }

        if (discRes.status === 'fulfilled') {
          setDiscussions(discRes.value?.discussions || []);
        } else {
          if (discRes.reason?.status === 401 || discRes.reason?.code === 'AUTHENTICATION_REQUIRED') {
            needsAuth = true;
          }
          setDiscussions([]);
        }

        if (knowRes.status === 'fulfilled') {
          setKnowledge(knowRes.value?.articles || []);
        } else {
          if (knowRes.reason?.status === 401 || knowRes.reason?.code === 'AUTHENTICATION_REQUIRED') {
            needsAuth = true;
          }
          setKnowledge([]);
        }

        if (needsAuth && activeTab === 'Following') {
          setAuthRequired(true);
        }
      })
      .catch((err) => {
        console.warn('[DiscoverView] Error fetching feed:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, user]);

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

  // Interleave and sort feed items according to the active tab and filters
  const combinedFeed = useMemo(() => {
    const pItems =
      contentTypeFilter === 'All' || contentTypeFilter === 'Posts'
        ? filteredPosts.map((p) => ({ ...p, feedItemType: 'post' }))
        : [];
    const dItems =
      contentTypeFilter === 'All' || contentTypeFilter === 'Discussions'
        ? filteredDiscussions.map((d) => ({ ...d, feedItemType: 'discussion' }))
        : [];
    const kItems =
      contentTypeFilter === 'All' || contentTypeFilter === 'Knowledge'
        ? filteredKnowledge.map((k) => ({ ...k, feedItemType: 'knowledge' }))
        : [];

    const combined = [...pItems, ...dItems, ...kItems];

    if (activeTab === 'Latest') {
      return combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (activeTab === 'Trending') {
      const getScore = (item) => {
        const likes = item.likeCount || item.votes || item.savesCount || 0;
        const comments = item.commentCount || item.commentsCount || 0;
        return likes * 2 + comments * 3;
      };
      return combined.sort((a, b) => getScore(b) - getScore(a));
    } else if (activeTab === 'Following') {
      return combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      // 'For you': algorithmic blend of engagement & freshness
      const getScore = (item) => {
        const likes = item.likeCount || item.votes || item.savesCount || 0;
        const comments = item.commentCount || item.commentsCount || 0;
        const ageHours = Math.max(1, (Date.now() - new Date(item.createdAt || Date.now()).getTime()) / 3600000);
        return (likes + comments * 2 + 5) / Math.pow(ageHours, 0.4);
      };
      return combined.sort((a, b) => getScore(b) - getScore(a));
    }
  }, [filteredPosts, filteredDiscussions, filteredKnowledge, contentTypeFilter, activeTab]);

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
          className="px-3 py-2.5 rounded-xl border border-[#e9e9ed] bg-white text-xs text-[#4a5265] focus:outline-none cursor-pointer"
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
          className="px-3 py-2.5 rounded-xl border border-[#e9e9ed] bg-white text-xs text-[#4a5265] focus:outline-none cursor-pointer"
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
        ) : authRequired ? (
          <div className="bg-white border border-[#e9e9ed] rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#fff0ee] text-[#e66c68] flex items-center justify-center text-xl font-bold mx-auto">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#17213f]">Follow people and circles to build your feed</h3>
            <p className="text-xs text-[#737b8d] leading-relaxed">
              Sign in to see thoughts, discussions, and articles from the people and communities you follow.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/login"
                className="bg-[#17213f] hover:bg-[#253358] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="border border-[#e9e9ed] hover:bg-[#f7f7f8] text-[#17213f] text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : combinedFeed.length === 0 ? (
          activeTab === 'Following' ? (
            <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-3 p-6 bg-white">
              <Compass className="w-8 h-8 text-[#e66c68] mx-auto opacity-80" />
              <p className="font-bold text-sm text-[#17213f]">Your Following feed is quiet</p>
              <p className="max-w-md mx-auto">
                You aren't following anyone yet or the creators you follow haven't posted recently.
              </p>
              <div>
                <Link
                  to="/people-companies"
                  className="inline-block bg-[#e66c68] hover:bg-[#d65b57] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer mt-2"
                >
                  Discover people & companies →
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-2 bg-white">
              <p className="font-semibold text-[#17213f]">No content found matching your filter.</p>
              <p>Publish a post or start a discussion to share your perspective with the community.</p>
            </div>
          )
        ) : (
          combinedFeed.map((item) => {
            if (item.feedItemType === 'discussion') {
              return (
                <DiscussionCard
                  key={`disc-${item._id}`}
                  discussion={item}
                  onOpenDetail={(disc) => setActiveDiscussion(disc)}
                />
              );
            } else if (item.feedItemType === 'knowledge') {
              return (
                <KnowledgeCard
                  key={`know-${item._id}`}
                  article={item}
                  onOpenReader={() => showToast(`Opening article: ${item.title}`)}
                />
              );
            } else {
              return <PostCard key={`post-${item._id}`} post={item} />;
            }
          })
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
