import { Report, AuditLog } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import mongoose from 'mongoose';

export const getAdminOverview = async (req, res, next) => {
  try {
    if (req.user?.platformRole !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [userCount, postCount, discussionCount, knowledgeCount, circleCount, pendingReports] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Discussion.countDocuments(),
      KnowledgeArticle.countDocuments(),
      Circle.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);

    const recentReports = await Report.find().sort({ createdAt: -1 }).limit(10).lean();
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
    if (req.user?.platformRole !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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

export const updateUserRole = async (req, res, next) => {
  try {
    if (req.user?.platformRole !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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
    const { status, actionTaken } = req.body;

    if (!['in_review', 'actioned', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status' });
    }

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.status = status;
    if (actionTaken) report.actionTaken = actionTaken;
    report.moderatorId = req.user._id;
    await report.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.displayName,
      actorRole: req.user.platformRole,
      action: `report_${status}`,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: actionTaken || `Report marked as ${status}`,
    });

    res.json({ success: true, report });
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
