import mongoose from 'mongoose';
import { Circle } from '../models/Circle.js';
import { CircleAnnouncement } from '../models/CircleAnnouncement.js';
import { CircleFeaturedContent } from '../models/CircleFeaturedContent.js';
import { CircleMembership } from '../models/CircleMembership.js';
import { CircleModerationAction } from '../models/CircleModerationAction.js';
import { Conversation, Message } from '../models/Conversation.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Notification, Report } from '../models/Notification.js';
import { Post } from '../models/Post.js';
import {
  canViewCircle,
  getCircleRole,
} from '../services/circleAccessService.js';
import { removeReportedContent } from '../services/reportModerationService.js';
import { addReportNavigationDetails } from '../services/reportPresentationService.js';

const findCircle = async (idOrSlug) => {
  const clauses = [{ slug: idOrSlug }];
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) clauses.push({ _id: idOrSlug });
  return Circle.findOne({ $or: clauses, status: { $nin: ['deleted', 'suspended', 'archived'] } });
};

const canManage = (role) => ['owner', 'admin'].includes(role);
const canModerate = (role) => ['owner', 'admin', 'moderator'].includes(role);
const publicCircleContentFilter = (role) =>
  role ? {} : { $or: [{ visibility: { $exists: false } }, { visibility: 'public' }] };
const pageParams = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const viewCircleOrReject = async (circle, userId, res) => {
  if (!circle || !(await canViewCircle(circle, userId))) {
    res.status(404).json({ error: 'Circle not found or unavailable' });
    return false;
  }
  return true;
};

const notifyMembers = async (circle, actorId, title) => {
  const members = await CircleMembership.find({
    circleId: circle._id,
    status: 'active',
    userId: { $ne: actorId },
  }).select('userId').lean();
  if (members.length === 0) return;
  try {
    await Notification.insertMany(
      members.map(({ userId }) => ({
        recipientId: userId,
        actorId,
        actorName: 'Circle',
        type: 'system',
        title,
        targetType: 'circle',
        targetId: circle._id,
        circleId: circle._id,
      })),
      { ordered: false }
    );
  } catch (error) {
    console.error('Failed to notify Circle members:', error);
  }
};

export const getCirclePosts = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!(await viewCircleOrReject(circle, req.user?._id, res))) return;
    const role = await getCircleRole(circle, req.user?._id);
    const query = { circleId: circle._id, status: 'published' };
    if (!role) query.$or = [{ visibility: { $exists: false } }, { visibility: 'public' }];
    const { page, limit, skip } = pageParams(req.query);
    const [posts, total] = await Promise.all([
      Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Post.countDocuments(query),
    ]);
    res.json({ posts, page, limit, total, hasMore: skip + posts.length < total });
  } catch (err) {
    next(err);
  }
};

export const getCircleDiscussions = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!(await viewCircleOrReject(circle, req.user?._id, res))) return;
    const role = await getCircleRole(circle, req.user?._id);
    const query = { circleId: circle._id, status: { $nin: ['removed', 'closed'] } };
    if (!role) query.$or = [{ visibility: { $exists: false } }, { visibility: 'public' }];
    const { page, limit, skip } = pageParams(req.query);
    const [discussions, total] = await Promise.all([
      Discussion.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Discussion.countDocuments(query),
    ]);
    res.json({ discussions, page, limit, total, hasMore: skip + discussions.length < total });
  } catch (err) {
    next(err);
  }
};

export const getCircleKnowledge = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!(await viewCircleOrReject(circle, req.user?._id, res))) return;
    const role = await getCircleRole(circle, req.user?._id);
    const query = { circleId: circle._id, status: 'published' };
    if (!role) query.$or = [{ visibility: { $exists: false } }, { visibility: 'public' }];
    const { page, limit, skip } = pageParams(req.query);
    const [articles, total] = await Promise.all([
      KnowledgeArticle.find(query).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      KnowledgeArticle.countDocuments(query),
    ]);
    res.json({ articles, page, limit, total, hasMore: skip + articles.length < total });
  } catch (err) {
    next(err);
  }
};

