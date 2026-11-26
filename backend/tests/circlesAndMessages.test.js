import assert from 'node:assert/strict';
import { Circle } from '../src/models/Circle.js';
import { CircleInviteLink } from '../src/models/CircleInviteLink.js';
import { CircleMembership } from '../src/models/CircleMembership.js';
import { Conversation } from '../src/models/Conversation.js';
import { CircleModerationAction } from '../src/models/CircleModerationAction.js';
import { Discussion } from '../src/models/Discussion.js';
import { KnowledgeArticle } from '../src/models/KnowledgeArticle.js';
import { PostReply } from '../src/models/PostReply.js';
import { Post } from '../src/models/Post.js';
import { AuditLog, Notification, Report, Save } from '../src/models/Notification.js';
import { User } from '../src/models/User.js';
import {
  moderateDeleteCircleContent,
  reportCircleContent,
  resolveCircleReport,
} from '../src/controllers/circleCommunityController.js';
import { getAdminOverview, submitReport, updateReport } from '../src/controllers/adminController.js';
import {
  canGenerateCircleInviteLink,
  createCircleInviteLink,
  getCircleInviteLinkMode,
  updateCircle,
} from '../src/controllers/circleController.js';
import { getPostById } from '../src/controllers/postController.js';
import {
  canViewCircle,
} from '../src/services/circleAccessService.js';
import {
  getAuthorizedConversation,
  isWithinDirectMessageEditWindow,
  saveConversationMessage,
} from '../src/services/messageService.js';

const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439012';
const circleId = '507f1f77bcf86cd799439013';
const conversationId = '507f1f77bcf86cd799439014';

const originalMethods = {
  findConversation: Conversation.findById,
  findCircleById: Circle.findById,
  findMembership: CircleMembership.findOne,
  findAndUpdateMembership: CircleMembership.findOneAndUpdate,
  findCircle: Circle.findOne,
  findCircles: Circle.find,
  findMemberships: CircleMembership.find,
  updateInviteLink: CircleInviteLink.findOneAndUpdate,
  findPost: Post.findOne,
  findPostReplies: PostReply.find,
  findSave: Save.exists,
  findUserById: User.findById,
  createModerationAction: CircleModerationAction.create,
};

const restoreMethods = () => {
  Conversation.findById = originalMethods.findConversation;
  Circle.findById = originalMethods.findCircleById;
  CircleMembership.findOne = originalMethods.findMembership;
  CircleMembership.findOneAndUpdate = originalMethods.findAndUpdateMembership;
  Circle.findOne = originalMethods.findCircle;
  Circle.find = originalMethods.findCircles;
  CircleMembership.find = originalMethods.findMemberships;
  CircleInviteLink.findOneAndUpdate = originalMethods.updateInviteLink;
  Post.findOne = originalMethods.findPost;
  PostReply.find = originalMethods.findPostReplies;
  Save.exists = originalMethods.findSave;
  User.findById = originalMethods.findUserById;
  CircleModerationAction.create = originalMethods.createModerationAction;
};

