import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Users,
  Compass,
  Bell,
  Moon,
  Sun,
  Flame,
  Zap,
  BookOpen,
  MessageSquare,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import PostCard from '../components/discover/PostCard';
import DiscussionCard from '../components/discover/DiscussionCard';
import KnowledgeCard from '../components/discover/KnowledgeCard';
import PostDetailModal from '../components/discover/PostDetailModal';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const TRENDING_STYLES = [
  {
    gradient: 'from-[#fff3eb] to-[#ffe5d4] border-[#ffd5bc] text-[#7c3917]',
    defaultImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
    avatars: ['RP', 'AK', 'MT'],
  },
  {
    gradient: 'from-[#f1effe] to-[#e4e0fd] border-[#d2cbfa] text-[#422e8f]',
    defaultImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    avatars: ['AI', 'DL', 'SB'],
  },
  {
    gradient: 'from-[#e9f9f1] to-[#d3f4e2] border-[#b8eccf] text-[#1c653f]',
    defaultImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
    avatars: ['SL', 'KM', 'VR'],
  },
  {
    gradient: 'from-[#fff8e7] to-[#fff0cc] border-[#ffe5a4] text-[#805f14]',
    defaultImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
    avatars: ['ZN', 'DR', 'OP'],
  },
];

const FALLBACK_TRENDING = [
  {
    title: 'How can we make remote work feel less isolating?',
    replies: '842 replies',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'The future of AI in education: Personalized learning vs mentorship',
    replies: '1.2k replies',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: "What's your favourite productivity tool? 🤔",
    replies: '523 replies',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Ideas to improve Orvexa?',
    replies: '721 replies',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
  },
];