export const getCircleHome = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!(await viewCircleOrReject(circle, req.user?._id, res))) return;
    const role = await getCircleRole(circle, req.user?._id);
    const contentVisibility = publicCircleContentFilter(role);
    const now = new Date();
    const [posts, discussions, knowledge, announcements, featured] = await Promise.all([
      Post.find({ circleId: circle._id, status: 'published', ...contentVisibility }).sort({ createdAt: -1 }).limit(5).lean(),
      Discussion.find({ circleId: circle._id, status: { $nin: ['removed', 'closed'] }, ...contentVisibility }).sort({ createdAt: -1 }).limit(5).lean(),
      KnowledgeArticle.find({ circleId: circle._id, status: 'published', ...contentVisibility }).sort({ publishedAt: -1, createdAt: -1 }).limit(5).lean(),
      CircleAnnouncement.find({
        circleId: circle._id,
        status: 'active',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      }).sort({ pinned: -1, createdAt: -1 }).limit(10).lean(),
      CircleFeaturedContent.find({ circleId: circle._id }).sort({ order: 1, createdAt: -1 }).limit(circle.settings?.maxFeaturedContent || 5).lean(),
    ]);
    const featuredWithContent = await Promise.all(featured.map(async (item) => {
      const Model = contentModels[item.contentType];
      const content = await Model.findOne({
        _id: item.contentId,
        circleId: circle._id,
        status: item.contentType === 'discussion' ? { $nin: ['removed', 'closed'] } : 'published',
        ...contentVisibility,
      }).lean();
      return content ? { ...item, content } : null;
    }));
    res.json({ posts, discussions, knowledge, announcements, featured: featuredWithContent.filter(Boolean) });
  } catch (err) {
    next(err);
  }
};

export const getCircleActivity = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!(await viewCircleOrReject(circle, req.user?._id, res))) return;
    const role = await getCircleRole(circle, req.user?._id);
    const visibility = publicCircleContentFilter(role);
    const { limit } = pageParams(req.query);
    const [posts, discussions, knowledge, announcements, members] = await Promise.all([
      Post.find({ circleId: circle._id, status: 'published', ...visibility }).sort({ createdAt: -1 }).limit(limit).select('_id title authorName createdAt').lean(),
      Discussion.find({ circleId: circle._id, status: { $nin: ['removed', 'closed'] }, ...visibility }).sort({ createdAt: -1 }).limit(limit).select('_id title authorName createdAt').lean(),
      KnowledgeArticle.find({ circleId: circle._id, status: 'published', ...visibility }).sort({ createdAt: -1 }).limit(limit).select('_id title authorName createdAt').lean(),
      CircleAnnouncement.find({ circleId: circle._id, status: 'active' }).sort({ createdAt: -1 }).limit(limit).select('_id title authorId createdAt').lean(),
      CircleMembership.find({ circleId: circle._id, status: 'active' }).sort({ joinedAt: -1 }).limit(limit).populate('userId', 'displayName username').select('userId joinedAt').lean(),
    ]);
    const activity = [
      ...posts.map((item) => ({ type: 'post', ...item })),
      ...discussions.map((item) => ({ type: 'discussion', ...item })),
      ...knowledge.map((item) => ({ type: 'knowledge', ...item })),
      ...announcements.map((item) => ({ type: 'announcement', ...item })),
      ...members.filter((item) => item.userId).map((item) => ({
        type: 'member_joined',
        _id: item._id,
        authorName: item.userId.displayName,
        username: item.userId.username,
        createdAt: item.joinedAt,
      })),
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, limit);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canManage(role) && !(role === 'moderator' && circle.settings?.allowModeratorAnnouncements)) {
      return res.status(403).json({ error: 'Only authorized Circle managers can publish announcements' });
    }
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!title || title.length > 160 || !body || body.length > 5000) {
      return res.status(400).json({ error: 'Announcement title and body are required (160 and 5000 characters maximum)' });
    }
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json({ error: 'Announcement expiration date is invalid' });
    const announcement = await CircleAnnouncement.create({
      circleId: circle._id,
      authorId: req.user._id,
      title,
      body,
      expiresAt,
    });
    await notifyMembers(circle, req.user._id, `New announcement in ${circle.name}: ${title}`);
    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    const announcement = await CircleAnnouncement.findOne({
      _id: req.params.announcementId,
      circleId: circle._id,
      status: 'active',
    });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (!canManage(role) && announcement.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You cannot edit this announcement' });
    }
    if (req.body.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title || title.length > 160) return res.status(400).json({ error: 'Title must be 160 characters or fewer' });
      announcement.title = title;
    }
    if (req.body.body !== undefined) {
      const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
      if (!body || body.length > 5000) return res.status(400).json({ error: 'Body must be 5000 characters or fewer' });
      announcement.body = body;
    }
    if (req.body.expiresAt !== undefined) {
      const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
      if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json({ error: 'Announcement expiration date is invalid' });
      announcement.expiresAt = expiresAt;
    }
    if (req.body.pinned !== undefined) {
      if (!canManage(role)) return res.status(403).json({ error: 'Only Circle managers can pin announcements' });
      announcement.pinned = Boolean(req.body.pinned);
    }
    await announcement.save();
    res.json({ announcement });
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    const announcement = await CircleAnnouncement.findOne({ _id: req.params.announcementId, circleId: circle._id, status: 'active' });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (!canManage(role) && announcement.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You cannot delete this announcement' });
    }
    announcement.status = 'deleted';
    await announcement.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const contentModels = {
  post: Post,
  discussion: Discussion,
  knowledge: KnowledgeArticle,
};

