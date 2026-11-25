import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { Search, Sparkles, Users, Compass } from 'lucide-react';
import PostCard from '../components/discover/PostCard';
import DiscussionCard from '../components/discover/DiscussionCard';
import KnowledgeCard from '../components/discover/KnowledgeCard';
import DiscussionDetailModal from '../components/discussion/DiscussionDetailModal';
import PostDetailModal from '../components/discover/PostDetailModal';
import Avatar from '../components/common/Avatar';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function DiscoverView() {
  const { onOpenCreate, showToast } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('For you'); // 'For you' | 'Trending' | 'Following' | 'Latest'
  const [contentTypeFilter, setContentTypeFilter] = useState('All'); // 'All' | 'Posts' | 'Discussions' | 'Knowledge'
  const [searchQuery, setSearchQuery] = useState('');

  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [focusPostReply, setFocusPostReply] = useState(false);

  // Discussion modal
  const [activeDiscussion, setActiveDiscussion] = useState(null);
  const handleDiscussionUpdate = useCallback((updatedDiscussion) => {
    setFeedItems((items) => items.map((item) => (
      item._id === updatedDiscussion._id ? { ...item, ...updatedDiscussion } : item
    )));
  }, []);

  // Fetch feed when activeTab changes
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

  // Content type & search filter
  const filteredItems = feedItems.filter((item) => {
    // 1. Content type filter
    if (contentTypeFilter === 'Posts' && item.type !== 'post') return false;
    if (contentTypeFilter === 'Discussions' && item.type !== 'discussion') return false;
    if (contentTypeFilter === 'Knowledge' && item.type !== 'knowledge') return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const bodyMatch = item.body?.toLowerCase().includes(q) || item.excerpt?.toLowerCase().includes(q);
      const authorMatch = item.authorName?.toLowerCase().includes(q);
      if (!titleMatch && !bodyMatch && !authorMatch) return false;
    }

    return true;
  });

  // Interleave and sort feed items according to the active tab and filters
  const combinedFeed = useMemo(() => {
    const combined = filteredItems.map((item) => ({
      ...item,
      feedItemType: item.type,
    }));

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
  }, [filteredItems, contentTypeFilter, activeTab]);

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
          <p className="text-xs sm:text-[13px] text-[#737b8d] mt-1 font-medium">
            Explore thoughts, open inquiries, and deep frameworks curated for builders and thinkers.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-[#737b8d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f7f7f8] border border-[#e9e9ed] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#17213f] focus:outline-none focus:ring-2 focus:ring-[#3f5ce8]"
          />
        </div>
      </div>

      {/* Feed Tabs & Content Type Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        {/* The 4 distinct server-backed query tabs */}
        <div className="flex bg-[#f7f7f8] p-1 rounded-2xl border border-[#e9e9ed] overflow-x-auto">
          {['For you', 'Trending', 'Following', 'Latest'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-[#17213f] shadow-xs'
                  : 'text-[#737b8d] hover:text-[#17213f]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content-type selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['All', 'Posts', 'Discussions', 'Knowledge'].map((type) => (
            <button
              key={type}
              onClick={() => setContentTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                contentTypeFilter === type
                  ? 'bg-[#17213f] text-white'
                  : 'bg-[#f7f7f8] text-[#737b8d] hover:text-[#17213f]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

      </div>

      {/* Inline Post Composer */}
      {user && (
        <div
          onClick={() => onOpenCreate && onOpenCreate('Post')}
          className="border border-[#e9e9ed] rounded-2xl p-4 bg-white flex items-center gap-3 shadow-2xs hover:border-[#dedee5] transition-colors cursor-pointer"
        >
          <Avatar
            initials={user.initials || 'OP'}
            color={user.avatarColor || 'purple'}
            src={user.avatar}
            size="w-8 h-8 text-[11px]"
          />
          <div className="flex-1 text-xs text-[#737b8d] font-medium">
            Share a thought, perspective, or question with the community...
          </div>
          <button className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-[0_2px_0_#2b41ab] transition-all">
            Share
          </button>
        </div>
      )}

      {/* Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#8b92a1]">Loading feed items...</div>
        ) : error ? (
          <div className="bg-white border border-[#e9e9ed] rounded-3xl p-10 text-center space-y-3">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm font-bold text-[#17213f]">Could not load feed</p>
            <p className="text-xs text-[#737b8d] max-w-sm mx-auto">{error}</p>
            <button
              onClick={() => setActiveTab((tab) => tab)}
              className="mt-2 bg-[#f7f7f8] hover:bg-[#ececf0] text-[#17213f] text-xs font-bold px-4 py-2 rounded-xl border border-[#e9e9ed]"
            >
              Retry
            </button>
          </div>
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
              return (
                <PostCard
                  key={`post-${item._id}`}
                  post={item}
                  onOpenDetail={(post, focusReply = false) => {
                    setFocusPostReply(focusReply);
                    setActivePost(post);
                  }}
                  onPostUpdated={(updatedPost) => {
                    setFeedItems((items) => items.map((feedItem) => (
                      feedItem._id === updatedPost._id ? { ...feedItem, ...updatedPost } : feedItem
                    )));
                  }}
                />
              );
            }
          })
        )}
      </div>

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
            if (typeof discussion === 'string') {
              apiGet(`/discussions/${discussion}`).then((res) => {
                if (res?.discussion) setActiveDiscussion(res.discussion);
              });
            } else {
              setActiveDiscussion(discussion);
            }
          }}
          onOpenCreateKnowledge={async (post) => {
            setActivePost(null);
            try {
              const res = await apiPost(`/posts/${post._id}/knowledge-drafts`, {});
              if (res?.draft?._id) {
                showToast('Knowledge studio opened from post');
                navigate(`/knowledge/studio/${res.draft._id}`);
              }
            } catch (err) {
              alert(err.message || 'Could not start Knowledge draft');
            }
          }}
          onPostUpdated={(updatedPost) => {
            setActivePost(updatedPost);
            setFeedItems((items) => items.map((feedItem) => (
              feedItem._id === updatedPost._id ? { ...feedItem, ...updatedPost } : feedItem
            )));
          }}
        />
      )}

      {/* Discussion Detail Modal */}
      {activeDiscussion && (
        <DiscussionDetailModal
          discussion={activeDiscussion}
          onClose={() => setActiveDiscussion(null)}
          onDiscussionUpdate={handleDiscussionUpdate}
          onOpenPost={(postId) => {
            setActiveDiscussion(null);
            apiGet(`/posts/${postId}`).then((res) => {
              if (res?.post) setActivePost(res.post);
            });
          }}
          onOpenAiStudio={async (discussion) => {
            setActiveDiscussion(null);
            try {
              const res = await apiPost(`/discussions/${discussion._id}/knowledge-drafts`, {});
              if (res?.draft?._id) {
                showToast('Knowledge studio opened for discussion');
                navigate(`/knowledge/studio/${res.draft._id}`);
              }
            } catch (err) {
              alert(err.message || 'Could not start Knowledge draft');
            }
          }}
        />
      )}
    </div>
  );
}
