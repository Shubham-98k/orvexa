import { Conversation, Message } from '../models/Conversation.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Notification } from '../models/Notification.js';
import { Post } from '../models/Post.js';

const removableTargets = {
  post: { Model: Post, status: 'deleted', label: 'post' },
  discussion: { Model: Discussion, status: 'removed', label: 'discussion' },
  contribution: { Model: DiscussionContribution, status: 'removed', label: 'discussion contribution' },
  knowledge: { Model: KnowledgeArticle, status: 'archived', label: 'Knowledge article' },
  message: { Model: Message, field: 'moderationStatus', status: 'removed', label: 'Circle message' },
};

const moderationError = (message, status) => Object.assign(new Error(message), { status });

export const removeReportedContent = async ({ report, actor, reason, circleId = null }) => {
  const target = removableTargets[report.targetType];
  if (!target) {
    throw moderationError(`Reported ${report.targetType} content cannot be removed from this queue.`, 400);
  }

  const content = await target.Model.findById(report.targetId);
  if (!content) throw moderationError('Reported content was not found.', 404);

  let contentCircleId = content.circleId || (report.targetType === 'knowledge' ? content.origin?.circleId : null);
  let conversation = null;
  if (report.targetType === 'contribution') {
    const discussion = await Discussion.findById(content.discussionId).select('circleId').lean();
    contentCircleId = discussion?.circleId || null;
  } else if (report.targetType === 'message') {
    conversation = await Conversation.findById(content.conversationId)
      .select('circleId type lastMessageId lastMessage lastMessageAt createdAt');
    contentCircleId = conversation?.type === 'circle_group' ? conversation.circleId : null;
  }
  if (circleId && contentCircleId?.toString() !== circleId.toString()) {
    throw moderationError('Reported content does not belong to this Circle.', 404);
  }
  if (!circleId && contentCircleId) {
    throw moderationError('Circle content must be moderated by that Circle’s staff.', 403);
  }

  const statusField = target.field || 'status';
  const previousStatus = content[statusField];
  content[statusField] = target.status;
  if (report.targetType === 'message') {
    content.deletedAt = new Date();
    content.deletedBy = actor._id;
  }
  await content.save();
  if (conversation?.lastMessageId?.toString() === content._id.toString()) {
    const latestMessage = await Message.findOne({
      conversationId: conversation._id,
      moderationStatus: 'active',
    }).sort({ createdAt: -1 }).select('_id body createdAt').lean();
    conversation.lastMessage = latestMessage?.body || '';
    conversation.lastMessageId = latestMessage?._id || null;
    conversation.lastMessageAt = latestMessage?.createdAt || conversation.createdAt;
    await conversation.save();
  }

  const authorId = content.authorId || content.senderId;
  if (!authorId) throw moderationError('The author of the reported content could not be identified.', 409);
  if (authorId.toString() !== actor._id.toString()) {
    await Notification.create({
      recipientId: authorId,
      actorId: actor._id,
      actorName: actor.displayName || actor.username || 'Moderation team',
      actorInitials: actor.initials || 'MOD',
      type: 'content_deleted',
      title: `${target.label} removed by moderation`,
      message: reason,
      reason,
      targetType: report.targetType,
      targetId: content._id,
      ...(circleId ? { circleId } : {}),
      timeText: 'Just now',
    });
  }

  return { content, previousStatus, newStatus: target.status };
};
