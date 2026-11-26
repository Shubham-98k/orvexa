import mongoose from 'mongoose';

const circleAnnouncementSchema = new mongoose.Schema(
  {
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    pinned: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, default: null, index: true },
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const CircleAnnouncement = mongoose.model('CircleAnnouncement', circleAnnouncementSchema);
