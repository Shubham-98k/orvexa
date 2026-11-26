import 'dotenv/config';
import mongoose from 'mongoose';
import { AuditLog, Notification, Report, Save } from '../models/Notification.js';
import { Circle } from '../models/Circle.js';
import { CircleAnnouncement } from '../models/CircleAnnouncement.js';
import { CircleFeaturedContent } from '../models/CircleFeaturedContent.js';
import { CircleInvitation } from '../models/CircleInvitation.js';
import { CircleInviteLink } from '../models/CircleInviteLink.js';
import { CircleMembership } from '../models/CircleMembership.js';
import { CircleModerationAction } from '../models/CircleModerationAction.js';
import { Conversation, Message } from '../models/Conversation.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { GenerationJob } from '../models/GenerationJob.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { KnowledgeDraft } from '../models/KnowledgeDraft.js';
import { KnowledgeVersion } from '../models/KnowledgeVersion.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { SourceAnalysis } from '../models/SourceAnalysis.js';
import { SourceSnapshot } from '../models/SourceSnapshot.js';
import { User } from '../models/User.js';
import { circleSeedProfiles } from './circleSeedData.js';

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isExecute = args.has('--execute');
const databaseName = process.env.MONGODB_DATABASE;
const expectedDatabaseName = process.env.CIRCLE_RESET_EXPECTED_DATABASE;
const confirmation = `replace-circle-data:${databaseName}`;

const assertTarget = () => {
  if (isDryRun === isExecute) {
    throw new Error('Choose exactly one mode: --dry-run or --execute.');
  }
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Refusing to connect unless NODE_ENV=production is explicitly set.');
  }
  if (!databaseName || databaseName !== expectedDatabaseName) {
    throw new Error('MONGODB_DATABASE must match CIRCLE_RESET_EXPECTED_DATABASE.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required.');
  }

  const uri = new URL(process.env.MONGODB_URI);
  const uriDatabase = uri.pathname.replace(/^\/+|\/+$/g, '') || uri.searchParams.get('dbName');
  if (uriDatabase && uriDatabase !== databaseName) {
    throw new Error('The MongoDB URI database does not match the explicitly approved target.');
  }
  if (['localhost', '127.0.0.1'].includes(uri.hostname)) {
    throw new Error('Refusing to run the production Circle replacement against a local MongoDB server.');
  }
  if (isExecute && (
    process.env.CIRCLE_RESET_CONFIRMATION !== confirmation
    || process.env.CIRCLE_RESET_BACKUP_CONFIRMED !== 'yes'
  )) {
    throw new Error('Execution requires the exact database confirmation and backup confirmation environment flags.');
  }
};

const distinctIds = async (Model, filter, session) => {
  const query = Model.distinct('_id', filter);
  if (session) query.session(session);
  return query;
};

const uniqueIds = (ids) => [...new Map(ids.map((id) => [id.toString(), id])).values()];

