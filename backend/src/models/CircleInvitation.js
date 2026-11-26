import mongoose from 'mongoose';

const circleInvitationSchema = new mongoose.Schema(
  {
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: true,
      index: true,
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    inviteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

circleInvitationSchema.index(
  { circleId: 1, inviteeId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const CircleInvitation = mongoose.model('CircleInvitation', circleInvitationSchema);
