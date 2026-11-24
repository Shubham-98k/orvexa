import mongoose from 'mongoose';

const knowledgeSchema = new mongoose.Schema(
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
    subtitle: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    readTime: {
      type: String,
      default: '5 min read',
    },
    source: {
      type: String,
      default: 'Independent article',
    },
    sourceDiscussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      default: null,
    },
    contributorsCredited: [{
      type: String,
    }],
    references: [{
      title: String,
      url: String,
      note: String,
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'removed'],
      default: 'published',
      index: true,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulVoters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export const KnowledgeArticle = mongoose.model('KnowledgeArticle', knowledgeSchema);