const collectTarget = async (session) => {
  const circleIds = await distinctIds(Circle, {}, session);
  const circleRowsQuery = Circle.find({ _id: { $in: circleIds } }).select('groupConversationId');
  if (session) circleRowsQuery.session(session);
  const circleRows = await circleRowsQuery.lean();
  const linkedConversationIds = circleRows.map((circle) => circle.groupConversationId).filter(Boolean);

  const postIds = await distinctIds(Post, { circleId: { $in: circleIds } }, session);
  const discussionIds = await distinctIds(Discussion, { circleId: { $in: circleIds } }, session);
  const articleIds = await distinctIds(KnowledgeArticle, { circleId: { $in: circleIds } }, session);
  const draftIds = await distinctIds(KnowledgeDraft, { circleId: { $in: circleIds } }, session);
  const conversationIds = await distinctIds(Conversation, {
    $or: [
      { type: 'circle_group', circleId: { $in: circleIds } },
      { _id: { $in: linkedConversationIds } },
    ],
  }, session);
  const replyIds = await distinctIds(PostReply, { postId: { $in: postIds } }, session);
  const contributionIds = await distinctIds(DiscussionContribution, { discussionId: { $in: discussionIds } }, session);
  const messageIds = await distinctIds(Message, { conversationId: { $in: conversationIds } }, session);
  const snapshotIds = await distinctIds(SourceSnapshot, {
    $or: [
      { sourceType: 'post', sourceId: { $in: postIds } },
      { sourceType: 'discussion', sourceId: { $in: discussionIds } },
    ],
  }, session);

  const targetIds = uniqueIds([
    ...circleIds,
    ...postIds,
    ...discussionIds,
    ...articleIds,
    ...draftIds,
    ...conversationIds,
    ...messageIds,
    ...replyIds,
    ...contributionIds,
  ]);
  const idList = (ids) => ({ $in: ids });

  return {
    circleIds,
    postIds,
    discussionIds,
    articleIds,
    draftIds,
    conversationIds,
    replyIds,
    contributionIds,
    messageIds,
    snapshotIds,
    operations: [
      ['Circles', Circle, { _id: idList(circleIds) }],
      ['Circle memberships', CircleMembership, { circleId: idList(circleIds) }],
      ['Circle invitations', CircleInvitation, { circleId: idList(circleIds) }],
      ['Circle invite links', CircleInviteLink, { circleId: idList(circleIds) }],
      ['Circle announcements', CircleAnnouncement, { circleId: idList(circleIds) }],
      ['Circle featured content', CircleFeaturedContent, { circleId: idList(circleIds) }],
      ['Circle moderation records', CircleModerationAction, { circleId: idList(circleIds) }],
      ['Circle posts', Post, { _id: idList(postIds) }],
      ['Post replies', PostReply, { _id: idList(replyIds) }],
      ['Circle discussions', Discussion, { _id: idList(discussionIds) }],
      ['Discussion contributions', DiscussionContribution, { _id: idList(contributionIds) }],
      ['Circle knowledge articles', KnowledgeArticle, { _id: idList(articleIds) }],
      ['Circle knowledge drafts', KnowledgeDraft, { _id: idList(draftIds) }],
      ['Knowledge versions', KnowledgeVersion, {
        $or: [
          { articleId: idList(articleIds) },
          { draftId: idList(draftIds) },
        ],
      }],
      ['Source snapshots', SourceSnapshot, { _id: idList(snapshotIds) }],
      ['Source analyses', SourceAnalysis, {
        $or: [
          { snapshotId: idList(snapshotIds) },
          { sourceId: { $in: [...postIds, ...discussionIds] } },
        ],
      }],
      ['Circle generation jobs', GenerationJob, { draftId: idList(draftIds) }],
      ['Circle group conversations', Conversation, { _id: idList(conversationIds) }],
      ['Circle group messages', Message, { _id: idList(messageIds) }],
      ['Circle notifications', Notification, {
        $or: [
          { circleId: idList(circleIds) },
          { targetId: idList(targetIds) },
        ],
      }],
      ['Circle reports', Report, {
        $or: [
          { circleId: idList(circleIds) },
          { targetId: idList(targetIds) },
        ],
      }],
      ['Saved Circle content', Save, {
        $or: [
          { itemType: 'post', itemId: idList(postIds) },
          { itemType: 'discussion', itemId: idList(discussionIds) },
          { itemType: 'knowledge', itemId: idList(articleIds) },
        ],
      }],
      ['Circle audit records', AuditLog, { targetId: idList(targetIds) }],
    ],
  };
};

const countOperations = async (operations, session) => {
  const counts = [];
  for (const [label, Model, filter] of operations) {
    const query = Model.countDocuments(filter);
    if (session) query.session(session);
    counts.push([label, await query]);
  }
  return counts;
};

const chooseMemberUsers = (activeUsers, owner, profileIndex) => {
  const candidates = activeUsers.filter((user) => user._id.toString() !== owner._id.toString());
  if (!candidates.length) return [owner];
  const start = (profileIndex * 2) % candidates.length;
  const rotated = [...candidates.slice(start), ...candidates.slice(0, start)];
  return [owner, ...rotated.slice(0, 2)];
};

