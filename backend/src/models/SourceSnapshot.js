import mongoose from 'mongoose';

const manifestItemSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ['post', 'postReply', 'discussion', 'discussionContribution'],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    parentSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: String,
    authorInitials: String,
    authorColor: String,
    contentPreview: String,
    voteCount: {
      type: Number,
      default: 0,
    },
    selectionReason: {
      type: String,
      enum: ['original_post', 'representative', 'high_engagement', 'contrasting', 'novel', 'chronological_sample', 'manual'],
      default: 'representative',
    },
    createdAt: Date,
  },
  { _id: false }
);

const sourceSnapshotSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ['discussion', 'post'],
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sourceTitle: String,
    sourceAuthorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sourceAuthorName: String,
    snapshotBoundaryTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    selectionCriteria: {
      includeReplies: { type: Boolean, default: true },
      focus: { type: String, default: 'all_themes' },
      dateRange: { start: Date, end: Date },
    },
    totalEligibleSources: {
      type: Number,
      default: 0,
    },
    uniqueContributors: {
      type: Number,
      default: 0,
    },
    selectedCount: {
      type: Number,
      default: 0,
    },
    sourceManifest: [manifestItemSchema],
    status: {
      type: String,
      enum: ['active', 'stale', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

sourceSnapshotSchema.index({ sourceType: 1, sourceId: 1, createdAt: -1 });

export const SourceSnapshot = mongoose.model('SourceSnapshot', sourceSnapshotSchema);
