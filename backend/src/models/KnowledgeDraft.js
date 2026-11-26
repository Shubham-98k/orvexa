import mongoose from 'mongoose';

const draftBlockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['paragraph', 'heading1', 'heading2', 'heading3', 'quote', 'bulletList', 'numberedList', 'code', 'sourceCitation', 'callout', 'image'],
      default: 'paragraph',
    },
    content: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const draftOutlineSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    heading: { type: String, required: true },
    notes: { type: String, default: '' },
    mappedSourceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const knowledgeDraftSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'circle'],
      default: 'public',
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    format: {
      type: String,
      enum: ['guide', 'explainer', 'research', 'perspective', 'notes', 'synthesis', 'freeform', 'other'],
      default: 'guide',
    },
    category: {
      type: String,
      default: 'Thinking',
    },
    topics: [{
      type: String,
    }],
    tags: [{
      type: String,
    }],
    coverImage: {
      type: String,
      default: '',
    },
    body: [draftBlockSchema],
    outline: [draftOutlineSchema],
    origin: {
      type: {
        type: String,
        enum: ['independent', 'post', 'discussion'],
        default: 'independent',
      },
      postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        default: null,
      },
      discussionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discussion',
        default: null,
      },
      circleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Circle',
        default: null,
      },
    },
    sourceSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceSnapshot',
      default: null,
    },
    sourceAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceAnalysis',
      default: null,
    },
    useSourceContext: {
      type: Boolean,
      default: true,
    },
    sourceReferences: [{
      sourceType: {
        type: String,
        enum: ['post', 'postReply', 'discussion', 'discussionContribution'],
      },
      sourceId: mongoose.Schema.Types.ObjectId,
      label: String,
      authorName: String,
      quoteText: String,
      note: String,
    }],
    aiAssisted: {
      type: Boolean,
      default: false,
    },
    aiDisclosure: {
      type: String,
      default: '',
    },
    versionNumber: {
      type: Number,
      default: 1,
    },
    publishedArticleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeArticle',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'published', 'discarded'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

knowledgeDraftSchema.index({ authorId: 1, status: 1, updatedAt: -1 });

export const KnowledgeDraft = mongoose.model('KnowledgeDraft', knowledgeDraftSchema);
