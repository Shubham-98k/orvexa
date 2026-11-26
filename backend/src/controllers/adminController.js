import { Report, AuditLog, Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { removeReportedContent } from '../services/reportModerationService.js';
import { addReportNavigationDetails } from '../services/reportPresentationService.js';
import mongoose from 'mongoose';

const isStaff = (user) => {
  return (
    user?.platformRole === 'admin' ||
    user?.platformRole === 'moderator' ||
    user?.role === 'admin' ||
    user?.role === 'moderator'
  );
};

const isAdmin = (user) => {
  return user?.platformRole === 'admin' || user?.role === 'admin';
};

export const getAdminOverview = async (req, res, next) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const globalReportFilter = { circleId: null };
    const [userCount, postCount, discussionCount, knowledgeCount, circleCount, pendingReports] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Discussion.countDocuments(),
      KnowledgeArticle.countDocuments(),
      Circle.countDocuments(),
      Report.countDocuments({ ...globalReportFilter, status: 'pending' }),
    ]);

    const reportRecords = await Report.find(globalReportFilter)
      .populate('reporterId', 'displayName username')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const recentReports = await addReportNavigationDetails(reportRecords);
    const recentAudit = await AuditLog.find().sort({ createdAt: -1 }).limit(10).lean();

    res.json({
      stats: {
        users: userCount,
        posts: postCount,
        discussions: discussionCount,
        knowledge: knowledgeCount,
        circles: circleCount,
        pendingReports,
      },
      users: userCount,
      posts: postCount,
      discussions: discussionCount,
      knowledge: knowledgeCount,
      circles: circleCount,
      reports: pendingReports,
      recentReports,
      recentAudit,
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminUsers = async (req, res, next) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Staff access required' });
    }

    const { q, role, page = 1, limit = 50 } = req.query;
    let query = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [{ username: regex }, { displayName: regex }, { email: regex }];
    }
    if (role && role !== 'all') {
      query.platformRole = role;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));

    const users = await User.find(query)
      .select('username displayName email platformRole accountStatus followersCount followingCount createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(100, parseInt(limit, 10)))
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      users: users.map((u) => ({
        ...u,
        role: u.platformRole,
      })),
      total,
      page: parseInt(page, 10),
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminUserContent = async (req, res, next) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Staff access required' });
    }
    const { userId } = req.params;
    const targetUser = await User.findById(userId)
      .select('username displayName email avatar avatarColor initials bio headline platformRole accountStatus createdAt')
      .lean();

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [posts, discussions, knowledge] = await Promise.all([
      Post.find({ authorId: userId, status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).lean(),
      Discussion.find({ authorId: userId, status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).lean(),
      KnowledgeArticle.find({ authorId: userId, status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      user: targetUser,
      posts,
      discussions,
      knowledge,
    });
  } catch (err) {
    next(err);
  }
};

export const moderateDeleteKnowledgeArticle = async (req, res, next) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Moderation privileges required' });
    }

    const article = await KnowledgeArticle.findById(req.params.articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim()
      : 'Your article was removed by moderation for violating community standards.';
    article.status = 'archived';
    await article.save();

    if (article.authorId && article.authorId.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipientId: article.authorId,
          actorId: req.user._id,
          actorName: req.user.displayName || req.user.username || 'Moderation Team',
          actorInitials: req.user.initials || 'MOD',
          type: 'content_deleted',
          title: 'Article removed by moderation',
          message: reason,
          reason,
          targetType: 'knowledge',
          targetId: article._id,
          timeText: 'Just now',
        });
      } catch (notificationError) {
        console.error('Failed to create moderation notification:', notificationError);
      }
    }

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.displayName || req.user.username,
      actorRole: req.user.platformRole || req.user.role,
      action: 'content_deleted',
      targetType: 'knowledge',
      targetId: article._id,
      reason,
    });

    res.json({ success: true, message: 'Knowledge article removed by moderation' });
  } catch (err) {
    next(err);
  }
};