const seedProfile = async (profile, profileIndex, activeUsers, session) => {
  const fallbackOwner = activeUsers.find((user) => user.platformRole === 'admin') || activeUsers[0];
  const owner = activeUsers.find((user) => user.username === profile.ownerUsername) || fallbackOwner;
  const memberUsers = chooseMemberUsers(activeUsers, owner, profileIndex);
  const moderator = memberUsers[1] || null;
  const memberIds = memberUsers.map((user) => user._id);
  const now = new Date();

  const [circle] = await Circle.create([{
    name: profile.name,
    slug: profile.slug,
    description: profile.description,
    ownerId: owner._id,
    icon: profile.icon,
    category: profile.category,
    tags: profile.tags,
    avatar: profile.avatar,
    coverImage: profile.coverImage,
    rules: profile.rules,
    welcomeMessage: profile.welcomeMessage,
    communityGuidelines: profile.communityGuidelines,
    joinPolicy: 'open',
    visibility: 'public',
    status: 'active',
    members: memberIds,
    moderators: moderator ? [moderator._id] : [],
    membersCount: memberIds.length,
    settings: {
      allowVisitorPosts: false,
      allowVisitorDiscussions: false,
      allowMemberInvites: true,
      allowModeratorRemoval: true,
      allowModeratorAnnouncements: true,
      maxFeaturedContent: 5,
    },
  }], { session });

  await CircleMembership.insertMany(memberUsers.map((user) => ({
    circleId: circle._id,
    userId: user._id,
    role: user._id.equals(owner._id) ? 'owner' : moderator && user._id.equals(moderator._id) ? 'moderator' : 'member',
    status: 'active',
    joinedAt: now,
  })), { session });

  const [conversation] = await Conversation.create([{
    type: 'circle_group',
    participants: memberIds,
    circleId: circle._id,
    createdBy: owner._id,
    lastMessage: '',
    lastMessageAt: now,
  }], { session });
  circle.groupConversationId = conversation._id;
  await circle.save({ session });

  const author = {
    authorId: owner._id,
    authorName: owner.displayName,
    authorInitials: owner.initials,
    authorColor: owner.avatarColor,
  };
  const replyAuthor = memberUsers[1] || owner;
  const [post] = await Post.create([{
    ...author,
    circleName: circle.name,
    circleId: circle._id,
    title: profile.post.title,
    body: profile.post.body,
    imageUrl: profile.post.imageUrl,
    tags: profile.post.tags,
    visibility: 'public',
    status: 'published',
    commentCount: memberUsers.length > 1 ? 1 : 0,
    commentsCount: memberUsers.length > 1 ? 1 : 0,
  }], { session });
  if (memberUsers.length > 1) {
    await PostReply.create([{
      postId: post._id,
      authorId: replyAuthor._id,
      authorName: replyAuthor.displayName,
      authorInitials: replyAuthor.initials,
      authorColor: replyAuthor.avatarColor,
      body: 'This is useful in practice. A small, concrete first step makes it much easier for others to contribute.',
    }], { session });
  }

  const [discussion] = await Discussion.create([{
    ...author,
    circleId: circle._id,
    title: profile.discussion.title,
    body: profile.discussion.body,
    category: profile.discussion.category,
    tags: profile.discussion.tags,
    visibility: 'public',
    status: 'open',
    commentsCount: memberUsers.length > 1 ? 1 : 0,
    contributorsCount: memberUsers.length > 1 ? 2 : 1,
  }], { session });
  if (memberUsers.length > 1) {
    await DiscussionContribution.create([{
      discussionId: discussion._id,
      authorId: replyAuthor._id,
      authorName: replyAuthor.displayName,
      authorInitials: replyAuthor.initials,
      authorColor: replyAuthor.avatarColor,
      body: 'A helpful way to approach this is to test one small change with the people who will use it, then share what you learned.',
      depth: 0,
    }], { session });
  }

  await KnowledgeArticle.create([{
    ...author,
    circleId: circle._id,
    visibility: 'public',
    title: profile.knowledge.title,
    summary: profile.knowledge.summary,
    content: profile.knowledge.content,
    coverImage: profile.knowledge.coverImage,
    format: profile.knowledge.format,
    category: profile.knowledge.category,
    topics: profile.knowledge.tags,
    tags: profile.knowledge.tags,
    status: 'published',
    publishedAt: now,
  }], { session });

  await CircleAnnouncement.create([{
    circleId: circle._id,
    authorId: owner._id,
    title: profile.announcement.title,
    body: profile.announcement.body,
    pinned: true,
    status: 'active',
  }], { session });
};

const run = async () => {
  assertTarget();
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: databaseName,
    autoIndex: false,
    autoCreate: false,
  });

  try {
    if (isDryRun) {
      const target = await collectTarget();
      const counts = await countOperations(target.operations);
      console.log(`Read-only Circle replacement preview for database "${databaseName}":`);
      for (const [label, count] of counts) console.log(`- ${label}: ${count}`);
      console.log(`- New Circle profiles to create: ${circleSeedProfiles.length}`);
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const activeUsers = await User.find({ accountStatus: 'active' })
          .select('_id username displayName initials avatarColor platformRole')
          .sort({ createdAt: 1 })
          .session(session)
          .lean();
        if (!activeUsers.length) throw new Error('No existing active users are available for the Circle seed.');

        const target = await collectTarget(session);
        const counts = await countOperations(target.operations, session);
        for (const [, Model, filter] of target.operations) {
          await Model.deleteMany(filter, { session });
        }
        for (const [index, profile] of circleSeedProfiles.entries()) {
          await seedProfile(profile, index, activeUsers, session);
        }
        console.log(`Replaced Circle data in the approved database "${databaseName}".`);
        console.log(`Removed records: ${counts.reduce((sum, [, count]) => sum + count, 0)}; created Circles: ${circleSeedProfiles.length}.`);
      });
    } finally {
      await session.endSession();
    }
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(`[Circle replacement] ${error.message}`);
  process.exitCode = 1;
});
