import mongoose from 'mongoose';

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    icon: {
      type: String,
      default: '✧',
    },
    coverTheme: {
      type: String,
      default: 'c1',
    },
    category: {
      type: String,
      default: 'General',
    },
    membersCount: {
      type: Number,
      default: 1,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    moderators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['active', 'restricted', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const Circle = mongoose.model('Circle', circleSchema);