try {
  assert.equal(getCircleInviteLinkMode({ visibility: 'public', joinPolicy: 'open' }), 'join');
  assert.equal(getCircleInviteLinkMode({ visibility: 'public', joinPolicy: 'approval_required' }), 'request');
  assert.equal(getCircleInviteLinkMode({ visibility: 'private', joinPolicy: 'open' }), 'invitation');
  assert.equal(getCircleInviteLinkMode({ visibility: 'private', joinPolicy: 'approval_required' }), 'request');
  assert.equal(canGenerateCircleInviteLink('join', 'member'), true, 'Any active member can create an open Circle link');
  assert.equal(canGenerateCircleInviteLink('request', 'moderator'), true, 'Moderators can create approval-required links');
  assert.equal(canGenerateCircleInviteLink('request', 'member'), false, 'Members cannot create approval-required links');
  assert.equal(canGenerateCircleInviteLink('invitation', 'admin'), true, 'Admins can create private Circle invitation links');
  assert.equal(canGenerateCircleInviteLink('invitation', 'moderator'), false, 'Moderators cannot create private Circle invitation links');

  let linkUpdate;
  const openCircle = { _id: circleId, status: 'active', visibility: 'public', joinPolicy: 'open' };
  Circle.findOne = async () => openCircle;
  CircleMembership.findOne = () => ({
    lean: async () => ({ circleId, userId, role: 'member', status: 'active' }),
  });
  CircleInviteLink.findOneAndUpdate = async (...args) => { linkUpdate = args; };
  const linkResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await createCircleInviteLink({ params: { circleId }, user: { _id: userId } }, linkResponse, (error) => { throw error; });
  assert.equal(linkResponse.statusCode, 201, 'Active members can generate links for public open Circles');
  assert.match(linkResponse.body.token, /^[a-f0-9]{64}$/);
  assert.equal(linkUpdate[1].$set.mode, 'join');
  assert.notEqual(linkUpdate[1].$set.tokenHash, linkResponse.body.token, 'Only the token hash is stored');

  Circle.findOne = async () => ({ ...openCircle, visibility: 'private' });
  let privateLinkSaved = false;
  CircleInviteLink.findOneAndUpdate = async () => { privateLinkSaved = true; };
  const privateLinkResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await createCircleInviteLink({ params: { circleId }, user: { _id: userId } }, privateLinkResponse, (error) => { throw error; });
  assert.equal(privateLinkResponse.statusCode, 403, 'Ordinary members cannot generate private Circle invitation links');
  assert.equal(privateLinkSaved, false, 'Unauthorized link generation does not persist a link');

  const recentDirectMessage = { createdAt: new Date(1_000) };
  assert.equal(isWithinDirectMessageEditWindow(recentDirectMessage, 61_000), true, 'Direct messages remain editable at the one-minute boundary');
  assert.equal(isWithinDirectMessageEditWindow(recentDirectMessage, 61_001), false, 'Direct messages cannot be edited after one minute');
  assert.equal(isWithinDirectMessageEditWindow({ createdAt: new Date(62_000) }, 61_000), false, 'Future-dated messages are not editable');

  assert.equal(
    await canViewCircle({ _id: circleId, status: 'archived', visibility: 'public' }, userId),
    false,
    'Archived Circles are not accessible through public Circle routes'
  );

  const publicCircle = { _id: circleId };
  let includePublicCircle = true;
  let postFilter;
  const detailPost = {
    _id: conversationId,
    circleId,
    visibility: 'public',
    status: 'published',
    likes: [],
    likedBy: [],
    likeCount: 0,
  };
  Circle.find = (filter) => ({
    select() { return this; },
    lean: async () => filter.visibility === 'public' && includePublicCircle ? [publicCircle] : [],
  });
  CircleMembership.find = () => ({
    select() { return this; },
    lean: async () => [],
  });
  User.findById = () => ({
    select() { return this; },
    lean: async () => ({ following: [] }),
  });
  Post.findOne = (filter) => ({
    lean: async () => {
      postFilter = filter;
      const circleIds = filter.$and[1].$and[0].$or.flatMap((clause) => clause.circleId?.$in || []);
      return circleIds.some((id) => id.toString() === circleId) ? detailPost : null;
    },
  });
  PostReply.find = () => ({
    sort() { return this; },
    lean: async () => [],
  });
  Save.exists = async () => false;
  const detailResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await getPostById({
    params: { postId: conversationId },
    user: { _id: userId },
  }, detailResponse, (error) => { throw error; });
  assert.equal(detailResponse.body.post._id, conversationId, 'Public Circle posts can be opened by non-members');
  assert.ok(postFilter.$and[1].$and[0].$or.some((clause) => clause.circleId?.$in?.includes(circleId)), 'Post detail lookup is constrained to accessible Circle IDs');

  includePublicCircle = false;
  const privatePostResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await getPostById({
    params: { postId: conversationId },
    user: { _id: userId },
  }, privatePostResponse, (error) => { throw error; });
  assert.equal(privatePostResponse.statusCode, 404, 'Posts from inaccessible private Circles are not returned by the detail route');

  let circleSaveCount = 0;
  const editableCircle = {
    _id: circleId,
    name: 'Circle name',
    description: 'Old description',
    category: 'Community',
    tags: [],
    rules: [],
    settings: {},
    save: async () => { circleSaveCount += 1; },
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        description: this.description,
        category: this.category,
      };
    },
  };
  Circle.findOne = async () => editableCircle;
  CircleMembership.findOne = () => ({
    lean: async () => ({ circleId, userId, role: 'moderator', status: 'active' }),
  });
  const moderatorUpdateResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await updateCircle({
    params: { circleId },
    user: { _id: userId },
    body: { description: 'Updated by a moderator' },
  }, moderatorUpdateResponse, (error) => { throw error; });
  assert.equal(moderatorUpdateResponse.body.circle.description, 'Updated by a moderator', 'Circle moderators can edit general details');
  assert.equal(circleSaveCount, 1);

  const ownerOnlyUpdateResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await updateCircle({
    params: { circleId },
    user: { _id: userId },
    body: { visibility: 'private' },
  }, ownerOnlyUpdateResponse, (error) => { throw error; });
  assert.equal(ownerOnlyUpdateResponse.statusCode, 403, 'Circle moderators cannot change owner-only visibility settings');
  assert.equal(circleSaveCount, 1, 'Rejected owner-only changes do not persist');

  const moderateCircle = { _id: circleId };
  const post = { _id: conversationId, authorId: userId, status: 'published', save: async () => {} };
  let scopedPostFilter;
  let auditRecord;
  Circle.findOne = async () => moderateCircle;
  CircleMembership.findOne = () => ({
    lean: async () => ({ circleId, userId, role: 'moderator', status: 'active' }),
  });
  Post.findOne = async (filter) => {
    scopedPostFilter = filter;
    return post;
  };
  CircleModerationAction.create = async (action) => {
    auditRecord = action;
    return action;
  };
  const moderatorResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await moderateDeleteCircleContent({
    params: { circleId, contentType: 'post', contentId: conversationId },
    user: { _id: userId },
    body: { reason: 'Off-topic' },
  }, moderatorResponse, (error) => { throw error; });
  assert.equal(post.status, 'deleted', 'Circle moderators can remove posts within their Circle');
  assert.equal(scopedPostFilter.circleId, circleId, 'Circle moderation is scoped to the target Circle');
  assert.equal(auditRecord.action, 'content_deleted', 'Circle content removals are audited');

  CircleMembership.findOne = () => ({
    lean: async () => ({ circleId, userId, role: 'member', status: 'active' }),
  });
  const memberResponse = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await moderateDeleteCircleContent({
    params: { circleId, contentType: 'post', contentId: conversationId },
    user: { _id: userId },
    body: { reason: 'Not allowed' },
  }, memberResponse, (error) => { throw error; });
  assert.equal(memberResponse.statusCode, 403, 'Ordinary Circle members cannot moderate Circle content');

  const reportMethods = {
    circleFindOne: Circle.findOne,
    membershipFindOne: CircleMembership.findOne,
    reportCreate: Report.create,
    reportFindOne: Report.findOne,
    reportFindById: Report.findById,
    postFindById: Post.findById,
    reportCountDocuments: Report.countDocuments,
    reportFind: Report.find,
    auditLogFind: AuditLog.find,
    auditLogCreate: AuditLog.create,
    notificationCreate: Notification.create,
    moderationActionCreate: CircleModerationAction.create,
    knowledgeFindById: KnowledgeArticle.findById,
    userCountDocuments: User.countDocuments,
    postCountDocuments: Post.countDocuments,
    discussionCountDocuments: Discussion.countDocuments,
    knowledgeCountDocuments: KnowledgeArticle.countDocuments,
    circleCountDocuments: Circle.countDocuments,
  };
  try {
    const sourceCircleArticle = {
      _id: conversationId,
      authorId: otherUserId,
      circleId: null,
      origin: { type: 'post', circleId },
    };
    let circleReport;
    Circle.findOne = async () => ({ _id: circleId, status: 'active', visibility: 'public' });
    KnowledgeArticle.findById = async () => sourceCircleArticle;
    Report.create = async (data) => { circleReport = data; return data; };
    const circleReportResponse = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await reportCircleContent({
      params: { circleId },
      user: { _id: userId },
      body: { targetType: 'knowledge', targetId: conversationId, reason: 'Misleading' },
    }, circleReportResponse, (error) => { throw error; });
    assert.equal(circleReportResponse.statusCode, 201);
    assert.equal(circleReport.circleId, circleId, 'Circle-origin Knowledge reports are assigned to the Circle queue');

    const globalReportResponse = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await submitReport({
      body: { targetType: 'knowledge', targetId: conversationId, reason: 'Misleading' },
      user: { _id: userId },
    }, globalReportResponse, (error) => { throw error; });
    assert.equal(globalReportResponse.statusCode, 400);
    assert.equal(globalReportResponse.body.code, 'CIRCLE_REPORT_REQUIRED');

    let reportSaved = false;
    Report.findById = async () => ({
      circleId,
      save: async () => { reportSaved = true; },
    });
    const globalModerationResponse = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await updateReport({
      params: { reportId: conversationId },
      body: { status: 'actioned' },
      user: { _id: userId, platformRole: 'admin' },
    }, globalModerationResponse, (error) => { throw error; });
    assert.equal(globalModerationResponse.statusCode, 403);
    assert.equal(reportSaved, false, 'Platform staff cannot resolve a Circle-scoped report');

    let authorNotification;
    let globalReportActioned = false;
    const globalPost = {
      _id: conversationId,
      authorId: otherUserId,
      status: 'published',
      save: async () => {},
    };
    Post.findById = async () => globalPost;
    Notification.create = async (data) => { authorNotification = data; return data; };
    AuditLog.create = async () => ({});
    Report.findById = async () => ({
      _id: conversationId,
      targetType: 'post',
      targetId: conversationId,
      circleId: null,
      save: async function save() { globalReportActioned = this.status === 'actioned'; },
    });
    const removeGlobalResponse = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await updateReport({
      params: { reportId: conversationId },
      body: { action: 'remove_content', actionTaken: 'Removed for violating the rules.' },
      user: { _id: userId, platformRole: 'admin', displayName: 'Moderator' },
    }, removeGlobalResponse, (error) => { throw error; });
    assert.equal(globalPost.status, 'deleted');
    assert.equal(authorNotification.recipientId, otherUserId);
    assert.equal(authorNotification.message, 'Removed for violating the rules.');
    assert.equal(globalReportActioned, true);
    assert.equal(removeGlobalResponse.body.removedStatus, 'deleted');

    let circleReportFilter;
    let circleReportSaved = false;
    let moderationAction;
    CircleMembership.findOne = () => ({
      lean: async () => ({ circleId, userId, role: 'moderator', status: 'active' }),
    });
    Report.findOne = async (filter) => {
      circleReportFilter = filter;
      return {
        _id: conversationId,
        circleId,
        targetType: 'knowledge',
        targetId: conversationId,
        save: async () => { circleReportSaved = true; },
      };
    };
    CircleModerationAction.create = async (action) => { moderationAction = action; };
    const circleModerationResponse = {
      json(body) { this.body = body; return this; },
      status(code) { this.statusCode = code; return this; },
    };
    await resolveCircleReport({
      params: { circleId, reportId: conversationId },
      body: { status: 'dismissed', actionTaken: 'Reviewed by Circle moderators' },
      user: { _id: userId },
    }, circleModerationResponse, (error) => { throw error; });
    assert.deepEqual(circleReportFilter, { _id: conversationId, circleId });
    assert.equal(circleReportSaved, true);
    assert.equal(moderationAction.circleId, circleId);

    CircleMembership.findOne = () => ({
      lean: async () => ({ circleId, userId, role: 'member', status: 'active' }),
    });
    circleReportSaved = false;
    const memberResolveResponse = {
      json(body) { this.body = body; return this; },
      status(code) { this.statusCode = code; return this; },
    };
    await resolveCircleReport({
      params: { circleId, reportId: conversationId },
      body: { status: 'dismissed' },
      user: { _id: userId },
    }, memberResolveResponse, (error) => { throw error; });
    assert.equal(memberResolveResponse.statusCode, 403);
    assert.equal(circleReportSaved, false, 'Ordinary Circle members cannot resolve Circle reports');

    let circleAuthorNotification;
    let circleReportActioned = false;
    const circlePost = {
      _id: conversationId,
      authorId: otherUserId,
      circleId,
      status: 'published',
      save: async () => {},
    };
    CircleMembership.findOne = () => ({
      lean: async () => ({ circleId, userId, role: 'moderator', status: 'active' }),
    });
    Post.findById = async () => circlePost;
    Notification.create = async (data) => { circleAuthorNotification = data; return data; };
    Report.findOne = async () => ({
      _id: conversationId,
      circleId,
      targetType: 'post',
      targetId: conversationId,
      reason: 'Inappropriate',
      save: async function save() { circleReportActioned = this.status === 'actioned'; },
    });
    const removeCircleResponse = {
      json(body) { this.body = body; return this; },
      status(code) { this.statusCode = code; return this; },
    };
    await resolveCircleReport({
      params: { circleId, reportId: conversationId },
      body: { action: 'remove_content', actionTaken: 'Removed under Circle rules.' },
      user: { _id: userId, displayName: 'Circle moderator' },
    }, removeCircleResponse, (error) => { throw error; });
    assert.equal(circlePost.status, 'deleted');
    assert.equal(circleAuthorNotification.recipientId, otherUserId);
    assert.equal(circleAuthorNotification.circleId, circleId);
    assert.equal(circleReportActioned, true);
    assert.equal(removeCircleResponse.body.removedStatus, 'deleted');

    let pendingFilter;
    let recentFilter;
    User.countDocuments = async () => 0;
    Post.countDocuments = async () => 0;
    Discussion.countDocuments = async () => 0;
    KnowledgeArticle.countDocuments = async () => 0;
    Circle.countDocuments = async () => 0;
    Report.countDocuments = async (filter) => {
      pendingFilter = filter;
      return 0;
    };
    Report.find = (filter) => {
      recentFilter = filter;
      return {
        populate() { return this; },
        sort() { return this; },
        limit() { return this; },
        lean: async () => [],
      };
    };
    AuditLog.find = () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [] });
    const overviewResponse = { json(body) { this.body = body; return this; } };
    await getAdminOverview({ user: { _id: userId, platformRole: 'admin' } }, overviewResponse, (error) => { throw error; });
    assert.equal(pendingFilter.circleId, null);
    assert.equal(recentFilter.circleId, null);
  } finally {
    Circle.findOne = reportMethods.circleFindOne;
    CircleMembership.findOne = reportMethods.membershipFindOne;
    Report.create = reportMethods.reportCreate;
    Report.findOne = reportMethods.reportFindOne;
    Report.findById = reportMethods.reportFindById;
    Post.findById = reportMethods.postFindById;
    Report.countDocuments = reportMethods.reportCountDocuments;
    Report.find = reportMethods.reportFind;
    AuditLog.find = reportMethods.auditLogFind;
    AuditLog.create = reportMethods.auditLogCreate;
    Notification.create = reportMethods.notificationCreate;
    CircleModerationAction.create = reportMethods.moderationActionCreate;
    KnowledgeArticle.findById = reportMethods.knowledgeFindById;
    User.countDocuments = reportMethods.userCountDocuments;
    Post.countDocuments = reportMethods.postCountDocuments;
    Discussion.countDocuments = reportMethods.discussionCountDocuments;
    KnowledgeArticle.countDocuments = reportMethods.knowledgeCountDocuments;
    Circle.countDocuments = reportMethods.circleCountDocuments;
  }

  const directConversation = {
    _id: conversationId,
    type: 'direct',
    participants: [userId, otherUserId],
  };
  Conversation.findById = async () => directConversation;

  const allowedDirect = await getAuthorizedConversation(conversationId, userId);
  assert.equal(allowedDirect.conversation, directConversation, 'Direct participants can access their conversation');

  const deniedDirect = await getAuthorizedConversation(conversationId, '507f1f77bcf86cd799439015');
  assert.equal(deniedDirect.status, 404, 'Non-participants cannot discover a direct conversation');

  const groupConversation = {
    _id: conversationId,
    type: 'circle_group',
    circleId,
    participants: [userId],
  };
  const activeCircle = {
    _id: circleId,
    status: 'active',
    ownerId: otherUserId,
    members: [userId],
    moderators: [],
  };
  Conversation.findById = async () => groupConversation;
  Circle.findById = async () => activeCircle;

  CircleMembership.findOne = async () => ({
    circleId,
    userId,
    status: 'active',
    role: 'member',
    mutedUntil: new Date(Date.now() + 60_000),
  });
  const mutedGroupMember = await getAuthorizedConversation(conversationId, userId, { forSend: true });
  assert.equal(mutedGroupMember.status, 403, 'Muted Circle members cannot send group messages');

  CircleMembership.findOne = async () => ({ circleId, userId, status: 'removed', role: 'member' });
  const removedGroupMember = await getAuthorizedConversation(conversationId, userId);
  assert.equal(removedGroupMember.status, 404, 'Explicitly removed members cannot use legacy embedded membership');

  CircleMembership.findOne = async () => null;
  CircleMembership.findOneAndUpdate = () => ({
    lean: async () => ({ circleId, userId, status: 'active', role: 'member' }),
  });
  const migratedLegacyMember = await getAuthorizedConversation(conversationId, userId);
  assert.equal(migratedLegacyMember.membership.status, 'active', 'Legacy members are migrated before group access');

  await assert.rejects(
    saveConversationMessage({ conversation: directConversation, user: { _id: userId }, body: '  ' }),
    (error) => error.status === 400,
    'Empty messages are rejected before persistence'
  );

  console.log('All Circle membership and messaging authorization checks passed.');
} finally {
  restoreMethods();
}
