import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { CircleMembership } from '../models/CircleMembership.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { getCircleContentFilter } from '../services/circleAccessService.js';
import { issueGuestPreviewToken, getGuestPreviewSeconds } from '../middleware/guestPreview.js';
import { areDemoAccountsEnabled, getSeedPassword } from '../config/demoAccounts.js';

const seededDemoUsernames = ['shubham', 'jamie', 'alicia', 'devon', 'sarah', 'chloe', 'rahul'];

export const getDemoAccounts = async (req, res, next) => {
  try {
    if (!areDemoAccountsEnabled()) {
      return res.json({ enabled: false, accounts: [] });
    }
    const password = getSeedPassword();

    const users = await User.find({ username: { $in: seededDemoUsernames }, accountStatus: 'active' })
      .select('_id username email platformRole')
      .lean();
    const userIds = users.map((user) => user._id);
    const [circles, memberships] = await Promise.all([
      Circle.find({
        status: 'active',
        $or: [
          { ownerId: { $in: userIds } },
          { members: { $in: userIds } },
          { moderators: { $in: userIds } },
        ],
      })
        .select('_id name ownerId members moderators')
        .lean(),
      CircleMembership.find({ userId: { $in: userIds }, status: 'active' })
        .select('circleId userId role')
        .lean(),
    ]);

    const membershipByUserAndCircle = new Map(
      memberships.map((membership) => [
        `${membership.userId}:${membership.circleId}`,
        membership.role,
      ])
    );
    const accounts = users.map((user) => ({
      username: user.username,
      email: user.email,
      password,
      platformRole: user.platformRole || 'user',
      circleRoles: circles.flatMap((circle) => {
        const role = membershipByUserAndCircle.get(`${user._id}:${circle._id}`)
          || (circle.ownerId?.toString() === user._id.toString()
            ? 'owner'
            : circle.moderators?.some((moderatorId) => moderatorId.toString() === user._id.toString())
              ? 'moderator'
              : null);
        return ['owner', 'admin', 'moderator'].includes(role)
          ? [{ circleName: circle.name, role }]
          : [];
      }),
    }));

    res.json({ enabled: true, accounts });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/session/preview-token
 * Issues or returns status of guest preview token
 */
export const getPreviewSession = async (req, res) => {
  const guestToken = req.headers['x-guest-preview-token'];
  const maxSeconds = getGuestPreviewSeconds();

  if (!guestToken) {
    const token = issueGuestPreviewToken();
    return res.json({
      token,
      maxSeconds,
      remainingSeconds: maxSeconds,
      isExpired: false,
    });
  }

  return res.json({
    token: guestToken,
    maxSeconds,
    remainingSeconds: req.guestSession?.remainingSeconds ?? maxSeconds,
    isExpired: (req.guestSession?.remainingSeconds ?? maxSeconds) <= 0,
  });
};

/**
 * GET /api/public/discover
 * Read-only public feed for visitors within 120s preview
 */
export const getPublicDiscover = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const circleAccess = await getCircleContentFilter(req.user?._id);
    const accessibleQuery = (query) => ({ $and: [query, circleAccess] });

    const [posts, discussions, knowledge] = await Promise.all([
      Post.find(accessibleQuery({ status: 'published' }))
        .select('_id authorName authorInitials authorColor title body tags imageUrl likeCount commentCount commentsCount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Discussion.find(accessibleQuery({ status: { $nin: ['removed', 'closed'] } }))
        .select('_id authorName authorInitials authorColor title body category tags votes commentsCount contributorsCount status createdAt')
        .sort({ votes: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      KnowledgeArticle.find(accessibleQuery({ status: 'published' }))
        .select('_id authorName authorInitials authorColor title excerpt category tags readTimeMinutes helpfulVotes saveCount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      posts,
      discussions,
      knowledge,
      page,
      limit,
      remainingGuestSeconds: req.guestSession?.remainingSeconds ?? null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/posts/:postId
 * Single post read
 */
export const getPublicPostById = async (req, res, next) => {
  try {
    const post = await Post.findOne({
      $and: [
        { _id: req.params.postId, status: 'published' },
        await getCircleContentFilter(req.user?._id),
      ],
    })
      .select('_id authorName authorInitials authorColor title body tags imageUrl likeCount commentCount commentsCount createdAt')
      .lean();

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unavailable' });
    }

    res.json({ post });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/discussions/:discussionId
 * Reconciled public discussion detail and active visible contributions
 */
export const getPublicDiscussionById = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const discussion = await Discussion.findOne({
      $and: [
        { _id: discussionId, status: { $nin: ['removed', 'closed'] } },
        await getCircleContentFilter(req.user?._id),
      ],
    }).lean();

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    // Retrieve visible contributions
    const contributions = await DiscussionContribution.find({
      discussionId: discussion._id,
      status: 'active',
    })
      .select('_id authorName authorInitials authorColor body votes createdAt')
      .sort({ votes: -1, createdAt: 1 })
      .lean();

    // Reconcile truthful counts from records
    const distinctContributors = new Set(contributions.map((c) => c.authorName)).size;
    const reconciledDiscussion = {
      ...discussion,
      votes: discussion.votes || 0,
      commentsCount: contributions.length,
      contributorsCount: distinctContributors,
    };

    res.json({
      discussion: reconciledDiscussion,
      contributions,
      totalContributions: contributions.length,
      distinctContributors,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/knowledge/:articleId
 */
export const getPublicKnowledgeById = async (req, res, next) => {
  try {
    const article = await KnowledgeArticle.findOne({
      $and: [
        { _id: req.params.articleId, status: 'published' },
        await getCircleContentFilter(req.user?._id),
      ],
    })
      .select('_id authorName authorInitials authorColor title excerpt body category tags readTimeMinutes keyTakeaways references helpfulVotes saveCount createdAt')
      .lean();

    if (!article) {
      return res.status(404).json({ error: 'Knowledge article not found or unpublished' });
    }

    res.json({ article });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/users/:username
 * Public profile strictly excluding email, private settings, verification tokens
 */
export const getPublicUserByUsername = async (req, res, next) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    const user = await User.findOne({ username })
      .select('username displayName headline bio initials avatarColor avatar platformRole followersCount followingCount createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch user's public posts
    const posts = await Post.find({
      $and: [
        { $or: [{ authorName: user.displayName }, { authorId: user._id }], status: 'published' },
        await getCircleContentFilter(req.user?._id),
      ],
    })
      .select('_id title body tags likeCount commentsCount createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      user,
      posts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/public/circles/:slugOrId
 */
export const getPublicCircle = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const circleClauses = [{ slug: slugOrId }];
    if (mongoose.Types.ObjectId.isValid(slugOrId)) circleClauses.push({ _id: slugOrId });
    const circle = await Circle.findOne({
      $or: circleClauses,
      visibility: 'public',
      status: 'active',
    })
      .select('name slug description icon category membersCount avatar coverImage createdAt')
      .lean();

    if (!circle) {
      return res.status(404).json({ error: 'Circle not found or is private' });
    }

    res.json({ circle });
  } catch (err) {
    next(err);
  }
};