export const featureCircleContent = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canManage(role)) return res.status(403).json({ error: 'Circle owner or admin privileges required' });
    const { contentType, contentId } = req.body;
    const Model = contentModels[contentType];
    if (!Model || !mongoose.Types.ObjectId.isValid(contentId)) return res.status(400).json({ error: 'Valid Circle content is required' });
    const content = await Model.findOne({
      _id: contentId,
      circleId: circle._id,
      status: contentType === 'discussion' ? { $nin: ['removed', 'closed'] } : 'published',
    }).select('_id');
    if (!content) return res.status(404).json({ error: 'Content not found in this Circle' });
    const maxFeatured = Math.max(1, Math.min(20, circle.settings?.maxFeaturedContent || 5));
    const count = await CircleFeaturedContent.countDocuments({ circleId: circle._id });
    if (count >= maxFeatured) return res.status(409).json({ error: `This Circle can feature up to ${maxFeatured} items` });
    const featured = await CircleFeaturedContent.create({
      circleId: circle._id,
      contentType,
      contentId,
      featuredBy: req.user._id,
      order: count,
    });
    res.status(201).json({ featured });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'This content is already featured' });
    next(err);
  }
};

export const unfeatureCircleContent = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canManage(role)) return res.status(403).json({ error: 'Circle owner or admin privileges required' });
    const deleted = await CircleFeaturedContent.findOneAndDelete({ _id: req.params.featuredId, circleId: circle._id });
    if (!deleted) return res.status(404).json({ error: 'Featured item not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const reorderCircleFeaturedContent = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canManage(role)) return res.status(403).json({ error: 'Circle owner or admin privileges required' });
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'A list of featured item IDs is required' });
    }
    const records = await CircleFeaturedContent.find({ circleId: circle._id, _id: { $in: orderedIds } }).select('_id');
    if (records.length !== orderedIds.length) return res.status(400).json({ error: 'The order contains invalid featured items' });
    await Promise.all(orderedIds.map((id, order) =>
      CircleFeaturedContent.updateOne({ _id: id, circleId: circle._id }, { $set: { order } })
    ));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getCircleReports = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canModerate(role)) return res.status(403).json({ error: 'Circle moderation privileges required' });
    const reportRecords = await Report.find({ circleId: circle._id, status: { $in: ['pending', 'in_review'] } })
      .populate('reporterId', 'displayName username')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const reports = await addReportNavigationDetails(reportRecords);
    const actions = await CircleModerationAction.find({ circleId: circle._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ reports, actions });
  } catch (err) {
    next(err);
  }
};

export const reportCircleContent = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!(await viewCircleOrReject(circle, req.user._id, res))) return;
    const { targetType, targetId, reason, details } = req.body;
    const targetModels = {
      post: Post,
      discussion: Discussion,
      contribution: DiscussionContribution,
      knowledge: KnowledgeArticle,
      message: Message,
    };
    const Model = targetModels[targetType];
    if (!Model || !mongoose.Types.ObjectId.isValid(targetId)) return res.status(400).json({ error: 'Invalid report target' });
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 100) return res.status(400).json({ error: 'A valid report reason is required' });
    const target = await Model.findById(targetId);
    if (!target) return res.status(404).json({ error: 'Report target not found' });
    if (target.authorId?.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot report your own content' });
    }
    if (targetType === 'message') {
      const conversation = await Conversation.findOne({ _id: target.conversationId, type: 'circle_group', circleId: circle._id });
      if (!conversation) return res.status(404).json({ error: 'Report target not found in this Circle' });
    } else {
      const parent = targetType === 'contribution'
        ? await Discussion.findById(target.discussionId).select('circleId')
        : target;
      const targetCircleId = targetType === 'knowledge'
        ? parent?.circleId || parent?.origin?.circleId
        : parent?.circleId;
      if (targetCircleId?.toString() !== circle._id.toString()) {
        return res.status(404).json({ error: 'Report target not found in this Circle' });
      }
    }
    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId: target._id,
      circleId: circle._id,
      reason: reason.trim(),
      details: typeof details === 'string' ? details.trim().slice(0, 1000) : '',
    });
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
};

