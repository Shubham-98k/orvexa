import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';

export const getDiscussions = async (req, res, next) => {
  try {
    const { category, sort, status } = req.query;
    let query = {};
    if (category && category !== 'All categories') query.category = category;
    if (status && status !== 'All statuses') query.status = status.toLowerCase().replace(' ', '_');

    let sortObj = { votes: -1 };
    if (sort === 'Newest') sortObj = { createdAt: -1 };
    if (sort === 'Most discussed') sortObj = { commentsCount: -1 };

    const discussions = await Discussion.find(query).sort(sortObj);
    res.json({ discussions });
  } catch (err) {
    next(err);
  }
};

export const getDiscussionById = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    const contributions = await DiscussionContribution.find({
      discussionId,
      status: 'active',
    }).sort({ votes: -1, createdAt: 1 });

    res.json({ discussion, contributions });
  } catch (err) {
    next(err);
  }
};

export const createDiscussion = async (req, res, next) => {
  try {
    const { title, body, category, tags } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and context are required' });
    }

    const discussion = await Discussion.create({
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      title: title.trim(),
      body: body.trim(),
      category: category || 'UX',
      tags: tags || ['Discussion'],
      votes: 1,
      voters: [req.user._id],
    });

    res.status(201).json({ discussion });
  } catch (err) {
    next(err);
  }
};

export const upvoteDiscussion = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user._id;

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    const idx = discussion.voters.indexOf(userId);
    let voted = false;
    if (idx === -1) {
      discussion.voters.push(userId);
      discussion.votes += 1;
      voted = true;
    } else {
      discussion.voters.splice(idx, 1);
      discussion.votes = Math.max(0, discussion.votes - 1);
      voted = false;
    }

    await discussion.save();
    res.json({ voted, votes: discussion.votes });
  } catch (err) {
    next(err);
  }
};

export const addContribution = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { body, parentContributionId } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Contribution text is required' });
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });
    if (discussion.isLocked) return res.status(403).json({ error: 'Discussion is locked' });

    let depth = 0;
    if (parentContributionId) {
      const parent = await DiscussionContribution.findById(parentContributionId);
      if (parent) depth = Math.min(3, parent.depth + 1);
    }

    const contribution = await DiscussionContribution.create({
      discussionId,
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      parentContributionId: parentContributionId || null,
      body: body.trim(),
      depth,
      votes: 1,
      voters: [req.user._id],
    });

    discussion.commentsCount += 1;
    discussion.contributorsCount += 1;
    await discussion.save();

    res.status(201).json({ contribution });
  } catch (err) {
    next(err);
  }
};
