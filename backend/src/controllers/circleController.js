import crypto from 'crypto';
import mongoose from 'mongoose';
import { Circle } from '../models/Circle.js';
import { CircleInviteLink } from '../models/CircleInviteLink.js';
import { CircleMembership } from '../models/CircleMembership.js';
import { CircleInvitation } from '../models/CircleInvitation.js';
import { Conversation } from '../models/Conversation.js';
import { Notification } from '../models/Notification.js';
import { CircleModerationAction } from '../models/CircleModerationAction.js';
import { User } from '../models/User.js';
import {
  canViewCircle,
  getCircleMembership,
  getCircleRole,
  getJoinedCircleIds,
  hasCircleRole,
  writeCircleMembership,
} from '../services/circleAccessService.js';

const CIRCLE_CATEGORIES = [
  'Technology',
  'Business',
  'Education',
  'Science',
  'Health and Fitness',
  'Arts and Creativity',
  'Books and Literature',
  'Personal Finance',
  'Lifestyle',
  'Gaming',
  'Travel',
  'Community',
  'Other',
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findCircle = async (circleIdOrSlug) => {
  const clauses = [{ slug: circleIdOrSlug }];
  if (mongoose.Types.ObjectId.isValid(circleIdOrSlug)) {
    clauses.push({ _id: circleIdOrSlug });
  }
  return Circle.findOne({ $or: clauses, status: { $nin: ['deleted', 'suspended', 'archived'] } });
};

const isMemberRole = (role) => hasCircleRole(role, ['owner', 'admin', 'moderator', 'member']);
const isManagerRole = (role) => hasCircleRole(role, ['owner', 'admin']);
const isModeratorRole = (role) => hasCircleRole(role, ['owner', 'admin', 'moderator']);
export const getCircleInviteLinkMode = (circle) => {
  if (circle.joinPolicy === 'approval_required') return 'request';
  if (circle.joinPolicy === 'invite_only' || circle.visibility !== 'public') return 'invitation';
  return 'join';
};
export const canGenerateCircleInviteLink = (mode, role) => {
  if (mode === 'join') return isMemberRole(role);
  if (mode === 'request') return isModeratorRole(role);
  if (mode === 'invitation') return isManagerRole(role);
  return false;
};
const circleSettingKeys = [
  'allowVisitorPosts',
  'allowVisitorDiscussions',
  'allowMemberInvites',
  'allowModeratorRemoval',
  'allowModeratorAnnouncements',
  'maxFeaturedContent',
];

const validateCircleSettings = (settings) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'Settings must be an object';
  for (const [key, value] of Object.entries(settings)) {
    if (!circleSettingKeys.includes(key)) return `Unsupported Circle setting: ${key}`;
    if (key === 'maxFeaturedContent') {
      if (!Number.isInteger(value) || value < 1 || value > 20) return 'maxFeaturedContent must be between 1 and 20';
    } else if (typeof value !== 'boolean') {
      return `${key} must be a boolean`;
    }
  }
  return null;
};

const notifyCircleUser = async ({ recipientId, actorId, circle, title, type = 'system' }) => {
  try {
    await Notification.create({
      recipientId,
      actorId,
      actorName: 'Orvexa Circle',
      type,
      title,
      targetType: 'circle',
      targetId: circle._id,
      circleId: circle._id,
      timeText: 'Just now',
    });
  } catch (error) {
    console.error('Failed to create Circle notification:', error);
  }
};

const emitMembershipRemoval = (io, userId, circleId) => {
  io?.to(`user:${userId.toString()}`).emit('circle_membership_removed', { circleId: circleId.toString() });
};

