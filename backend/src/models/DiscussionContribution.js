import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema(
  {
    discussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: String,
    authorInitials: String,
    authorColor: String,
    parentContributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiscussionContribution',
      default: null,
    },
    body: {
      type: String,
      required: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
    voters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    status: {
      type: String,
      enum: ['active', 'hidden', 'removed'],
      default: 'active',
    },
    depth: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const DiscussionContribution = mongoose.model('DiscussionContribution', contributionSchema);