export default function DiscoverView() {
  const { onOpenCreate, showToast, darkMode, toggleDarkMode } = useOutletContext?.() || {
    onOpenCreate: () => {},
    showToast: () => {},
    darkMode: false,
    toggleDarkMode: () => {},
  };
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('For you'); // 'For you' | 'Trending' | 'Following' | 'Latest'
  const [contentTypeFilter, setContentTypeFilter] = useState('All'); // 'All' | 'Posts' | 'Discussions' | 'Knowledge'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [focusPostReply, setFocusPostReply] = useState(false);
  const [trendingDiscussions, setTrendingDiscussions] = useState([]);

  // Fetch real trending discussions
  useEffect(() => {
    let isMounted = true;
    apiGet('/discussions?mode=trending&limit=4')
      .then((res) => {
        if (!isMounted) return;
        const list = res?.discussions || [];
        if (list.length > 0) {
          setTrendingDiscussions(list);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch feed items
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setAuthRequired(false);

    const modeParam = activeTab.toLowerCase().replace(' ', '-');

    if (activeTab === 'Following' && !user) {
      setFeedItems([]);
      setAuthRequired(true);
      setLoading(false);
      return;
    }

    apiGet(`/feed?filter=${modeParam}&page=1&limit=50`)
      .then((res) => {
        if (!isMounted) return;
        setFeedItems(res?.items || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err.status === 401 || err.code === 'AUTHENTICATION_REQUIRED') {
          setAuthRequired(true);
        } else {
          setError(err.message || 'Failed to load feed');
        }
        setFeedItems([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, user]);

  const handlePostUpdated = useCallback((updatedPost) => {
    setFeedItems((items) =>
      items.map((feedItem) =>
        feedItem._id === updatedPost._id ? { ...feedItem, ...updatedPost } : feedItem
      )
    );
  }, []);

  // Filter items based on content-type and search query
  const filteredItems = useMemo(() => {
    return feedItems.filter((item) => {
      if (contentTypeFilter === 'Posts' && item.type !== 'post') return false;
      if (contentTypeFilter === 'Discussions' && item.type !== 'discussion') return false;
      if (contentTypeFilter === 'Knowledge' && item.type !== 'knowledge') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const bodyMatch = item.body?.toLowerCase().includes(q) || item.summary?.toLowerCase().includes(q);
        const authorMatch = item.authorName?.toLowerCase().includes(q);
        if (!titleMatch && !bodyMatch && !authorMatch) return false;
      }

      return true;
    });
  }, [feedItems, contentTypeFilter, searchQuery]);

  const combinedFeed = useMemo(() => {
    const combined = [...filteredItems];

    if (sortBy === 'newest' || activeTab === 'Latest') {
      return combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'saved') {
      return combined.sort((a, b) => (b.savesCount || 0) - (a.savesCount || 0));
    } else {
      // Trending: engagement score
      const getScore = (item) => {
        const likes = item.likeCount || item.votes || item.savesCount || 0;
        const comments = item.commentCount || item.commentsCount || 0;
        return likes * 2 + comments * 3;
      };
      return combined.sort((a, b) => getScore(b) - getScore(a));
    }
  }, [filteredItems, sortBy, activeTab]);

  return (
    <div className="space-y-7 font-sans pb-24">
      {/* 1. Header with Search & Icons (as shown in reference) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
        <div className="w-full sm:max-w-2xl relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything — posts, discussions, people, knowledge..."
            className="w-full pl-11 pr-4 py-3 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#e66c68] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            to="/discover"
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Explore"
          >
            <Compass className="w-4 h-4" />
          </Link>

          <Link
            to="/notifications"
            className="relative p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#e66c68]" />
          </Link>

          <Link to="/profile" className="cursor-pointer">
            <Avatar
              initials={user?.initials || 'OP'}
              color={user?.avatarColor || 'purple'}
              size="w-9 h-9 text-xs"
            />
          </Link>
        </div>
      </div>

      {/* 2. Trending in Orvexa 🔥 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e66c68]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Trending in Orvexa 🔥
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('Trending');
              setContentTypeFilter('Discussions');
            }}
            className="text-xs font-bold text-[#e66c68] hover:underline cursor-pointer"
          >
            See all →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {(trendingDiscussions.length > 0 ? trendingDiscussions : FALLBACK_TRENDING).slice(0, 4).map((item, idx) => {
            const style = TRENDING_STYLES[idx % TRENDING_STYLES.length];
            const title = item.title;
            const repliesText = item.replies || `${item.contributionCount || item.commentsCount || 0} replies`;
            const image = item.coverImage || item.imageUrl || item.image || style.defaultImage;
            const discussionId = item._id;

            const handleCardClick = () => {
              if (discussionId) {
                navigate(`/discussions/${discussionId}`);
              } else {
                // Find matching discussion from feed if available
                const match = feedItems.find(
                  (f) => f.contentType === 'Discussion' && f.title?.toLowerCase().includes(title.toLowerCase().slice(0, 15))
                );
                if (match?._id) {
                  navigate(`/discussions/${match._id}`);
                } else {
                  setContentTypeFilter('Discussions');
                  setActiveTab('Trending');
                }
              }
            };

            return (
              <div
                key={discussionId || idx}
                onClick={handleCardClick}
                className={`rounded-3xl p-4 border bg-gradient-to-br ${style.gradient} shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[125px] overflow-hidden group`}
              >
                <h3 className="text-xs sm:text-[13px] font-black leading-snug line-clamp-2 text-slate-900 dark:text-slate-900">
                  {title}
                </h3>

                <div className="flex items-end justify-between gap-1 pt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="flex items-center -space-x-1.5 shrink-0">
                      {style.avatars.map((av, avIdx) => (
                        <div
                          key={avIdx}
                          className="w-5 h-5 rounded-full border border-white dark:border-slate-800 bg-slate-800 text-white text-[8px] font-bold flex items-center justify-center shrink-0"
                        >
                          {av}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10.5px] font-bold opacity-90 truncate text-slate-800">
                      {repliesText}
                    </span>
                  </div>

                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shrink-0 shadow-2xs border border-white/60 dark:border-slate-800">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Jump Into Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#e66c68]" />
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Jump into
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setContentTypeFilter('Discussions')}
            className="p-3.5 sm:p-4 rounded-3xl border border-purple-200/90 dark:border-purple-900/50 bg-[#f5f3ff] dark:bg-purple-950/30 text-left hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#7c3aed] dark:text-purple-300 flex items-center justify-center mb-2">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs font-black text-[#581c87] dark:text-purple-200">Discussions</div>
            <div className="text-[11px] text-[#7e22ce] dark:text-purple-300/90 font-semibold group-hover:translate-x-0.5 transition-transform">
              Join conversations →
            </div>
          </button>

          <Link
            to="/knowledge"
            className="p-3.5 sm:p-4 rounded-3xl border border-amber-200/90 dark:border-amber-900/50 bg-[#fffbeb] dark:bg-amber-950/30 text-left hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-[#d97706] dark:text-amber-300 flex items-center justify-center mb-2">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-xs font-black text-[#78350f] dark:text-amber-200">Knowledge</div>
            <div className="text-[11px] text-[#b45309] dark:text-amber-300/90 font-semibold group-hover:translate-x-0.5 transition-transform">
              Read & learn →
            </div>
          </Link>

          <Link
            to="/people"
            className="p-3.5 sm:p-4 rounded-3xl border border-emerald-200/90 dark:border-emerald-900/50 bg-[#ecfdf5] dark:bg-emerald-950/30 text-left hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-[#059669] dark:text-emerald-300 flex items-center justify-center mb-2">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs font-black text-[#064e3b] dark:text-emerald-200">People</div>
            <div className="text-[11px] text-[#047857] dark:text-emerald-300/90 font-semibold group-hover:translate-x-0.5 transition-transform">
              Find your people →
            </div>
          </Link>

          <Link
            to="/circles"
            className="p-3.5 sm:p-4 rounded-3xl border border-rose-200/90 dark:border-rose-900/50 bg-[#fff1f2] dark:bg-rose-950/30 text-left hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-[#e11d48] dark:text-rose-300 flex items-center justify-center mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xs font-black text-[#881337] dark:text-rose-200">Circles</div>
            <div className="text-[11px] text-[#be123c] dark:text-rose-300/90 font-semibold group-hover:translate-x-0.5 transition-transform">
              Explore communities →
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Filter Controls & Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#f0f0f2] dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['For you', 'Following', 'Latest'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-[#e66c68] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab === 'For you' && <Sparkles className="w-3.5 h-3.5" />}
              {tab === 'Following' && <Users className="w-3.5 h-3.5" />}
              {tab === 'Latest' && <Zap className="w-3.5 h-3.5" />}
              <span>{tab}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          {/* Content Type Filter Pills */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['All', 'Posts', 'Discussions', 'Knowledge'].map((type) => (
              <button
                key={type}
                onClick={() => setContentTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  contentTypeFilter === type
                    ? 'bg-white dark:bg-slate-700 text-[#17213f] dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300">
            <span className="text-[11px] text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="trending" className="dark:bg-slate-800">Trending</option>
              <option value="newest" className="dark:bg-slate-800">Newest</option>
              <option value="saved" className="dark:bg-slate-800">Most Saved</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Card Feed */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4 max-w-2xl mx-auto'}>
        {loading ? (
          <div className="col-span-full py-20 text-center text-xs text-slate-400">
            Loading your personalized feed...
          </div>
        ) : authRequired ? (
          <div className="col-span-full py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <h3 className="text-base font-bold text-[#17213f] dark:text-white">Sign in to see your following feed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Follow thinkers, builders, and community leaders to build your custom stream.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 bg-[#3f5ce8] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        ) : combinedFeed.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
            <h3 className="text-base font-bold text-[#17213f] dark:text-white">No items found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share a post or start a discussion to kick things off!
            </p>
          </div>
        ) : (
          combinedFeed.map((item) => {
            if (item.feedItemType === 'knowledge' || item.type === 'knowledge') {
              return (
                <KnowledgeCard
                  key={`know-${item._id}`}
                  article={item}
                  onOpenReader={(art) => navigate(`/knowledge/${art._id}`)}
                />
              );
            } else if (item.feedItemType === 'discussion' || item.type === 'discussion') {
              return (
                <DiscussionCard
                  key={`disc-${item._id}`}
                  discussion={item}
                  onOpenDetail={(disc) => navigate(`/discussions/${disc._id}`)}
                />
              );
            } else {
              return (
                <PostCard
                  key={`post-${item._id}`}
                  post={item}
                  onPostUpdated={handlePostUpdated}
                  onOpenDetail={(p, focusReply = false) => {
                    setFocusPostReply(focusReply);
                    setActivePost(p);
                  }}
                />
              );
            }
          })
        )}
      </div>

      {/* Floating Action Button (+) */}
      <button
        type="button"
        onClick={() => onOpenCreate && onOpenCreate('Post')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-[#e66c68] to-[#f08573] text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 cursor-pointer"
        title="Create new post, discussion, or knowledge"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Post Detail Modal */}
      {activePost && (
        <PostDetailModal
          post={activePost}
          focusReply={focusPostReply}
          onClose={() => {
            setActivePost(null);
            setFocusPostReply(false);
          }}
          onOpenDiscussion={(discussion) => {
            setActivePost(null);
            const discId = typeof discussion === 'string' ? discussion : discussion?._id;
            if (discId) navigate(`/discussions/${discId}`);
          }}
          onOpenCreateKnowledge={async (post) => {
            setActivePost(null);
            try {
              const res = await apiPost(`/posts/${post._id}/knowledge-drafts`, {});
              if (res?.draft?._id) {
                showToast?.('Knowledge studio opened from post');
                navigate(`/knowledge/studio/${res.draft._id}`);
              }
            } catch (err) {
              alert(err.message || 'Could not start Knowledge draft');
            }
          }}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
}
