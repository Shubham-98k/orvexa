import mongoose from 'mongoose';

const generationJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobType: {
      type: String,
      enum: ['source_analysis', 'outline_generation', 'section_draft', 'update_sources'],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ['discussion', 'post'],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    draftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDraft',
    },
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceSnapshot',
    },
    status: {
      type: String,
      enum: ['queued', 'collecting', 'analyzing', 'generating_outline', 'drafting', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
    },
    currentStageLabel: {
      type: String,
      default: 'Initializing job...',
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
    resultData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

generationJobSchema.index({ status: 1, createdAt: -1 });

export const GenerationJob = mongoose.model('GenerationJob', generationJobSchema);
