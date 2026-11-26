import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
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
    circleName: String,
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    tags: [{
      type: String,
    }],
    visibility: {
      type: String,
      enum: ['public', 'followers', 'circle'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'removed', 'deleted'],
      default: 'published',
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    commentCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    saveCount: {
      type: Number,
      default: 0,
    },
    convertedToDiscussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      default: null,
      index: true,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

postSchema.index({ circleId: 1, visibility: 1, status: 1 });

export const Post = mongoose.model('Post', postSchema);
