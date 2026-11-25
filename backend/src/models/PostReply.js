import mongoose from 'mongoose';

const postReplySchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostReply',
      default: null,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: String,
    authorInitials: String,
    authorColor: String,
    body: {
      type: String,
      required: true,
      trim: true,
    },
    migratedToContributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionContribution',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

export const PostReply = mongoose.model('PostReply', postReplySchema);