export const moderateDeleteDiscussion = async (req, res, next) => {
  try {
    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Moderation privileges required' });
    }

    const discussion = await Discussion.findById(req.params.discussionId);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });

    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim()
      : 'Your discussion was removed by moderation for violating community standards.';
    discussion.status = 'removed';
    await discussion.save();

    if (discussion.authorId && discussion.authorId.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          recipientId: discussion.authorId,
          actorId: req.user._id,
          actorName: req.user.displayName || req.user.username || 'Moderation Team',
          actorInitials: req.user.initials || 'MOD',
          type: 'content_deleted',
          title: 'Discussion removed by moderation',
          message: reason,
          reason,
          targetType: 'discussion',
          targetId: discussion._id,
          timeText: 'Just now',
        });
      } catch (notificationError) {
        console.error('Failed to create moderation notification:', notificationError);
      }
    }

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.displayName || req.user.username,
      actorRole: req.user.platformRole || req.user.role,
      action: 'content_deleted',
      targetType: 'discussion',
      targetId: discussion._id,
      reason,
    });

    res.json({ success: true, message: 'Discussion removed by moderation' });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Only full administrators can change user roles' });
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid platform role' });
    }

    if (userId === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot revoke your own admin status' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousRole = user.platformRole;
    user.platformRole = role;
    await user.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.displayName,
      actorRole: 'admin',
      action: 'update_user_role',
      targetType: 'user',
      targetId: user._id,
      reason: `Changed role from ${previousRole} to ${role}`,
    });

    res.json({ success: true, user: { id: user._id, username: user.username, platformRole: user.platformRole, role: user.platformRole } });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    if (req.user?.platformRole !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'restricted', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid account status' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot suspend or ban your own account' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.accountStatus = status;
    await user.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.displayName,
      actorRole: 'admin',
      action: 'update_account_status',
      targetType: 'user',
      targetId: user._id,
      reason: `Account status set to ${status}`,
    });

    res.json({ success: true, user: { id: user._id, username: user.username, accountStatus: user.accountStatus } });
  } catch (err) {
    next(err);
  }
};

export const updateReport = async (req, res, next) => {
  try {
    if (req.user?.platformRole !== 'admin' && req.user?.platformRole !== 'moderator') {
      return res.status(403).json({ error: 'Moderation privileges required' });
    }

    const { reportId } = req.params;
    const { status, actionTaken, action } = req.body;
    const isRemoval = action === 'remove_content';
    const reason = typeof actionTaken === 'string' ? actionTaken.trim().slice(0, 1000) : '';

    if (action !== undefined && !isRemoval) {
      return res.status(400).json({ error: 'Invalid moderation action' });
    }
    if (!isRemoval && !['in_review', 'actioned', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status' });
    }
    if (isRemoval && !reason) {
      return res.status(400).json({ error: 'A removal reason is required and will be sent to the content author' });
    }

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.circleId) {
      return res.status(403).json({ error: 'Circle reports must be handled by that Circle’s moderators' });
    }

    const removal = isRemoval
      ? await removeReportedContent({ report, actor: req.user, reason })
      : null;
    const finalStatus = isRemoval ? 'actioned' : status;
    report.status = finalStatus;
    report.actionTaken = reason || actionTaken || '';
    report.moderatorId = req.user._id;
    await report.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.displayName,
      actorRole: req.user.platformRole,
      action: isRemoval ? 'report_content_removed' : `report_${finalStatus}`,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: reason || `Report marked as ${finalStatus}`,
      ...(removal ? { metadata: { previousStatus: removal.previousStatus, newStatus: removal.newStatus } } : {}),
    });

    res.json({ success: true, report, ...(removal ? { removedStatus: removal.newStatus } : {}) });
  } catch (err) {
    next(err);
  }
};

export const submitReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const targetModels = new Map([
      ['post', Post],
      ['discussion', Discussion],
      ['contribution', DiscussionContribution],
      ['knowledge', KnowledgeArticle],
      ['circle', Circle],
      ['user', User],
    ]);
    const TargetModel = targetModels.get(targetType);

    if (!TargetModel || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: 'Invalid report target' });
    }
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 100) {
      return res.status(400).json({ error: 'A valid report reason is required' });
    }
    if (details !== undefined && (typeof details !== 'string' || details.length > 1000)) {
      return res.status(400).json({ error: 'Report details must be 1000 characters or fewer' });
    }

    const target = await TargetModel.findById(targetId);
    if (!target) return res.status(404).json({ error: 'Report target not found' });

    if (
      ['post', 'discussion', 'contribution', 'knowledge'].includes(targetType) &&
      target.authorId?.toString() === req.user._id.toString()
    ) {
      return res.status(400).json({ error: 'You cannot report your own content' });
    }

    let targetCircleId = target.circleId || (targetType === 'knowledge' ? target.origin?.circleId : null);
    if (targetType === 'contribution') {
      const discussion = await Discussion.findById(target.discussionId).select('circleId').lean();
      targetCircleId = discussion?.circleId || null;
    }
    if (targetCircleId) {
      return res.status(400).json({
        error: 'This content belongs to a Circle. Report it through the Circle so its moderators receive the report.',
        code: 'CIRCLE_REPORT_REQUIRED',
      });
    }

    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId: target._id,
      reason: reason.trim(),
      details: details?.trim() || '',
    });
    res.status(201).json({ report, message: 'Report submitted for moderation review' });
  } catch (err) {
    next(err);
  }
};
