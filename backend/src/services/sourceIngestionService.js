import mongoose from 'mongoose';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { SourceSnapshot } from '../models/SourceSnapshot.js';

const MAX_SNAPSHOT_ITEMS = 300;

/**
 * Creates a stable, reproducible SourceSnapshot from a Discussion or Post.
 * Uses cursor-based batching so memory is strictly bounded.
 */
export async function createSourceSnapshot({
  sourceType,
  sourceId,
  selectionCriteria = {},
  snapshotBoundary = new Date(),
}) {
  const includeReplies = selectionCriteria.includeReplies !== false;
  const sourceObjectId = new mongoose.Types.ObjectId(sourceId);

  let sourceRecord = null;
  let sourceTitle = '';
  let sourceAuthorId = null;
  let sourceAuthorName = '';
  const rawItems = [];
  let totalEligibleSources = 0;
  const addItem = (item) => {
    totalEligibleSources += 1;
    if (rawItems.length < MAX_SNAPSHOT_ITEMS) rawItems.push(item);
  };

  if (sourceType === 'discussion') {
    sourceRecord = await Discussion.findById(sourceId);
    if (!sourceRecord) throw new Error('Discussion not found');

    sourceTitle = sourceRecord.title;
    sourceAuthorId = sourceRecord.authorId;
    sourceAuthorName = sourceRecord.authorName;

    // Use cursor-based stream for contributions
    const cursor = DiscussionContribution.find({
      discussionId: sourceId,
      status: 'active',
      createdAt: { $lte: snapshotBoundary },
    })
      .sort({ createdAt: 1, _id: 1 })
      .select('authorId authorName authorInitials authorColor body votes createdAt parentContributionId')
      .lean()
      .cursor();

    for await (const contribution of cursor) {
      addItem({
        sourceType: 'discussionContribution',
        sourceId: contribution._id,
        parentSourceId: contribution.parentContributionId || null,
        authorId: contribution.authorId,
        authorName: contribution.authorName,
        authorInitials: contribution.authorInitials,
        authorColor: contribution.authorColor,
        contentPreview: contribution.body?.slice(0, 200) || '',
        fullBody: (contribution.body || '').slice(0, 1200),
        voteCount: contribution.votes || (Array.isArray(contribution.voters) ? contribution.voters.length : 0),
        createdAt: contribution.createdAt,
      });
    }
  } else if (sourceType === 'post') {
    sourceRecord = await Post.findById(sourceId);
    if (!sourceRecord) throw new Error('Post not found');

    sourceTitle = sourceRecord.title || (sourceRecord.body.slice(0, 60) + '...');
    sourceAuthorId = sourceRecord.authorId;
    sourceAuthorName = sourceRecord.authorName;

    // The post itself is the foundational primary source
    addItem({
      sourceType: 'post',
      sourceId: sourceRecord._id,
      parentSourceId: null,
      authorId: sourceRecord.authorId,
      authorName: sourceRecord.authorName,
      authorInitials: sourceRecord.authorInitials,
      authorColor: sourceRecord.authorColor,
      contentPreview: sourceRecord.body?.slice(0, 200) || '',
      fullBody: (sourceRecord.body || '').slice(0, 1200),
      voteCount: sourceRecord.likeCount || 0,
      createdAt: sourceRecord.createdAt,
      selectionReason: 'original_post',
    });

    if (includeReplies) {
      const cursor = PostReply.find({
        postId: sourceId,
        createdAt: { $lte: snapshotBoundary },
      })
        .sort({ createdAt: 1, _id: 1 })
        .select('authorId authorName authorInitials authorColor body createdAt parentReplyId')
        .lean()
        .cursor();

      for await (const reply of cursor) {
        addItem({
          sourceType: 'postReply',
          sourceId: reply._id,
          parentSourceId: reply.parentReplyId || null,
          authorId: reply.authorId,
          authorName: reply.authorName,
          authorInitials: reply.authorInitials,
          authorColor: reply.authorColor,
          contentPreview: reply.body?.slice(0, 200) || '',
          fullBody: (reply.body || '').slice(0, 1200),
          voteCount: 0,
          createdAt: reply.createdAt,
        });
      }
    }
  } else {
    throw new Error(`Unsupported sourceType: ${sourceType}`);
  }

  let uniqueContributorCount = 0;
  if (sourceType === 'discussion') {
    const [contributorCount] = await DiscussionContribution.aggregate([
      {
        $match: {
          discussionId: sourceObjectId,
          status: 'active',
          createdAt: { $lte: snapshotBoundary },
        },
      },
      { $group: { _id: '$authorId' } },
      { $count: 'count' },
    ]);
    uniqueContributorCount = contributorCount?.count || 0;
  } else {
    const [replyContributorCount] = includeReplies
      ? await PostReply.aggregate([
        { $match: { postId: sourceObjectId, createdAt: { $lte: snapshotBoundary } } },
        { $group: { _id: '$authorId' } },
        { $count: 'count' },
      ])
      : [];
    const authorHasReplied = includeReplies
      ? await PostReply.exists({
        postId: sourceObjectId,
        authorId: sourceRecord.authorId,
        createdAt: { $lte: snapshotBoundary },
      })
      : false;
    uniqueContributorCount = (replyContributorCount?.count || 0) + (authorHasReplied ? 0 : 1);
  }

  // Store a bounded chronological sample while keeping exact source counts.
  const manifestItems = rawItems.map((item, idx) => ({
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    parentSourceId: item.parentSourceId,
    authorId: item.authorId,
    authorName: item.authorName,
    authorInitials: item.authorInitials,
    authorColor: item.authorColor,
    contentPreview: item.contentPreview,
    sourceText: item.fullBody || item.contentPreview || '',
    voteCount: item.voteCount,
    selectionReason: item.selectionReason || (item.voteCount > 5 ? 'high_engagement' : idx < 20 ? 'representative' : 'chronological_sample'),
    createdAt: item.createdAt,
  }));

  const snapshot = await SourceSnapshot.create({
    sourceType,
    sourceId,
    sourceTitle,
    sourceText: (sourceRecord.body || '').slice(0, 1200),
    sourceAuthorId,
    sourceAuthorName,
    snapshotBoundaryTime: snapshotBoundary,
    selectionCriteria: {
      includeReplies,
      focus: selectionCriteria.focus || 'all_themes',
      dateRange: selectionCriteria.dateRange || null,
    },
    totalEligibleSources,
    uniqueContributors: uniqueContributorCount,
    selectedCount: manifestItems.length,
    sourceManifest: manifestItems,
    status: 'active',
  });

  return {
    snapshot,
    rawItems,
    sourceRecord,
  };
}
