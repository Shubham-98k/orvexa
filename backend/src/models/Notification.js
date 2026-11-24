import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: String,
    actorInitials: String,
    actorColor: String,
    type: {
      type: String,
      required: true,
      enum: ['follow', 'like', 'comment', 'contribution', 'mention', 'knowledge_published', 'circle_join'],
    },
    title: {
      type: String,
      required: true,
    },
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    timeText: {
      type: String,
      default: 'Just now',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);

const saveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ['post', 'discussion', 'knowledge'],
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: String,
    description: String,
    author: String,
    category: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

saveSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
export const Save = mongoose.model('Save', saveSchema);

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'discussion', 'contribution', 'knowledge', 'circle', 'user'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'actioned', 'dismissed'],
      default: 'pending',
    },
    actionTaken: String,
    moderatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: String,
    actorRole: String,
    action: String,
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    reason: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
