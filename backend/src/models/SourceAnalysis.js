import mongoose from 'mongoose';

const themeClusterSchema = new mongoose.Schema(
  {
    themeId: { type: String, required: true },
    label: { type: String, required: true },
    keywords: [{ type: String }],
    contributionCount: { type: Number, default: 0 },
    contributorCount: { type: Number, default: 0 },
    representativeSourceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    contrastingSourceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    summary: { type: String, default: '' },
  },
  { _id: false }
);

const outlineSectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    heading: { type: String, required: true },
    notes: { type: String, default: '' },
    suggestedFocus: { type: String, default: '' },
    mappedSourceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const sourceAnalysisSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceSnapshot',
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['discussion', 'post'],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    algorithmVersion: {
      type: String,
      default: 'v1.0-tfidf-zero-cost',
    },
    stats: {
      totalAnalyzed: { type: Number, default: 0 },
      uniqueContributors: { type: Number, default: 0 },
      averageEngagement: { type: Number, default: 0 },
      topKeywords: [{ keyword: String, score: Number }],
    },
    themes: [themeClusterSchema],
    suggestedOutline: [outlineSectionSchema],
    status: {
      type: String,
      enum: ['ready', 'processing', 'failed'],
      default: 'ready',
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

sourceAnalysisSchema.index({ sourceId: 1, snapshotId: 1 });

export const SourceAnalysis = mongoose.model('SourceAnalysis', sourceAnalysisSchema);
