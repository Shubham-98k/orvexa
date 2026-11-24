import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { User } from '../models/User.js';

/**
 * Calculates time-decayed trending score for an item:
 * trendingScore = (recentEngagementScore / ageDecayFactor) * qualityMultiplier
 */
export function calculateTrendingScore(item, type) {
  const now = Date.now();
  const createdTime = new Date(item.createdAt || now).getTime();
  const ageHours = Math.max(0.1, (now - createdTime) / (1000 * 60 * 60));
  // Standard gravity decay: (age + 2)^1.5
  const ageDecay = Math.pow(ageHours + 2, 1.5);

  let rawEngagement = 0;
  if (type === 'discussion') {
    const votes = Array.isArray(item.voters) ? item.voters.length : (item.votes || 0);
    const contributions = item.commentsCount || 0;
    const contributors = item.contributorsCount || 0;
    rawEngagement = votes * 2.0 + contributions * 3.0 + contributors * 1.5;
  } else if (type === 'post') {
    const likes = Array.isArray(item.likes) ? item.likes.length : (item.likeCount || 0);
    const comments = item.commentsCount || 0;
    rawEngagement = likes * 1.5 + comments * 2.5;
  } else if (type === 'knowledge') {
    const helpful = item.helpfulVotes || 0;
    const saves = item.saveCount || 0;
    rawEngagement = helpful * 2.0 + saves * 3.0;
  }

  const qualityMultiplier = item.body && item.body.length > 100 ? 1.2 : 1.0;
  return (rawEngagement + 1) / ageDecay * qualityMultiplier;
}

/**
 * Calculates personalized "For You" score:
 * Base recency + followed author boost + engagement
 */
export function calculateForYouScore(item, type, followedUserIdsSet) {
  const authorIdStr = item.authorId ? item.authorId.toString() : '';
  const isFollowed = followedUserIdsSet.has(authorIdStr);

  const now = Date.now();
  const createdTime = new Date(item.createdAt || now).getTime();
  const ageHours = Math.max(0.1, (now - createdTime) / (1000 * 60 * 60));
  const recencyScore = 100 / (ageHours + 1);

  let engagementScore = 0;
  if (type === 'discussion') {
    const votes = Array.isArray(item.voters) ? item.voters.length : (item.votes || 0);
    const contributions = item.commentsCount || 0;
    engagementScore = votes * 1.5 + contributions * 2.0;
  } else if (type === 'post') {
    const likes = Array.isArray(item.likes) ? item.likes.length : (item.likeCount || 0);
    engagementScore = likes * 1.5;
  } else if (type === 'knowledge') {
    engagementScore = (item.helpfulVotes || 0) * 2.0;
  }

  const followedBoost = isFollowed ? 35 : 0;
  return recencyScore + engagementScore + followedBoost;
}

/**
 * Normalizes item to common feed item contract.
 */
export function normalizeFeedItem(item, type, currentUser) {
  const id = item._id.toString();
  const createdAt = item.createdAt;

  if (type === 'discussion') {
    const votes = Array.isArray(item.voters) ? item.voters.length : (item.votes || 0);
    const contributions = item.commentsCount || 0;
    const contributors = item.contributorsCount || 0;
    const viewerVote = currentUser && Array.isArray(item.voters)
      ? (item.voters.some((v) => v.toString() === currentUser._id.toString()) ? 1 : 0)
      : 0;

    return {
      id,
      _id: item._id,
      type: 'discussion',
      contentType: 'discussion',
      title: item.title,
      body: item.body,
      category: item.category || 'General',
      tags: item.tags || [],
      status: item.status || 'open',
      createdAt,
      authorId: item.authorId,
      authorName: item.authorName,
      authorInitials: item.authorInitials,
      authorColor: item.authorColor,
      author: {
        id: item.authorId,
        displayName: item.authorName,
        initials: item.authorInitials,
        color: item.authorColor,
      },
      engagement: {
        voteCount: votes,
        contributionCount: contributions,
        contributorCount: contributors,
      },
      votes,
      voteCount: votes,
      commentsCount: contributions,
      contributionCount: contributions,
      contributorsCount: contributors,
      contributorCount: contributors,
      viewerVote,
      hasUpvoted: viewerVote === 1,
    };
  }

  if (type === 'post') {
    const likes = Array.isArray(item.likes) ? item.likes.length : (item.likeCount || 0);
    const hasLiked = currentUser && Array.isArray(item.likes)
      ? item.likes.some((l) => l.toString() === currentUser._id.toString())
      : false;

    return {
      id,
      _id: item._id,
      type: 'post',
      contentType: 'post',
      title: item.title || null,
      body: item.body,
      imageUrl: item.imageUrl || null,
      tags: item.tags || [],
      circleName: item.circleName || null,
      createdAt,
      authorId: item.authorId,
      authorName: item.authorName,
      authorInitials: item.authorInitials,
      authorColor: item.authorColor,
      author: {
        id: item.authorId,
        displayName: item.authorName,
        initials: item.authorInitials,
        color: item.authorColor,
      },
      engagement: {
        likeCount: likes,
        commentCount: item.commentsCount || 0,
      },
      likeCount: likes,
      likes,
      hasLiked,
      commentsCount: item.commentsCount || 0,
    };
  }

  if (type === 'knowledge') {
    return {
      id,
      _id: item._id,
      type: 'knowledge',
      contentType: 'knowledge',
      title: item.title,
      excerpt: item.excerpt || (item.body ? item.body.slice(0, 180) + '...' : ''),
      body: item.body,
      category: item.category || 'Article',
      tags: item.tags || [],
      readTimeMinutes: item.readTimeMinutes || 4,
      createdAt,
      authorId: item.authorId,
      authorName: item.authorName,
      authorInitials: item.authorInitials,
      authorColor: item.authorColor,
      author: {
        id: item.authorId,
        displayName: item.authorName,
        initials: item.authorInitials,
        color: item.authorColor,
      },
      engagement: {
        helpfulVotes: item.helpfulVotes || 0,
        saveCount: item.saveCount || 0,
      },
      helpfulVotes: item.helpfulVotes || 0,
      saveCount: item.saveCount || 0,
    };
  }

  return item;
}

/**
 * Interleaves items across different content types to prevent long single-type runs.
 */
export function interleaveFeedItems(rankedCandidates) {
  if (rankedCandidates.length <= 1) return rankedCandidates;

  const result = [];
  const remaining = [...rankedCandidates];

  while (remaining.length > 0) {
    const lastType = result.length > 0 ? result[result.length - 1].type : null;
    const secondLastType = result.length > 1 ? result[result.length - 2].type : null;

    // If the last 2 items were the same type, try to pick the highest-ranked alternative type
    if (lastType && lastType === secondLastType) {
      const altIndex = remaining.findIndex((item) => item.type !== lastType);
      if (altIndex !== -1) {
        result.push(remaining.splice(altIndex, 1)[0]);
        continue;
      }
    }

    result.push(remaining.shift());
  }

  return result;
}
