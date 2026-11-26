import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'circle_group'],
      default: 'direct',
      index: true,
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    settings: {
      notificationsEnabled: { type: Boolean, default: true },
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    mutedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  { timestamps: true }
);

conversationSchema.index(
  { circleId: 1 },
  { unique: true, partialFilterExpression: { type: 'circle_group', circleId: { $type: 'objectId' } } }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: String,
    body: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    attachments: [{
      url: { type: String, trim: true },
      name: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number, min: 0 },
    }],
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderationStatus: {
      type: String,
      enum: ['active', 'removed', 'hidden'],
      default: 'active',
      index: true,
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
