import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: String,
    authorInitials: String,
    authorColor: String,
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    tags: [{
      type: String,
    }],
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'circle'],
      default: 'public',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'trending', 'under_review', 'accepted', 'locked', 'archived', 'removed', 'closed'],
      default: 'open',
      index: true,
    },
    votes: {
      type: Number,
      default: 0,
      index: true,
    },
    voters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    commentsCount: {
      type: Number,
      default: 0,
    },
    contributorsCount: {
      type: Number,
      default: 1,
    },
    pinnedContributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionContribution',
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    originPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    originMetadata: {
      postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
      authorName: String,
      createdAt: Date,
    },
  },
  { timestamps: true }
);

export const Discussion = mongoose.model('Discussion', discussionSchema);
