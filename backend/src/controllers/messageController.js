import mongoose from 'mongoose';
import { CircleModerationAction } from '../models/CircleModerationAction.js';
import { Conversation, Message } from '../models/Conversation.js';
import { User } from '../models/User.js';
import {
  getCircleRole,
  getJoinedCircleIds,
} from '../services/circleAccessService.js';
import {
  emitConversationEvent,
  getAuthorizedConversation,
  isWithinDirectMessageEditWindow,
  saveConversationMessage,
} from '../services/messageService.js';

const respondConversationError = (res, result) => {
  if (!result.error) return false;
  res.status(result.status).json({ error: result.error });
  return true;
};

const getConversationAccess = async (conversationId, userId, res, options) => {
  const access = await getAuthorizedConversation(conversationId, userId, options);
  if (respondConversationError(res, access)) return null;
  return access;
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const circleIds = await getJoinedCircleIds(userId);
    const conversations = await Conversation.find({
      $or: [
        { type: { $ne: 'circle_group' }, participants: userId },
        { type: 'circle_group', circleId: { $in: circleIds } },
      ],
    })
      .populate('participants', 'displayName username initials avatarColor avatar')
      .populate('circleId', 'name slug icon avatar coverImage')
      .sort({ lastMessageAt: -1 })
      .lean();
    const conversationIds = conversations.map(({ _id }) => _id);
    const [unreadCounts, joinedCircleIds] = await Promise.all([
      Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            senderId: { $ne: userId },
            readBy: { $ne: userId },
            moderationStatus: 'active',
          },
        },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } },
      ]),
      getJoinedCircleIds(userId),
    ]);
    const unreadByConversation = new Map(unreadCounts.map(({ _id, count }) => [_id.toString(), count]));
    const memberCircleIds = new Set(joinedCircleIds.map((id) => id.toString()));

    res.json({
      conversations: conversations.map((conversation) => ({
        ...conversation,
        unreadCount: unreadByConversation.get(conversation._id.toString()) || 0,
        isMuted: conversation.mutedBy?.some((id) => id.toString() === userId.toString()) || false,
        isCircleMember: conversation.type !== 'circle_group' ||
          memberCircleIds.has(conversation.circleId?._id?.toString() || conversation.circleId?.toString()),
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res);
    if (!access) return;
    const conversation = await Conversation.findById(access.conversation._id)
      .populate('participants', 'displayName username initials avatarColor avatar')
      .populate('circleId', 'name slug icon avatar coverImage description')
      .lean();
    res.json({
      conversation,
      isMuted: access.conversation.mutedBy?.some((id) => id.toString() === req.user._id.toString()) || false,
    });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res);
    if (!access) return;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const query = {
      conversationId: access.conversation._id,
      moderationStatus: { $ne: 'removed' },
    };
    if (req.query.before && mongoose.Types.ObjectId.isValid(req.query.before)) {
      const cursor = await Message.findOne({ _id: req.query.before, conversationId: access.conversation._id }).select('createdAt').lean();
      if (!cursor) return res.status(400).json({ error: 'Invalid message cursor' });
      query.createdAt = { $lt: cursor.createdAt };
    } else if (req.query.before) {
      return res.status(400).json({ error: 'Invalid message cursor' });
    }
    const [messages, total] = await Promise.all([
      Message.find(query).sort({ createdAt: -1 }).limit(limit).populate('senderId', 'displayName username initials avatarColor avatar').lean(),
      Message.countDocuments(query),
    ]);
    res.json({
      messages: messages.reverse(),
      hasMore: total > messages.length,
      nextCursor: messages[0]?._id || null,
    });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res, { forSend: true });
    if (!access) return;
    const message = await saveConversationMessage({
      conversation: access.conversation,
      user: req.user,
      body: req.body.body,
    });
    await emitConversationEvent(req.app.get('io'), access.conversation, 'new_message', message.toObject());
    res.status(201).json({ message });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

export const startConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;
    if (!recipientId) return res.status(400).json({ error: 'Recipient is required' });

    const cleanRecipient = recipientId.toString().trim();
    if (cleanRecipient === userId.toString()) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    let targetUser = null;
    if (mongoose.Types.ObjectId.isValid(cleanRecipient)) {
      targetUser = await User.findById(cleanRecipient);
    }
    if (!targetUser) targetUser = await User.findOne({ username: cleanRecipient.toLowerCase() });
    if (!targetUser) return res.status(404).json({ error: 'Recipient user not found' });
    if (targetUser._id.toString() === userId.toString()) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    let conversation = await Conversation.findOne({
      type: { $ne: 'circle_group' },
      participants: { $all: [userId, targetUser._id], $size: 2 },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, targetUser._id],
        createdBy: userId,
        lastMessage: '',
        lastMessageAt: new Date(),
      });
    }
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'displayName username initials avatarColor avatar')
      .lean();
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const updateMessage = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res, { forSend: true });
    if (!access) return;
    const message = await Message.findOne({
      _id: req.params.messageId,
      conversationId: access.conversation._id,
      moderationStatus: 'active',
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the sender can edit this message' });
    }
    if (access.conversation.type === 'direct' && !isWithinDirectMessageEditWindow(message)) {
      return res.status(403).json({ error: 'Direct messages can only be edited for one minute after sending' });
    }
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 5000) return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    message.body = body;
    message.editedAt = new Date();
    await message.save();
    if (access.conversation.lastMessageId?.toString() === message._id.toString()) {
      access.conversation.lastMessage = body;
      await access.conversation.save();
    }
    await emitConversationEvent(req.app.get('io'), access.conversation, 'message_updated', message.toObject());
    res.json({ message });
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res);
    if (!access) return;
    const message = await Message.findOne({
      _id: req.params.messageId,
      conversationId: access.conversation._id,
      moderationStatus: 'active',
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isAuthor = message.senderId.toString() === req.user._id.toString();
    const circleRole = access.circle ? await getCircleRole(access.circle, req.user._id) : null;
    const isModerator = ['owner', 'admin', 'moderator'].includes(circleRole);
    if (!isAuthor && !isModerator) return res.status(403).json({ error: 'You cannot delete this message' });

    message.moderationStatus = 'removed';
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();
    let updatedConversation = null;
    if (access.conversation.lastMessageId?.toString() === message._id.toString()) {
      const latestMessage = await Message.findOne({
        conversationId: access.conversation._id,
        moderationStatus: 'active',
      }).sort({ createdAt: -1 }).select('_id body createdAt senderId').lean();
      access.conversation.lastMessage = latestMessage?.body || '';
      access.conversation.lastMessageId = latestMessage?._id || null;
      access.conversation.lastMessageAt = latestMessage?.createdAt || access.conversation.createdAt;
      access.conversation.lastMessageSenderId = latestMessage?.senderId || null;
      await access.conversation.save();
      updatedConversation = {
        conversationId: access.conversation._id,
        lastMessage: access.conversation.lastMessage,
        lastMessageAt: access.conversation.lastMessageAt,
      };
    }
    if (!isAuthor && access.circle) {
      await CircleModerationAction.create({
        circleId: access.circle._id,
        actorId: req.user._id,
        targetUserId: message.senderId,
        targetType: 'message',
        targetId: message._id,
        action: 'message_deleted',
        reason: typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '',
      });
    }
    await emitConversationEvent(req.app.get('io'), access.conversation, 'message_removed', {
      _id: message._id,
      conversationId: message.conversationId,
    });
    if (updatedConversation) {
      await emitConversationEvent(req.app.get('io'), access.conversation, 'conversation_updated', updatedConversation);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const markConversationRead = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res);
    if (!access) return;
    await Promise.all([
      Conversation.updateOne(
        { _id: access.conversation._id },
        { $pull: { unreadBy: req.user._id } }
      ),
      Message.updateMany(
        { conversationId: access.conversation._id, readBy: { $ne: req.user._id } },
        { $addToSet: { readBy: req.user._id }, $set: { isRead: true } }
      ),
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const muteConversation = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res);
    if (!access) return;
    await Conversation.updateOne(
      { _id: access.conversation._id },
      { $addToSet: { mutedBy: req.user._id } }
    );
    res.json({ muted: true });
  } catch (err) {
    next(err);
  }
};

export const unmuteConversation = async (req, res, next) => {
  try {
    const access = await getConversationAccess(req.params.conversationId, req.user._id, res);
    if (!access) return;
    await Conversation.updateOne(
      { _id: access.conversation._id },
      { $pull: { mutedBy: req.user._id } }
    );
    res.json({ muted: false });
  } catch (err) {
    next(err);
  }
};
