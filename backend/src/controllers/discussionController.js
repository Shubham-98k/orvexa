import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { authorizeCircleContent, withCircleContentAccess } from '../services/circleAccessService.js';

const findAccessibleDiscussion = async (discussionId, userId) =>
  Discussion.findOne(await withCircleContentAccess({
    _id: discussionId,
    status: { $nin: ['removed', 'closed'] },
  }, userId));

/**
 * Reconciles discussion counts accurately against persisted records:
 * - contributionCount: count of persisted visible contribution documents.
 * - contributorCount: distinct authorIds (or authorNames) in those contributions.
 * - voteCount: actual count of voters in discussion.voters array.
 */
export async function reconcileDiscussionCounts(discussionId) {
  const contributions = await DiscussionContribution.find({
    discussionId,
    status: 'active',
  }).select('authorId authorName authorInitials authorColor body createdAt');

  const contributionCount = contributions.length;
  const distinctContributors = new Set(
    contributions.map((c) => (c.authorId ? c.authorId.toString() : c.authorName))
  ).size;

  const discussion = await Discussion.findById(discussionId);
  if (!discussion) return null;

  const voteCount = Array.isArray(discussion.voters) ? discussion.voters.length : 0;

  discussion.commentsCount = contributionCount;
  discussion.contributorsCount = distinctContributors;
  discussion.votes = voteCount;

  await discussion.save();

  return {
    contributionCount,
    contributorCount: distinctContributors,
    voteCount,
    discussion,
    contributions,
  };
}

export const getDiscussions = async (req, res, next) => {
  try {
    const { category, sort, status, mode, page = 1, limit = 20 } = req.query;
    let query = { status: { $nin: ['removed', 'closed'] } };
    if (category && category !== 'All categories') query.category = category;
    if (status && status !== 'All statuses') query.status = status.toLowerCase().replace(' ', '_');

    // 1. "Following" feed: requires authenticated user and following list
    if (mode === 'following') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Please log in to view discussions from people you follow.',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }
      const currentUser = await User.findById(req.user._id);
      const followingIds = currentUser?.following || [];
      if (followingIds.length === 0) {
        return res.json({ discussions: [] });
      }
      query.authorId = { $in: followingIds };
    }

    let sortObj = { votes: -1, createdAt: -1 };
    if (mode === 'latest' || sort === 'Newest' || sort === 'latest') sortObj = { createdAt: -1 };
    else if (mode === 'trending' || sort === 'Most discussed') sortObj = { votes: -1, commentsCount: -1, createdAt: -1 };
    else if (mode === 'for-you' || mode === 'for you') sortObj = { votes: -1, createdAt: -1 };

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10));

    const rawDiscussions = await Discussion.find(await withCircleContentAccess(query, req.user?._id))
      .sort(sortObj)
      .skip(skip)
      .limit(Math.min(50, parseInt(limit, 10)))
      .lean();

    const discussions = rawDiscussions.map((d) => {
      const voteCount = Array.isArray(d.voters) ? d.voters.length : (d.votes || 0);
      const viewerVote = req.user && Array.isArray(d.voters)
        ? (d.voters.some((v) => v.toString() === req.user._id.toString()) ? 1 : 0)
        : 0;

      return {
        ...d,
        votes: voteCount,
        voteCount,
        contributionCount: d.commentsCount || 0,
        contributorCount: d.contributorsCount || 0,
        viewerVote,
        hasUpvoted: viewerVote === 1,
      };
    });

    res.json({ discussions });
  } catch (err) {
    next(err);
  }
};

export const getDiscussionById = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const accessibleDiscussion = await findAccessibleDiscussion(discussionId, req.user?._id);
    if (!accessibleDiscussion) return res.status(404).json({ error: 'Discussion not found' });
    const reconciled = await reconcileDiscussionCounts(discussionId);
    if (!reconciled) return res.status(404).json({ error: 'Discussion not found' });

    const { discussion, contributions, contributionCount, contributorCount, voteCount } = reconciled;

    const viewerVote = req.user && Array.isArray(discussion.voters)
      ? (discussion.voters.some((v) => v.toString() === req.user._id.toString()) ? 1 : 0)
      : 0;

    let originPost = null;
    if (discussion.originPostId) {
      originPost = await Post.findById(discussion.originPostId)
        .select('_id title body authorName authorInitials authorColor createdAt')
        .lean();
    }

    res.json({
      discussion: {
        ...discussion.toObject(),
        votes: voteCount,
        voteCount,
        contributionCount,
        contributorCount,
        viewerVote,
        hasUpvoted: viewerVote === 1,
        originPost,
      },
      contributions,
      totalContributions: contributionCount,
      distinctContributors: contributorCount,
    });
  } catch (err) {
    next(err);
  }
};

