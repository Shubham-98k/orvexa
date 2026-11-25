import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { SourceSnapshot } from '../models/SourceSnapshot.js';

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

  let sourceRecord = null;
  let sourceTitle = '';
  let sourceAuthorId = null;
  let sourceAuthorName = '';
  const rawItems = [];

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
      rawItems.push({
        sourceType: 'discussionContribution',
        sourceId: contribution._id,
        parentSourceId: contribution.parentContributionId || null,
        authorId: contribution.authorId,
        authorName: contribution.authorName,
        authorInitials: contribution.authorInitials,
        authorColor: contribution.authorColor,
        contentPreview: contribution.body?.slice(0, 200) || '',
        fullBody: contribution.body || '',
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
    rawItems.push({
      sourceType: 'post',
      sourceId: sourceRecord._id,
      parentSourceId: null,
      authorId: sourceRecord.authorId,
      authorName: sourceRecord.authorName,
      authorInitials: sourceRecord.authorInitials,
      authorColor: sourceRecord.authorColor,
      contentPreview: sourceRecord.body?.slice(0, 200) || '',
      fullBody: sourceRecord.body || '',
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
        rawItems.push({
          sourceType: 'postReply',
          sourceId: reply._id,
          parentSourceId: reply.parentReplyId || null,
          authorId: reply.authorId,
          authorName: reply.authorName,
          authorInitials: reply.authorInitials,
          authorColor: reply.authorColor,
          contentPreview: reply.body?.slice(0, 200) || '',
          fullBody: reply.body || '',
          voteCount: 0,
          createdAt: reply.createdAt,
        });
      }
    }
  } else {
    throw new Error(`Unsupported sourceType: ${sourceType}`);
  }

  // Calculate unique contributors
  const uniqueContributorIds = new Set(
    rawItems.map((item) => (item.authorId ? item.authorId.toString() : item.authorName))
  );

  // Build manifest records (selecting diverse, bounded samples)
  const manifestItems = rawItems.map((item, idx) => ({
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    parentSourceId: item.parentSourceId,
    authorId: item.authorId,
    authorName: item.authorName,
    authorInitials: item.authorInitials,
    authorColor: item.authorColor,
    contentPreview: item.contentPreview,
    voteCount: item.voteCount,
    selectionReason: item.selectionReason || (item.voteCount > 5 ? 'high_engagement' : idx < 20 ? 'representative' : 'chronological_sample'),
    createdAt: item.createdAt,
  }));

  const snapshot = await SourceSnapshot.create({
    sourceType,
    sourceId,
    sourceTitle,
    sourceAuthorId,
    sourceAuthorName,
    snapshotBoundaryTime: snapshotBoundary,
    selectionCriteria: {
      includeReplies,
      focus: selectionCriteria.focus || 'all_themes',
      dateRange: selectionCriteria.dateRange || null,
    },
    totalEligibleSources: rawItems.length,
    uniqueContributors: uniqueContributorIds.size,
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
