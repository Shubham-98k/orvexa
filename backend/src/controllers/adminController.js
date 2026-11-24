import { Report, AuditLog } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';

export const getAdminOverview = async (req, res, next) => {
  try {
    const [userCount, postCount, discussionCount, knowledgeCount, pendingReports] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Discussion.countDocuments(),
      KnowledgeArticle.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);

    const recentReports = await Report.find().sort({ createdAt: -1 }).limit(10);
    const recentAudit = await AuditLog.find().sort({ createdAt: -1 }).limit(10);

    res.json({
      stats: {
        users: userCount,
        posts: postCount,
        discussions: discussionCount,
        knowledge: knowledgeCount,
        pendingReports,
      },
      recentReports,
      recentAudit,
    });
  } catch (err) {
    next(err);
  }
};

export const submitReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason,
      details: details || '',
    });
    res.status(201).json({ report, message: 'Report submitted for moderation review' });
  } catch (err) {
    next(err);
  }
};