const ensureLegacyMemberships = async (circle) => {
  const ids = new Map();
  if (circle.ownerId) ids.set(circle.ownerId.toString(), { userId: circle.ownerId, role: 'owner' });
  for (const userId of circle.members || []) {
    const role = circle.moderators?.some((moderatorId) => moderatorId.toString() === userId.toString())
      ? 'moderator'
      : 'member';
    ids.set(userId.toString(), {
      userId,
      role: userId.toString() === circle.ownerId?.toString() ? 'owner' : role,
    });
  }
  if (ids.size === 0) return;

  await CircleMembership.bulkWrite(
    [...ids.values()].map(({ userId, role }) => ({
      updateOne: {
        filter: { circleId: circle._id, userId },
        update: {
          $setOnInsert: {
            circleId: circle._id,
            userId,
            role,
            status: 'active',
            joinedAt: circle.createdAt || new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

const syncCircleConversation = async (circle) => {
  await ensureLegacyMemberships(circle);
  const activeMemberships = await CircleMembership.find({
    circleId: circle._id,
    status: 'active',
  }).select('userId').lean();
  const participants = [
    ...new Map(activeMemberships.map(({ userId }) => [userId.toString(), userId])).values(),
  ];

  let conversation = await Conversation.findOne({ type: 'circle_group', circleId: circle._id });
  if (!conversation) {
    try {
      conversation = await Conversation.create({
        type: 'circle_group',
        circleId: circle._id,
        createdBy: circle.ownerId,
        participants,
        lastMessage: '',
        lastMessageAt: circle.createdAt || new Date(),
        unreadBy: [],
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      conversation = await Conversation.findOne({ type: 'circle_group', circleId: circle._id });
    }
  }
  if (!conversation) {
    throw new Error('Unable to create the Circle group conversation');
  }

  conversation.participants = participants;
  await conversation.save();
  if (!circle.groupConversationId || circle.groupConversationId.toString() !== conversation._id.toString()) {
    circle.groupConversationId = conversation._id;
    await circle.save();
  }
  return conversation;
};

const requireCircleManager = async (circle, userId, res) => {
  const role = await getCircleRole(circle, userId);
  if (!isManagerRole(role)) {
    res.status(403).json({ error: 'Circle owner or admin privileges required' });
    return null;
  }
  return role;
};

const syncLegacyMemberList = async (circle) => {
  const memberships = await CircleMembership.find({
    circleId: circle._id,
    status: 'active',
  }).select('userId role').lean();
  circle.members = memberships.map(({ userId }) => userId);
  circle.moderators = memberships
    .filter(({ role }) => role === 'moderator')
    .map(({ userId }) => userId);
  circle.membersCount = memberships.length;
  await circle.save();
};

const activateMembership = async ({ circle, userId, actorId, role = 'member' }) => {
  await writeCircleMembership({
    circle,
    userId,
    role,
    status: 'active',
    approvedBy: actorId,
    approvedAt: new Date(),
    joinedAt: new Date(),
    removedBy: null,
    removedAt: null,
    banReason: '',
    banExpiresAt: null,
  });
  await syncLegacyMemberList(circle);
  await syncCircleConversation(circle);
};

export const getCircleCategories = async (_req, res) => {
  res.json({ categories: CIRCLE_CATEGORIES });
};

export const getCircles = async (req, res, next) => {
  try {
    const { category, q = '', scope } = req.query;
    const clauses = [{ status: 'active' }];
    if (category && category !== 'All') clauses.push({ category });
    if (q.trim()) {
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
      clauses.push({ $or: [{ name: regex }, { description: regex }, { category: regex }, { tags: regex }] });
    }

    if (scope === 'joined') {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      clauses.push({ _id: { $in: await getJoinedCircleIds(req.user._id) } });
    } else {
      const joinedIds = req.user ? await getJoinedCircleIds(req.user._id) : [];
      clauses.push({ $or: [{ visibility: 'public' }, { _id: { $in: joinedIds } }] });
    }

    const circles = await Circle.find({ $and: clauses }).sort({ updatedAt: -1 }).limit(100).lean();
    const memberships = req.user
      ? await CircleMembership.find({ userId: req.user._id, circleId: { $in: circles.map((c) => c._id) } }).lean()
      : [];
    const membershipByCircle = new Map(memberships.map((m) => [m.circleId.toString(), m]));
    const counts = await CircleMembership.aggregate([
      { $match: { circleId: { $in: circles.map((circle) => circle._id) }, status: 'active' } },
      { $group: { _id: '$circleId', count: { $sum: 1 } } },
    ]);
    const countByCircle = new Map(counts.map(({ _id, count }) => [_id.toString(), count]));

    res.json({
      circles: circles.map((circle) => {
        const membership = membershipByCircle.get(circle._id.toString());
        const legacyMembers = circle.members;
        const safeCircle = { ...circle };
        delete safeCircle.members;
        delete safeCircle.moderators;
        const legacyJoined = req.user && (
          circle.ownerId?.toString() === req.user._id.toString() ||
          legacyMembers?.some((memberId) => memberId.toString() === req.user._id.toString())
        );
        return {
          ...safeCircle,
          membersCount: countByCircle.get(circle._id.toString()) ??
            (legacyMembers?.length || (circle.ownerId ? 1 : 0)),
          joined: membership?.status === 'active' || (!membership && Boolean(legacyJoined)),
          membershipStatus: membership?.status || (legacyJoined ? 'active' : null),
          role: membership?.role || (legacyJoined && circle.ownerId?.toString() === req.user?._id?.toString() ? 'owner' : null),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};

export const getJoinedCircles = async (req, res, next) => {
  req.query.scope = 'joined';
  return getCircles(req, res, next);
};

export const getCircleById = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle || !(await canViewCircle(circle, req.user?._id))) {
      return res.status(404).json({ error: 'Circle not found or unavailable' });
    }

    await ensureLegacyMemberships(circle);
    const conversation = await syncCircleConversation(circle);
    const [membership, membersCount] = await Promise.all([
      getCircleMembership(circle, req.user?._id),
      CircleMembership.countDocuments({ circleId: circle._id, status: 'active' }),
    ]);

    const circleData = circle.toObject();
    delete circleData.members;
    delete circleData.moderators;
    res.json({
      circle: {
        ...circleData,
        membersCount,
        joined: membership?.status === 'active',
        membershipStatus: membership?.status || null,
        role: membership?.role || null,
        groupConversationId: conversation._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createCircle = async (req, res, next) => {
  let circle;
  let conversation;
  try {
    const {
      name, description, category, visibility, joinPolicy, tags, avatar, coverImage,
      rules, welcomeMessage, communityGuidelines, settings,
    } = req.body;
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    if (cleanName.length < 3 || cleanName.length > 60) {
      return res.status(400).json({ error: 'Circle name must be between 3 and 60 characters' });
    }
    if (!cleanDescription || cleanDescription.length > 1000) {
      return res.status(400).json({ error: 'Circle description is required and must be 1000 characters or fewer' });
    }
    if (category && !CIRCLE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Choose a valid Circle category' });
    }
    if (visibility && !['public', 'private', 'hidden'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid Circle visibility' });
    }
    if (joinPolicy && !['open', 'approval_required', 'invite_only'].includes(joinPolicy)) {
      return res.status(400).json({ error: 'Invalid Circle joining policy' });
    }
    if (settings !== undefined) {
      const settingsError = validateCircleSettings(settings);
      if (settingsError) return res.status(400).json({ error: settingsError });
    }

    let slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) slug = `circle-${crypto.randomBytes(3).toString('hex')}`;
    if (await Circle.exists({ slug })) slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;

    circle = await Circle.create({
      name: cleanName,
      slug,
      description: cleanDescription,
      ownerId: req.user._id,
      category: category || 'Other',
      visibility: visibility || 'public',
      joinPolicy: joinPolicy || 'open',
      tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 10) : [],
      avatar: typeof avatar === 'string' ? avatar.trim() : '',
      coverImage: typeof coverImage === 'string' ? coverImage.trim() : '',
      rules: Array.isArray(rules) ? rules.filter((rule) => typeof rule === 'string').map((rule) => rule.trim()).filter(Boolean).slice(0, 10) : [],
      welcomeMessage: typeof welcomeMessage === 'string' ? welcomeMessage.trim().slice(0, 1000) : '',
      communityGuidelines: typeof communityGuidelines === 'string' ? communityGuidelines.trim().slice(0, 3000) : '',
      ...(settings ? { settings } : {}),
      members: [req.user._id],
      moderators: [],
      membersCount: 1,
    });

    await writeCircleMembership({
      circle,
      userId: req.user._id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });
    conversation = await Conversation.create({
      type: 'circle_group',
      circleId: circle._id,
      createdBy: req.user._id,
      participants: [req.user._id],
      lastMessage: '',
      lastMessageAt: new Date(),
      unreadBy: [],
    });
    circle.groupConversationId = conversation._id;
    await circle.save();

    const createdCircle = circle.toObject();
    delete createdCircle.members;
    delete createdCircle.moderators;
    res.status(201).json({
      circle: { ...createdCircle, joined: true, membershipStatus: 'active', role: 'owner' },
      conversation,
    });
  } catch (err) {
    if (circle) {
      await Promise.all([
        CircleMembership.deleteOne({ circleId: circle._id, userId: req.user._id }),
        conversation ? Conversation.deleteOne({ _id: conversation._id }) : Promise.resolve(),
        Circle.deleteOne({ _id: circle._id }),
      ]).catch((cleanupError) => {
        console.error('Failed to roll back incomplete Circle creation:', cleanupError);
      });
    }
    next(err);
  }
};

export const updateCircle = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!isModeratorRole(role)) {
      return res.status(403).json({ error: 'Circle moderator privileges required' });
    }

    const { name, description, category, visibility, joinPolicy, tags, avatar, coverImage, rules, welcomeMessage, communityGuidelines, settings } = req.body;
    if (role !== 'owner' && (visibility !== undefined || joinPolicy !== undefined)) {
      return res.status(403).json({ error: 'Only the Circle owner can change visibility or joining policy' });
    }
    if (name !== undefined) {
      const value = typeof name === 'string' ? name.trim() : '';
      if (value.length < 3 || value.length > 60) return res.status(400).json({ error: 'Circle name must be between 3 and 60 characters' });
      circle.name = value;
      circle.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) {
      const value = typeof description === 'string' ? description.trim() : '';
      if (!value || value.length > 1000) return res.status(400).json({ error: 'Circle description is required and must be 1000 characters or fewer' });
      circle.description = value;
    }
    if (category !== undefined) {
      if (!CIRCLE_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Choose a valid Circle category' });
      circle.category = category;
    }
    if (visibility !== undefined) {
      if (!['public', 'private', 'hidden'].includes(visibility)) return res.status(400).json({ error: 'Invalid Circle visibility' });
      circle.visibility = visibility;
    }
    if (joinPolicy !== undefined) {
      if (!['open', 'approval_required', 'invite_only'].includes(joinPolicy)) return res.status(400).json({ error: 'Invalid Circle joining policy' });
      circle.joinPolicy = joinPolicy;
    }
    if (Array.isArray(tags)) circle.tags = tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
    if (avatar !== undefined) circle.avatar = typeof avatar === 'string' ? avatar.trim() : '';
    if (coverImage !== undefined) circle.coverImage = typeof coverImage === 'string' ? coverImage.trim() : '';
    if (Array.isArray(rules)) circle.rules = rules.filter((rule) => typeof rule === 'string').map((rule) => rule.trim()).filter(Boolean).slice(0, 10);
    if (welcomeMessage !== undefined) circle.welcomeMessage = String(welcomeMessage).trim().slice(0, 1000);
    if (communityGuidelines !== undefined) circle.communityGuidelines = String(communityGuidelines).trim().slice(0, 3000);
    if (settings !== undefined) {
      if (role !== 'owner') return res.status(403).json({ error: 'Only the Circle owner can change Circle settings' });
      const settingsError = validateCircleSettings(settings);
      if (settingsError) return res.status(400).json({ error: settingsError });
      circle.settings = { ...circle.settings, ...settings };
    }

    await circle.save();
    const updatedCircle = circle.toObject();
    delete updatedCircle.members;
    delete updatedCircle.moderators;
    res.json({ circle: updatedCircle });
  } catch (err) {
    next(err);
  }
};

export const deleteCircle = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the Circle owner can archive this Circle' });
    circle.status = 'archived';
    await circle.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const joinCircle = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle || circle.status !== 'active') return res.status(404).json({ error: 'Circle not found' });
    const userId = req.user._id;
    let existing = await getCircleMembership(circle, userId);
    if (existing?.status === 'active') {
      await syncLegacyMemberList(circle);
      await syncCircleConversation(circle);
      return res.json({ joined: true, status: 'active', membersCount: circle.membersCount });
    }
    if (existing?.status === 'banned') {
      if (!existing.banExpiresAt || existing.banExpiresAt > new Date()) {
        return res.status(403).json({ error: 'You are banned from this Circle' });
      }
      await writeCircleMembership({
        circle,
        userId,
        role: existing.role || 'member',
        status: 'removed',
        banReason: '',
        banExpiresAt: null,
      });
      existing = null;
    }
    if (existing?.status === 'pending') return res.status(202).json({ joined: false, status: 'pending' });
    if (circle.joinPolicy === 'invite_only') {
      return res.status(403).json({ error: 'This Circle is invite-only' });
    }

    if (circle.joinPolicy === 'approval_required') {
      await writeCircleMembership({ circle, userId, role: 'member', status: 'pending' });
      const managers = await CircleMembership.find({
        circleId: circle._id,
        role: { $in: ['owner', 'admin'] },
        status: 'active',
      }).select('userId').lean();
      await Promise.all(managers.map(({ userId: managerId }) =>
        notifyCircleUser({ recipientId: managerId, actorId: userId, circle, title: `A new member requested to join ${circle.name}` })
      ));
      return res.status(202).json({ joined: false, status: 'pending' });
    }

    await activateMembership({ circle, userId, actorId: userId });
    await notifyCircleUser({ recipientId: circle.ownerId, actorId: userId, circle, title: `A new member joined ${circle.name}`, type: 'circle_join' });
    res.json({ joined: true, status: 'active', membersCount: circle.membersCount });
  } catch (err) {
    next(err);
  }
};

export const createCircleInviteLink = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle || circle.status !== 'active') return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    const mode = getCircleInviteLinkMode(circle);
    if (!canGenerateCircleInviteLink(mode, role)) {
      return res.status(403).json({ error: 'You do not have permission to generate a Circle link' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await CircleInviteLink.findOneAndUpdate(
      { circleId: circle._id },
      {
        $set: {
          createdBy: req.user._id,
          tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
          mode,
          expiresAt,
        },
        $setOnInsert: { circleId: circle._id },
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ token, mode, expiresAt });
  } catch (err) {
    next(err);
  }
};

export const revokeCircleInviteLink = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!canGenerateCircleInviteLink(getCircleInviteLinkMode(circle), role)) {
      return res.status(403).json({ error: 'You do not have permission to revoke the Circle link' });
    }
    await CircleInviteLink.deleteOne({ circleId: circle._id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const redeemCircleInviteLink = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ error: 'Invalid Circle link' });
    const inviteLink = await CircleInviteLink.findOne({
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: { $gt: new Date() },
    });
    if (!inviteLink) return res.status(404).json({ error: 'Circle link is invalid or expired' });
    const circle = await Circle.findOne({ _id: inviteLink.circleId, status: 'active' });
    if (!circle || inviteLink.mode !== getCircleInviteLinkMode(circle)) {
      return res.status(410).json({ error: 'Circle link is no longer valid' });
    }

    const userId = req.user._id;
    let membership = await getCircleMembership(circle, userId);
    if (membership?.status === 'active') {
      return res.json({ joined: true, status: 'active', mode: inviteLink.mode, alreadyMember: true });
    }
    if (membership?.status === 'banned') {
      if (!membership.banExpiresAt || membership.banExpiresAt > new Date()) {
        return res.status(403).json({ error: 'You are banned from this Circle' });
      }
      await writeCircleMembership({
        circle,
        userId,
        role: membership.role || 'member',
        status: 'removed',
        banReason: '',
        banExpiresAt: null,
      });
      membership = null;
    }
    if (membership?.status === 'pending') {
      return res.status(202).json({ joined: false, status: 'pending', mode: inviteLink.mode });
    }

    if (inviteLink.mode === 'request') {
      await writeCircleMembership({ circle, userId, role: 'member', status: 'pending' });
      const managers = await CircleMembership.find({
        circleId: circle._id,
        role: { $in: ['owner', 'admin'] },
        status: 'active',
      }).select('userId').lean();
      await Promise.all(managers.map(({ userId: managerId }) =>
        notifyCircleUser({ recipientId: managerId, actorId: userId, circle, title: `A new member requested to join ${circle.name}` })
      ));
      return res.status(202).json({ joined: false, status: 'pending', mode: inviteLink.mode });
    }

    if (inviteLink.mode === 'invitation') {
      await CircleInvitation.create({
        circleId: circle._id,
        inviterId: inviteLink.createdBy,
        inviteeId: userId,
        status: 'accepted',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(),
      });
    }

    await activateMembership({ circle, userId, actorId: userId });
    if (inviteLink.mode === 'invitation') {
      await notifyCircleUser({
        recipientId: inviteLink.createdBy,
        actorId: userId,
        circle,
        title: `Your invitation link to ${circle.name} was accepted`,
      });
    } else {
      await notifyCircleUser({
        recipientId: circle.ownerId,
        actorId: userId,
        circle,
        title: `A new member joined ${circle.name}`,
        type: 'circle_join',
      });
    }
    res.json({ joined: true, status: 'active', mode: inviteLink.mode });
  } catch (err) {
    next(err);
  }
};

export const leaveCircle = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const membership = await getCircleMembership(circle, req.user._id);
    if (!membership || membership.status !== 'active') return res.status(400).json({ error: 'You are not an active member of this Circle' });
    if (membership.role === 'owner') return res.status(400).json({ error: 'Transfer Circle ownership before leaving' });

    await writeCircleMembership({ circle, userId: req.user._id, role: membership.role, status: 'removed', removedAt: new Date(), removedBy: req.user._id });
    await syncLegacyMemberList(circle);
    const conversation = await Conversation.findOne({ type: 'circle_group', circleId: circle._id });
    if (conversation) {
      conversation.participants = conversation.participants.filter((id) => id.toString() !== req.user._id.toString());
      conversation.unreadBy = conversation.unreadBy.filter((id) => id.toString() !== req.user._id.toString());
      await conversation.save();
    }
    emitMembershipRemoval(req.app.get('io'), req.user._id, circle._id);
    res.json({ left: true, membersCount: circle.membersCount });
  } catch (err) {
    next(err);
  }
};

export const getCircleMembers = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle || !(await canViewCircle(circle, req.user?._id))) return res.status(404).json({ error: 'Circle not found or unavailable' });
    await ensureLegacyMemberships(circle);
    const role = await getCircleRole(circle, req.user?._id);
    if (['pending', 'banned'].includes(req.query.status) && !isManagerRole(role)) {
      return res.status(403).json({ error: 'Circle owner or admin privileges required' });
    }
    const status = ['pending', 'banned'].includes(req.query.status) ? req.query.status : 'active';
    const members = await CircleMembership.find({
      circleId: circle._id,
      status,
    })
      .populate('userId', 'displayName username initials avatarColor avatar')
      .sort({ role: 1, joinedAt: -1 })
      .limit(200)
      .lean();
    res.json({ members });
  } catch (err) {
    next(err);
  }
};

export const getMembershipRequests = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await requireCircleManager(circle, req.user._id, res);
    if (!role) return;
    const requests = await CircleMembership.find({ circleId: circle._id, status: 'pending' })
      .populate('userId', 'displayName username initials avatarColor avatar')
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

export const reviewMembershipRequest = async (req, res, next, forcedDecision = null) => {
  try {
    const { circleId, requestId } = req.params;
    const decision = forcedDecision || req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'Decision must be approve or reject' });
    const circle = await findCircle(circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await requireCircleManager(circle, req.user._id, res);
    if (!role) return;
    const request = await CircleMembership.findOne({ _id: requestId, circleId: circle._id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Membership request not found' });

    if (decision === 'approve') {
      await activateMembership({ circle, userId: request.userId, actorId: req.user._id });
      await notifyCircleUser({ recipientId: request.userId, actorId: req.user._id, circle, title: `Your request to join ${circle.name} was approved` });
    } else {
      request.status = 'rejected';
      request.approvedBy = req.user._id;
      request.approvedAt = new Date();
      await request.save();
      await notifyCircleUser({ recipientId: request.userId, actorId: req.user._id, circle, title: `Your request to join ${circle.name} was declined` });
    }
    res.json({ success: true, status: decision === 'approve' ? 'active' : 'rejected' });
  } catch (err) {
    next(err);
  }
};

export const approveMembershipRequest = (req, res, next) =>
  reviewMembershipRequest(req, res, next, 'approve');

export const rejectMembershipRequest = (req, res, next) =>
  reviewMembershipRequest(req, res, next, 'reject');

export const changeMemberRole = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const actorRole = await getCircleRole(circle, req.user._id);
    const { role } = req.body;
    if (!['admin', 'moderator', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid Circle role' });
    const target = await getCircleMembership(circle, req.params.userId);
    if (!target || target.status !== 'active') return res.status(404).json({ error: 'Active Circle member not found' });
    if (target.role === 'owner') return res.status(400).json({ error: 'Circle ownership cannot be changed through role management' });
    if (actorRole !== 'owner' && !(actorRole === 'admin' && role !== 'admin' && target.role !== 'admin')) {
      return res.status(403).json({ error: 'You cannot assign or change this Circle role' });
    }
    await writeCircleMembership({ circle, userId: req.params.userId, role, status: 'active' });
    await CircleModerationAction.create({
      circleId: circle._id,
      actorId: req.user._id,
      targetUserId: req.params.userId,
      targetType: 'member',
      targetId: req.params.userId,
      action: 'member_role_changed',
      metadata: { previousRole: target.role, newRole: role },
    });
    await syncLegacyMemberList(circle);
    await notifyCircleUser({ recipientId: req.params.userId, actorId: req.user._id, circle, title: `Your role in ${circle.name} was updated` });
    res.json({ success: true, role });
  } catch (err) {
    next(err);
  }
};

const removeMember = async ({ circle, actorId, targetUserId, role, reason, ban, io }, res) => {
  if (!isModeratorRole(role)) {
    return res.status(403).json({ error: 'Circle moderator privileges required' });
  }
  const target = await getCircleMembership(circle, targetUserId);
  if (!target || target.status !== 'active') return res.status(404).json({ error: 'Active Circle member not found' });
  if (target.role === 'owner') return res.status(400).json({ error: 'The Circle owner cannot be removed or banned' });
  if (role === 'moderator' && target.role !== 'member') {
    return res.status(403).json({ error: 'Moderators can only remove or ban members' });
  }
  if (role === 'admin' && target.role === 'admin') {
    return res.status(403).json({ error: 'Only the Circle owner can remove or ban an admin' });
  }
  if (role === 'moderator' && !circle.settings?.allowModeratorRemoval) {
    return res.status(403).json({ error: 'Circle moderators are not allowed to remove members' });
  }

  await writeCircleMembership({
    circle,
    userId: targetUserId,
    role: target.role,
    status: ban ? 'banned' : 'removed',
    removedBy: actorId,
    removedAt: new Date(),
    banReason: ban ? reason : '',
  });
  await CircleModerationAction.create({
    circleId: circle._id,
    actorId,
    targetUserId,
    targetType: 'member',
    targetId: targetUserId,
    action: ban ? 'member_banned' : 'member_removed',
    reason: ban ? reason : '',
  });
  await syncLegacyMemberList(circle);
  const conversation = await Conversation.findOne({ type: 'circle_group', circleId: circle._id });
  if (conversation) {
    conversation.participants = conversation.participants.filter((id) => id.toString() !== targetUserId.toString());
    conversation.unreadBy = conversation.unreadBy.filter((id) => id.toString() !== targetUserId.toString());
    await conversation.save();
  }
  await notifyCircleUser({
    recipientId: targetUserId,
    actorId,
    circle,
    title: ban ? `You were banned from ${circle.name}` : `You were removed from ${circle.name}`,
  });
  emitMembershipRemoval(io, targetUserId, circle._id);
  return res.json({ success: true, status: ban ? 'banned' : 'removed', membersCount: circle.membersCount });
};

export const muteCircleMember = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const actorRole = await getCircleRole(circle, req.user._id);
    if (!isModeratorRole(actorRole)) return res.status(403).json({ error: 'Circle moderator privileges required' });
    const target = await getCircleMembership(circle, req.params.userId);
    if (!target || target.status !== 'active') return res.status(404).json({ error: 'Active Circle member not found' });
    if (target.role === 'owner' || (actorRole === 'moderator' && target.role !== 'member') ||
      (actorRole === 'admin' && target.role === 'admin')) {
      return res.status(403).json({ error: 'You cannot mute this Circle member' });
    }
    if (actorRole === 'moderator' && !circle.settings?.allowModeratorRemoval) {
      return res.status(403).json({ error: 'Circle moderators are not allowed to mute members' });
    }
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) return res.status(400).json({ error: 'A mute reason is required' });
    const durationMs = Math.min(30 * 24 * 60 * 60 * 1000, Math.max(60 * 1000, Number(req.body.durationMs) || 24 * 60 * 60 * 1000));
    const mutedUntil = new Date(Date.now() + durationMs);
    await CircleMembership.updateOne(
      { circleId: circle._id, userId: req.params.userId, status: 'active' },
      { $set: { mutedUntil, muteReason: reason, mutedBy: req.user._id } }
    );
    await CircleModerationAction.create({
      circleId: circle._id,
      actorId: req.user._id,
      targetUserId: req.params.userId,
      targetType: 'member',
      targetId: req.params.userId,
      action: 'member_muted',
      reason,
      metadata: { mutedUntil },
    });
    res.json({ muted: true, mutedUntil });
  } catch (err) {
    next(err);
  }
};

export const unmuteCircleMember = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const actorRole = await getCircleRole(circle, req.user._id);
    if (!isModeratorRole(actorRole)) return res.status(403).json({ error: 'Circle moderator privileges required' });
    const target = await getCircleMembership(circle, req.params.userId);
    if (!target || target.status !== 'active') return res.status(404).json({ error: 'Active Circle member not found' });
    if (actorRole === 'moderator' && target.role !== 'member') {
      return res.status(403).json({ error: 'Moderators can only unmute members' });
    }
    await CircleMembership.updateOne(
      { circleId: circle._id, userId: req.params.userId, status: 'active' },
      { $set: { mutedUntil: null, muteReason: '', mutedBy: null } }
    );
    await CircleModerationAction.create({
      circleId: circle._id,
      actorId: req.user._id,
      targetUserId: req.params.userId,
      targetType: 'member',
      targetId: req.params.userId,
      action: 'member_unmuted',
    });
    res.json({ muted: false });
  } catch (err) {
    next(err);
  }
};

