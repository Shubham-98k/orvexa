import mongoose from 'mongoose';

const circleFeaturedContentSchema = new mongoose.Schema(
  {
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
      index: true,
    },
    contentType: { type: String, enum: ['post', 'discussion', 'knowledge'], required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    featuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

circleFeaturedContentSchema.index({ circleId: 1, contentType: 1, contentId: 1 }, { unique: true });
circleFeaturedContentSchema.index({ circleId: 1, order: 1, createdAt: -1 });

export const CircleFeaturedContent = mongoose.model('CircleFeaturedContent', circleFeaturedContentSchema);