export const resolveCircleReport = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canModerate(role)) return res.status(403).json({ error: 'Circle moderation privileges required' });
    const { status, actionTaken, action } = req.body;
    const isRemoval = action === 'remove_content';
    const reason = typeof actionTaken === 'string' ? actionTaken.trim().slice(0, 1000) : '';
    if (action !== undefined && !isRemoval) return res.status(400).json({ error: 'Invalid moderation action' });
    if (!isRemoval && !['actioned', 'dismissed', 'in_review'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status' });
    }
    if (isRemoval && !reason) {
      return res.status(400).json({ error: 'A removal reason is required and will be sent to the content author' });
    }
    const report = await Report.findOne({ _id: req.params.reportId, circleId: circle._id });
    if (!report) return res.status(404).json({ error: 'Circle report not found' });
    const removal = isRemoval
      ? await removeReportedContent({ report, actor: req.user, reason, circleId: circle._id })
      : null;
    const finalStatus = isRemoval ? 'actioned' : status;
    report.status = finalStatus;
    report.actionTaken = reason || (typeof actionTaken === 'string' ? actionTaken.trim().slice(0, 1000) : '');
    report.moderatorId = req.user._id;
    await report.save();
    const moderationAction = await CircleModerationAction.create({
      circleId: circle._id,
      actorId: req.user._id,
      targetUserId: removal?.content.authorId,
      targetType: report.targetType,
      targetId: report.targetId,
      action: isRemoval ? 'report_content_removed' : `report_${finalStatus}`,
      reason: report.actionTaken || report.reason,
      metadata: {
        reportId: report._id,
        ...(removal ? { previousStatus: removal.previousStatus, newStatus: removal.newStatus } : {}),
      },
    });
    res.json({
      report,
      moderationAction,
      ...(removal ? { removedStatus: removal.newStatus } : {}),
    });
  } catch (err) {
    next(err);
  }
};

export const moderateDeleteCircleContent = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canModerate(role)) return res.status(403).json({ error: 'Circle moderation privileges required' });

    const contentTypes = {
      post: { Model: Post, removedStatus: 'deleted' },
      discussion: { Model: Discussion, removedStatus: 'removed' },
      knowledge: { Model: KnowledgeArticle, removedStatus: 'archived' },
    };
    const config = contentTypes[req.params.contentType];
    if (!config || !mongoose.Types.ObjectId.isValid(req.params.contentId)) {
      return res.status(400).json({ error: 'Invalid Circle content target' });
    }

    const content = await config.Model.findOne({
      _id: req.params.contentId,
      circleId: circle._id,
    });
    if (!content) return res.status(404).json({ error: 'Content not found in this Circle' });
    if (content.status === config.removedStatus) {
      return res.status(409).json({ error: 'This content has already been removed' });
    }
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) return res.status(400).json({ error: 'A moderation reason is required' });

    const previousStatus = content.status;
    content.status = config.removedStatus;
    await content.save();
    await CircleModerationAction.create({
      circleId: circle._id,
      actorId: req.user._id,
      targetUserId: content.authorId,
      targetType: req.params.contentType,
      targetId: content._id,
      action: 'content_deleted',
      reason,
      metadata: { previousStatus, newStatus: config.removedStatus },
    });

    if (content.authorId?.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipientId: content.authorId,
          actorId: req.user._id,
          actorName: req.user.displayName || req.user.username || 'Circle moderation',
          type: 'content_deleted',
          title: `Content removed from ${circle.name}`,
          message: reason,
          reason,
          targetType: req.params.contentType,
          targetId: content._id,
          circleId: circle._id,
          timeText: 'Just now',
        });
      } catch (notificationError) {
        console.error('Failed to notify Circle content author:', notificationError);
      }
    }
    res.json({ success: true, status: config.removedStatus });
  } catch (err) {
    next(err);
  }
};

export const getCircleAnalytics = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canManage(role)) return res.status(403).json({ error: 'Circle owner or admin privileges required' });
    const [activeMembers, posts, discussions, knowledge, messages] = await Promise.all([
      CircleMembership.countDocuments({ circleId: circle._id, status: 'active' }),
      Post.countDocuments({ circleId: circle._id, status: 'published' }),
      Discussion.countDocuments({ circleId: circle._id, status: { $nin: ['removed', 'closed'] } }),
      KnowledgeArticle.countDocuments({ circleId: circle._id, status: 'published' }),
      circle.groupConversationId
        ? Message.countDocuments({ conversationId: circle.groupConversationId, moderationStatus: 'active' })
        : 0,
    ]);
    res.json({ analytics: { activeMembers, posts, discussions, knowledge, messages } });
  } catch (err) {
    next(err);
  }
};