export const removeCircleMember = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    return await removeMember({ circle, actorId: req.user._id, targetUserId: req.params.userId, role, reason: req.body?.reason, ban: false, io: req.app.get('io') }, res);
  } catch (err) {
    next(err);
  }
};

export const banCircleMember = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) return res.status(400).json({ error: 'A ban reason is required' });
    return await removeMember({ circle, actorId: req.user._id, targetUserId: req.params.userId, role, reason, ban: true, io: req.app.get('io') }, res);
  } catch (err) {
    next(err);
  }
};

export const unbanCircleMember = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!isManagerRole(role)) return res.status(403).json({ error: 'Circle owner or admin privileges required' });
    const membership = await CircleMembership.findOne({ circleId: circle._id, userId: req.params.userId, status: 'banned' });
    if (!membership) return res.status(404).json({ error: 'Banned member not found' });
    membership.status = 'removed';
    membership.banReason = '';
    membership.banExpiresAt = null;
    await membership.save();
    await CircleModerationAction.create({
      circleId: circle._id,
      actorId: req.user._id,
      targetUserId: req.params.userId,
      targetType: 'member',
      targetId: req.params.userId,
      action: 'member_unbanned',
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const createInvitation = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await getCircleRole(circle, req.user._id);
    if (!isManagerRole(role) && !(role === 'member' && circle.settings?.allowMemberInvites)) {
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }
    const { inviteeId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(inviteeId)) return res.status(400).json({ error: 'Valid invitee is required' });
    const invitee = await User.findById(inviteeId).select('_id');
    if (!invitee) return res.status(404).json({ error: 'User not found' });
    const existing = await getCircleMembership(circle, invitee._id);
    if (existing?.status === 'banned') return res.status(403).json({ error: 'Banned users cannot be invited' });
    if (existing?.status === 'active') return res.status(409).json({ error: 'User is already a Circle member' });

    await CircleInvitation.updateMany(
      { circleId: circle._id, inviteeId: invitee._id, status: 'pending', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } }
    );
    const invitation = await CircleInvitation.findOneAndUpdate(
      { circleId: circle._id, inviteeId: invitee._id, status: 'pending' },
      {
        $setOnInsert: {
          circleId: circle._id,
          inviteeId: invitee._id,
          inviterId: req.user._id,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      { new: true, upsert: true }
    );
    await writeCircleMembership({ circle, userId: invitee._id, role: 'member', status: 'invited', invitedBy: req.user._id });
    await notifyCircleUser({ recipientId: invitee._id, actorId: req.user._id, circle, title: `You were invited to join ${circle.name}` });
    res.status(201).json({ invitation });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An active invitation already exists for this user' });
    next(err);
  }
};

export const getMyInvitations = async (req, res, next) => {
  try {
    const invitations = await CircleInvitation.find({
      inviteeId: req.user._id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).populate('circleId', 'name slug description icon avatar visibility').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ invitations });
  } catch (err) {
    next(err);
  }
};

