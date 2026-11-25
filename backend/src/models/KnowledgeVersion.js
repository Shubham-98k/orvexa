import mongoose from 'mongoose';

const knowledgeVersionSchema = new mongoose.Schema(
  {
    draftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDraft',
      default: null,
      index: true,
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeArticle',
      default: null,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    title: String,
    subtitle: String,
    summary: String,
    body: [mongoose.Schema.Types.Mixed],
    outline: [mongoose.Schema.Types.Mixed],
    sourceReferences: [mongoose.Schema.Types.Mixed],
    changeSummary: {
      type: String,
      default: 'Manual checkpoint',
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublishedSnapshot: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

knowledgeVersionSchema.index({ articleId: 1, versionNumber: -1 });
knowledgeVersionSchema.index({ draftId: 1, versionNumber: -1 });

export const KnowledgeVersion = mongoose.model('KnowledgeVersion', knowledgeVersionSchema);
