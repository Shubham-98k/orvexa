import mongoose from 'mongoose';

const circleMembershipSchema = new mongoose.Schema(
  {
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'invited', 'rejected', 'removed', 'banned'],
      default: 'active',
      index: true,
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    removedAt: { type: Date, default: null },
    banReason: { type: String, default: '' },
    banExpiresAt: { type: Date, default: null },
    mutedUntil: { type: Date, default: null },
    muteReason: { type: String, default: '' },
    mutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

circleMembershipSchema.index({ circleId: 1, userId: 1 }, { unique: true });
circleMembershipSchema.index({ userId: 1, status: 1, circleId: 1 });

export const CircleMembership = mongoose.model('CircleMembership', circleMembershipSchema);
