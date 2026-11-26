import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

export const getNotifications = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    const preferences = user?.notificationPreferences || {};
    const excludedTypes = [];
    if (preferences.replies === false) excludedTypes.push('comment', 'contribution');
    if (preferences.likes === false) excludedTypes.push('like');
    if (preferences.follows === false) excludedTypes.push('follow', 'circle_join');
    if (preferences.mentions === false) excludedTypes.push('mention');

    const query = { recipientId: req.user._id };
    if (excludedTypes.length > 0) query.type = { $nin: excludedTypes };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipientId: req.user._id, isRead: false });

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user._id },
      { isRead: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipientId: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    res.json({
      preferences: user?.notificationPreferences || {
        replies: true,
        likes: true,
        follows: true,
        mentions: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const allowedKeys = ['replies', 'likes', 'follows', 'mentions'];
    const updates = {};
    for (const key of allowedKeys) {
      if (typeof req.body[key] === 'boolean') {
        updates[`notificationPreferences.${key}`] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    res.json({
      preferences: user?.notificationPreferences || {
        replies: true,
        likes: true,
        follows: true,
        mentions: true,
      },
    });
  } catch (err) {
    next(err);
  }
};
