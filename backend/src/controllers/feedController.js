import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { User } from '../models/User.js';
import { getCircleContentFilter } from '../services/circleAccessService.js';
import {
  calculateTrendingScore,
  calculateForYouScore,
  normalizeFeedItem,
  interleaveFeedItems,
} from '../services/feedRankingService.js';

export const getUnifiedFeed = async (req, res, next) => {
  try {
    const filter = (req.query.filter || 'for-you').toLowerCase().trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const circleAccess = await getCircleContentFilter(req.user?._id);
    const accessibleQuery = (query) => ({ $and: [query, circleAccess] });

    const allowedFilters = ['for-you', 'trending', 'following', 'latest'];
    if (!allowedFilters.includes(filter)) {
      return res.status(400).json({
        error: `Invalid feed filter '${filter}'. Supported: ${allowedFilters.join(', ')}`,
      });
    }

    // 1. "Following" feed: strictly requires authentication
    if (filter === 'following') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Please log in to view posts from people you follow.',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      const currentUser = await User.findById(req.user._id).select('following');
      const followingIds = currentUser?.following || [];

      if (followingIds.length === 0) {
        return res.json({
          items: [],
          page,
          limit,
          hasMore: false,
          emptyReason: 'no_follows',
        });
      }

      // Query eligible content authored by followed accounts
      const [rawPosts, rawDiscussions, rawKnowledge] = await Promise.all([
        Post.find(accessibleQuery({ authorId: { $in: followingIds }, status: 'published' }))
          .sort({ createdAt: -1 })
          .limit(limit * 2)
          .lean(),
        Discussion.find(accessibleQuery({ authorId: { $in: followingIds }, status: { $ne: 'removed' } }))
          .sort({ createdAt: -1 })
          .limit(limit * 2)
          .lean(),
        KnowledgeArticle.find(accessibleQuery({ authorId: { $in: followingIds }, status: 'published' }))
          .sort({ createdAt: -1 })
          .limit(limit * 2)
          .lean(),
      ]);

      const all = [
        ...rawPosts.map((p) => normalizeFeedItem(p, 'post', req.user)),
        ...rawDiscussions.map((d) => normalizeFeedItem(d, 'discussion', req.user)),
        ...rawKnowledge.map((k) => normalizeFeedItem(k, 'knowledge', req.user)),
      ];

      // Sort newest first
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const items = all.slice(skip, skip + limit);
      return res.json({
        items,
        page,
        limit,
        hasMore: skip + limit < all.length,
      });
    }

    // 2. "Latest" feed: strict chronological across all 3 types
    if (filter === 'latest') {
      const [rawPosts, rawDiscussions, rawKnowledge] = await Promise.all([
        Post.find(accessibleQuery({ status: 'published' })).sort({ createdAt: -1 }).limit(skip + limit).lean(),
        Discussion.find(accessibleQuery({ status: { $ne: 'removed' } })).sort({ createdAt: -1 }).limit(skip + limit).lean(),
        KnowledgeArticle.find(accessibleQuery({ status: 'published' })).sort({ createdAt: -1 }).limit(skip + limit).lean(),
      ]);

      const all = [
        ...rawPosts.map((p) => normalizeFeedItem(p, 'post', req.user)),
        ...rawDiscussions.map((d) => normalizeFeedItem(d, 'discussion', req.user)),
        ...rawKnowledge.map((k) => normalizeFeedItem(k, 'knowledge', req.user)),
      ];

      all.sort((a, b) => {
        const timeDiff = new Date(b.createdAt) - new Date(a.createdAt);
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });

      const items = all.slice(skip, skip + limit);
      return res.json({
        items,
        page,
        limit,
        hasMore: skip + limit < all.length,
      });
    }

    // 3. "Trending" feed: time-decayed recent engagement score
    if (filter === 'trending') {
      const candidateLimit = Math.max(100, (skip + limit) * 2);
      const [rawPosts, rawDiscussions, rawKnowledge] = await Promise.all([
        Post.find(accessibleQuery({ status: 'published' })).sort({ createdAt: -1 }).limit(candidateLimit).lean(),
        Discussion.find(accessibleQuery({ status: { $ne: 'removed' } })).sort({ createdAt: -1 }).limit(candidateLimit).lean(),
        KnowledgeArticle.find(accessibleQuery({ status: 'published' })).sort({ createdAt: -1 }).limit(candidateLimit).lean(),
      ]);

      const candidates = [
        ...rawDiscussions.map((d) => ({
          item: normalizeFeedItem(d, 'discussion', req.user),
          score: calculateTrendingScore(d, 'discussion'),
        })),
        ...rawPosts.map((p) => ({
          item: normalizeFeedItem(p, 'post', req.user),
          score: calculateTrendingScore(p, 'post'),
        })),
        ...rawKnowledge.map((k) => ({
          item: normalizeFeedItem(k, 'knowledge', req.user),
          score: calculateTrendingScore(k, 'knowledge'),
        })),
      ];

      candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.item.createdAt) - new Date(a.item.createdAt);
      });

      const rankedItems = candidates.map((c) => c.item);
      const interleaved = interleaveFeedItems(rankedItems);
      const items = interleaved.slice(skip, skip + limit);

      return res.json({
        items,
        page,
        limit,
        hasMore: skip + limit < interleaved.length,
      });
    }

    // 4. "For You" feed: personalized, interleaved mix
    {
      const candidateLimit = Math.max(100, (skip + limit) * 2);

      let followedUserIdsSet = new Set();
      if (req.user) {
        const u = await User.findById(req.user._id).select('following');
        if (u?.following) {
          followedUserIdsSet = new Set(u.following.map((id) => id.toString()));
        }
      }

      const [rawPosts, rawDiscussions, rawKnowledge] = await Promise.all([
        Post.find(accessibleQuery({ status: 'published' })).sort({ createdAt: -1 }).limit(candidateLimit).lean(),
        Discussion.find(accessibleQuery({ status: { $ne: 'removed' } })).sort({ createdAt: -1 }).limit(candidateLimit).lean(),
        KnowledgeArticle.find(accessibleQuery({ status: 'published' })).sort({ createdAt: -1 }).limit(candidateLimit).lean(),
      ]);

      const candidates = [
        ...rawDiscussions.map((d) => ({
          item: normalizeFeedItem(d, 'discussion', req.user),
          score: calculateForYouScore(d, 'discussion', followedUserIdsSet),
        })),
        ...rawPosts.map((p) => ({
          item: normalizeFeedItem(p, 'post', req.user),
          score: calculateForYouScore(p, 'post', followedUserIdsSet),
        })),
        ...rawKnowledge.map((k) => ({
          item: normalizeFeedItem(k, 'knowledge', req.user),
          score: calculateForYouScore(k, 'knowledge', followedUserIdsSet),
        })),
      ];

      candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.item.createdAt) - new Date(a.item.createdAt);
      });

      const rankedItems = candidates.map((c) => c.item);
      const interleaved = interleaveFeedItems(rankedItems);
      const items = interleaved.slice(skip, skip + limit);

      return res.json({
        items,
        page,
        limit,
        hasMore: skip + limit < interleaved.length,
      });
    }
  } catch (err) {
    next(err);
  }
};
