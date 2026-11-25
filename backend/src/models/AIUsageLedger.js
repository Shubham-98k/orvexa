import mongoose from 'mongoose';

const aiUsageLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operationType: {
      type: String,
      enum: ['outline', 'section_draft', 'rewrite', 'summarize', 'key_takeaways'],
      required: true,
    },
    draftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDraft',
      default: null,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GenerationJob',
      default: null,
    },
    provider: {
      type: String,
      default: 'disabled',
    },
    model: {
      type: String,
      default: 'none',
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    estimatedCostInr: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

aiUsageLedgerSchema.index({ userId: 1, createdAt: -1 });
aiUsageLedgerSchema.index({ createdAt: -1 });

export const AIUsageLedger = mongoose.model('AIUsageLedger', aiUsageLedgerSchema);
