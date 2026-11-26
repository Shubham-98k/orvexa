import mongoose from 'mongoose';

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    icon: {
      type: String,
      default: '✧',
    },
    coverTheme: {
      type: String,
      default: 'c1',
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    avatar: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    rules: [{
      type: String,
      trim: true,
    }],
    welcomeMessage: {
      type: String,
      default: '',
    },
    communityGuidelines: {
      type: String,
      default: '',
    },
    joinPolicy: {
      type: String,
      enum: ['open', 'approval_required', 'invite_only'],
      default: 'open',
      index: true,
    },
    settings: {
      allowVisitorPosts: { type: Boolean, default: false },
      allowVisitorDiscussions: { type: Boolean, default: false },
      allowMemberInvites: { type: Boolean, default: false },
      allowModeratorRemoval: { type: Boolean, default: false },
      allowModeratorAnnouncements: { type: Boolean, default: false },
      maxFeaturedContent: { type: Number, default: 5 },
    },
    groupConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    membersCount: {
      type: Number,
      default: 1,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    moderators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    visibility: {
      type: String,
      enum: ['public', 'private', 'hidden'],
      default: 'public',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'restricted', 'archived', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

circleSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' });

export const Circle = mongoose.model('Circle', circleSchema);
