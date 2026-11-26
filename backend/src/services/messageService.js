import { Circle } from '../models/Circle.js';
import { CircleMembership } from '../models/CircleMembership.js';
import { Conversation, Message } from '../models/Conversation.js';

const isParticipant = (conversation, userId) =>
  conversation.participants?.some((participantId) => participantId.toString() === userId.toString());

export const isWithinDirectMessageEditWindow = (message, now = Date.now()) => {
  const age = now - new Date(message.createdAt).getTime();
  return age >= 0 && age <= 60_000;
};

export const getAuthorizedConversation = async (conversationId, userId, { forSend = false } = {}) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return { error: 'Conversation not found', status: 404 };

  if (conversation.type === 'circle_group') {
    const circle = await Circle.findById(conversation.circleId);
    if (!circle || circle.status !== 'active') return { error: 'Conversation not found', status: 404 };
    let membership = await CircleMembership.findOne({
      circleId: circle._id,
      userId,
    });
    const isLegacyMember = !membership && (
      circle.ownerId?.toString() === userId.toString() ||
      circle.members?.some((memberId) => memberId.toString() === userId.toString())
    );
    if (!membership && !isLegacyMember) return { error: 'Conversation not found', status: 404 };
    if (membership && membership.status !== 'active') return { error: 'Conversation not found', status: 404 };
    if (isLegacyMember) {
      const role = circle.ownerId?.toString() === userId.toString()
        ? 'owner'
        : circle.moderators?.some((moderatorId) => moderatorId.toString() === userId.toString())
          ? 'moderator'
          : 'member';
      membership = await CircleMembership.findOneAndUpdate(
        { circleId: circle._id, userId },
        {
          $setOnInsert: {
            circleId: circle._id,
            userId,
            role,
            status: 'active',
            joinedAt: circle.createdAt || new Date(),
          },
        },
        { new: true, upsert: true }
      ).lean();
    }
    if (membership?.status !== 'active') return { error: 'Conversation not found', status: 404 };
    if (forSend && membership?.mutedUntil && membership.mutedUntil > new Date()) {
      return { error: 'You are muted in this Circle until the mute expires', status: 403 };
    }
    return { conversation, circle, membership };
  }

  if (!isParticipant(conversation, userId)) return { error: 'Conversation not found', status: 404 };
  return { conversation };
};

export const saveConversationMessage = async ({ conversation, user, body }) => {
  const cleanBody = typeof body === 'string' ? body.trim() : '';
  if (!cleanBody || cleanBody.length > 5000) {
    const error = new Error('Message must be between 1 and 5000 characters');
    error.status = 400;
    throw error;
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: user._id,
    senderName: user.displayName,
    body: cleanBody,
    readBy: [user._id],
  });
  conversation.lastMessage = cleanBody;
  conversation.lastMessageSenderId = user._id;
  conversation.lastMessageId = message._id;
  conversation.lastMessageAt = message.createdAt || new Date();
  conversation.unreadBy = conversation.participants.filter(
    (participantId) => participantId.toString() !== user._id.toString()
  );
  await conversation.save();

  const populatedMessage = await message.populate('senderId', 'displayName username initials avatarColor avatar');
  return populatedMessage;
};

export const emitConversationEvent = async (io, conversation, eventName, payload) => {
  if (!io) return;
  const recipientIds = conversation.type === 'circle_group'
    ? await CircleMembership.find({
      circleId: conversation.circleId,
      status: 'active',
    }).distinct('userId')
    : conversation.participants;
  const rooms = [...new Set(recipientIds.map((id) => `user:${id.toString()}`))];
  if (rooms.length > 0) io.to(rooms).emit(eventName, payload);
};