export const createDiscussion = async (req, res, next) => {
  try {
    const { title, body, category, tags, imageUrl, circleId, visibility } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and context are required' });
    }
    const circleAccess = await authorizeCircleContent({
      circleId,
      userId: req.user._id,
      contentType: 'discussion',
      visibility,
    });
    if (circleAccess.error) return res.status(circleAccess.status).json({ error: circleAccess.error });

    const discussion = await Discussion.create({
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      title: title.trim(),
      body: body.trim(),
      imageUrl: imageUrl || '',
      category: category || 'General',
      tags: tags || ['#ideas'],
      circleId: circleAccess.circle?._id || null,
      visibility: circleAccess.visibility,
      votes: 0,
      voters: [],
      commentsCount: 0,
      contributorsCount: 0,
    });

    res.status(201).json({
      discussion: {
        ...discussion.toObject(),
        voteCount: 0,
        contributionCount: 0,
        contributorCount: 0,
        viewerVote: 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const upvoteDiscussion = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user._id;

    const discussion = await findAccessibleDiscussion(discussionId, userId);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    if (!Array.isArray(discussion.voters)) discussion.voters = [];
    const index = discussion.voters.findIndex((v) => v.toString() === userId.toString());
    let hasUpvoted = false;

    if (index > -1) {
      // Remove upvote
      discussion.voters.splice(index, 1);
      hasUpvoted = false;
    } else {
      // Add upvote (prevent duplicate)
      discussion.voters.push(userId);
      hasUpvoted = true;
    }

    discussion.votes = discussion.voters.length;
    await discussion.save();

    res.json({
      votes: discussion.votes,
      voteCount: discussion.votes,
      viewerVote: hasUpvoted ? 1 : 0,
      hasUpvoted,
      voted: hasUpvoted,
    });
  } catch (err) {
    next(err);
  }
};

export const addContribution = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { body, type, parentContributionId } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Contribution text is required' });
    }

    const discussion = await findAccessibleDiscussion(discussionId, req.user._id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    let depth = 0;
    let parent = null;
    if (parentContributionId) {
      parent = await DiscussionContribution.findOne({
        _id: parentContributionId,
        discussionId,
        status: 'active',
      });
      if (!parent) return res.status(404).json({ error: 'Parent contribution not found' });
      depth = (parent.depth || 0) + 1;
    }

    const contribution = await DiscussionContribution.create({
      discussionId,
      parentContributionId: parentContributionId || null,
      depth,
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      type: type || 'solution',
      body: body.trim(),
    });

    // Reconcile truthful counters after insertion
    const stats = await reconcileDiscussionCounts(discussionId);

    const recipientIds = new Set();
    if (discussion.authorId && discussion.authorId.toString() !== req.user._id.toString()) {
      recipientIds.add(discussion.authorId.toString());
    }
    if (parent?.authorId && parent.authorId.toString() !== req.user._id.toString()) {
      recipientIds.add(parent.authorId.toString());
    }

    if (recipientIds.size > 0) {
      const recipients = await User.find({
        _id: { $in: [...recipientIds] },
        'notificationPreferences.replies': { $ne: false },
      }).select('_id');

      await Notification.insertMany(
        recipients.map((recipient) => ({
          recipientId: recipient._id,
          actorId: req.user._id,
          actorName: req.user.displayName,
          actorInitials: req.user.initials,
          actorColor: req.user.avatarColor,
          type: 'contribution',
          title: parent
            ? `replied to ${parent.authorId.toString() === recipient._id.toString() ? 'your contribution' : 'a contribution'} on "${discussion.title || 'a discussion'}"`
            : `contributed to your discussion "${discussion.title || 'Untitled discussion'}"`,
          targetType: 'discussion',
          targetId: discussion._id,
        }))
      );
    }

    res.status(201).json({
      contribution,
      contributionCount: stats.contributionCount,
      contributorCount: stats.contributorCount,
      commentsCount: stats.contributionCount,
      contributorsCount: stats.contributorCount,
    });
  } catch (err) {
    next(err);
  }
};

export const updateContribution = async (req, res, next) => {
  try {
    const { discussionId, contributionId } = req.params;
    const body = req.body?.body;

    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Contribution text is required' });
    }

    const discussion = await findAccessibleDiscussion(discussionId, req.user._id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });
    const contribution = await DiscussionContribution.findOne({
      _id: contributionId,
      discussionId,
      status: 'active',
    });
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own contributions' });
    }

    contribution.body = body.trim();
    await contribution.save();

    res.json({ contribution });
  } catch (err) {
    next(err);
  }
};

export const deleteContribution = async (req, res, next) => {
  try {
    const { discussionId, contributionId } = req.params;
    const discussion = await findAccessibleDiscussion(discussionId, req.user._id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });
    const contribution = await DiscussionContribution.findOne({
      _id: contributionId,
      discussionId,
      status: 'active',
    });
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own contributions' });
    }

    contribution.status = 'removed';
    await contribution.save();

    const stats = await reconcileDiscussionCounts(discussionId);
    res.json({
      success: true,
      contributionCount: stats.contributionCount,
      contributorCount: stats.contributorCount,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDiscussion = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    const isOwner = req.user && String(discussion.authorId) === String(req.user._id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete this discussion' });
    }

    discussion.status = 'removed';
    await discussion.save();

    res.json({ success: true, message: 'Discussion deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const updateDiscussion = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { title, body, imageUrl, category, tags } = req.body || {};

    const discussion = await findAccessibleDiscussion(discussionId, req.user._id);
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    const isOwner = req.user && String(discussion.authorId) === String(req.user._id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to edit this discussion' });
    }

    if (title !== undefined) discussion.title = String(title).trim();
    if (body !== undefined) discussion.body = String(body).trim();
    if (imageUrl !== undefined) discussion.imageUrl = imageUrl ? String(imageUrl).trim() : undefined;
    if (category !== undefined) discussion.category = category;
    if (Array.isArray(tags)) discussion.tags = tags;

    await discussion.save();
    res.json({ success: true, discussion });
  } catch (err) {
    next(err);
  }
};