const respondToInvitation = async (req, res, next, decision) => {
  try {
    const invitation = await CircleInvitation.findOne({
      _id: req.params.invitationId,
      circleId: req.params.circleId,
      inviteeId: req.user._id,
      status: 'pending',
    });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.expiresAt <= new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(410).json({ error: 'Invitation has expired' });
    }
    const circle = await Circle.findById(invitation.circleId);
    if (!circle || circle.status !== 'active') return res.status(404).json({ error: 'Circle is unavailable' });
    const membership = await getCircleMembership(circle, req.user._id);
    if (membership?.status === 'banned') return res.status(403).json({ error: 'You are banned from this Circle' });
    if (membership?.status === 'active') return res.status(409).json({ error: 'You are already a Circle member' });

    if (decision === 'accept') {
      await activateMembership({ circle, userId: req.user._id, actorId: req.user._id });
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();
      await notifyCircleUser({ recipientId: invitation.inviterId, actorId: req.user._id, circle, title: `Your invitation to ${circle.name} was accepted` });
      return res.json({ success: true, status: 'active' });
    }

    invitation.status = 'declined';
    invitation.declinedAt = new Date();
    await invitation.save();
    await writeCircleMembership({ circle, userId: req.user._id, role: 'member', status: 'rejected' });
    await notifyCircleUser({ recipientId: invitation.inviterId, actorId: req.user._id, circle, title: `Your invitation to ${circle.name} was declined` });
    return res.json({ success: true, status: 'declined' });
  } catch (err) {
    return next(err);
  }
};

export const acceptInvitation = (req, res, next) => respondToInvitation(req, res, next, 'accept');
export const declineInvitation = (req, res, next) => respondToInvitation(req, res, next, 'decline');

export const cancelInvitation = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await requireCircleManager(circle, req.user._id, res);
    if (!role) return;
    const invitation = await CircleInvitation.findOneAndUpdate(
      { _id: req.params.invitationId, circleId: circle._id, status: 'pending' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    await CircleMembership.updateOne(
      { circleId: circle._id, userId: invitation.inviteeId, status: 'invited' },
      { $set: { status: 'removed', removedBy: req.user._id, removedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getCircleInvitations = async (req, res, next) => {
  try {
    const circle = await findCircle(req.params.circleId);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    const role = await requireCircleManager(circle, req.user._id, res);
    if (!role) return;
    const invitations = await CircleInvitation.find({ circleId: circle._id, status: 'pending' })
      .populate('inviteeId', 'displayName username initials avatarColor avatar')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ invitations });
  } catch (err) {
    next(err);
  }
};
