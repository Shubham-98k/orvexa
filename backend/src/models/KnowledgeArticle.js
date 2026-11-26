import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['paragraph', 'heading1', 'heading2', 'heading3', 'quote', 'bulletList', 'numberedList', 'code', 'sourceCitation', 'callout', 'image'],
      default: 'paragraph',
    },
    content: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

export const parseKnowledgeContentToBlocks = (content) => {
  const blocks = [];
  let paragraphLines = [];
  const flushParagraph = () => {
    const paragraph = paragraphLines.join('\n').trim();
    if (paragraph) {
      blocks.push({
        id: `block-${blocks.length + 1}`,
        type: 'paragraph',
        content: paragraph,
        data: {},
      });
    }
    paragraphLines = [];
  };

  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^\s*(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        id: `block-${blocks.length + 1}`,
        type: `heading${heading[1].length}`,
        content: heading[2],
        data: {},
      });
    } else if (line.trim()) {
      paragraphLines.push(line);
    } else {
      flushParagraph();
    }
  }
  flushParagraph();
  return blocks;
};

const knowledgeSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: String,
    authorInitials: String,
    authorColor: String,
    circleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'circle'],
      default: 'public',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    body: [blockSchema],
    coverImage: {
      type: String,
      default: '',
    },
    format: {
      type: String,
      enum: ['guide', 'explainer', 'research', 'perspective', 'notes', 'synthesis', 'freeform', 'other'],
      default: 'guide',
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    topics: [{
      type: String,
      index: true,
    }],
    tags: [{
      type: String,
      index: true,
    }],
    readTime: {
      type: String,
      default: '5 min read',
    },
    readingTimeMinutes: {
      type: Number,
      default: 5,
    },
    origin: {
      type: {
        type: String,
        enum: ['independent', 'post', 'discussion'],
        default: 'independent',
      },
      postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        default: null,
      },
      discussionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discussion',
        default: null,
      },
      circleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Circle',
        default: null,
      },
    },
    source: {
      type: String,
      default: 'Independent article',
    },
    sourceDiscussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      default: null,
      index: true,
    },
    sourcePostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    sourceSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SourceSnapshot',
      default: null,
    },
    sourceReferences: [{
      sourceType: {
        type: String,
        enum: ['post', 'postReply', 'discussion', 'discussionContribution'],
      },
      sourceId: mongoose.Schema.Types.ObjectId,
      label: String,
      authorName: String,
      quoteText: String,
      note: String,
    }],
    contributorsCredited: [{
      type: String,
    }],
    references: [{
      title: String,
      url: String,
      note: String,
    }],
    aiAssisted: {
      type: Boolean,
      default: false,
    },
    aiDisclosure: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'removed'],
      default: 'published',
      index: true,
    },
    savesCount: {
      type: Number,
      default: 0,
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      index: true,
    },
    helpfulVoters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    version: {
      type: Number,
      default: 1,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for compatibility
knowledgeSchema.virtual('excerpt').get(function () {
  return this.summary || (this.content ? this.content.slice(0, 160) + '...' : '');
});

knowledgeSchema.virtual('saveCount').get(function () {
  return this.savesCount || 0;
});

knowledgeSchema.virtual('helpfulVotes').get(function () {
  return this.helpfulCount || 0;
});

// Pre-save synchronization hook
knowledgeSchema.pre('save', function () {
  // Sync blocks to content string if content is empty
  if ((!this.content || !this.content.trim()) && Array.isArray(this.body) && this.body.length > 0) {
    this.content = this.body.map((b) => b.content).filter(Boolean).join('\n\n');
  }

  // Sync content string to blocks if body is empty
  if ((!this.body || this.body.length === 0) && this.content && this.content.trim()) {
    this.body = parseKnowledgeContentToBlocks(this.content);
  }

  // Compute reading time
  const fullText = (this.content || '') + ' ' + (this.summary || '');
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  this.readingTimeMinutes = minutes;
  this.readTime = `${minutes} min read`;

  // Sync origin and source IDs
  if (this.origin?.discussionId && !this.sourceDiscussionId) {
    this.sourceDiscussionId = this.origin.discussionId;
  }
  if (this.sourceDiscussionId && (!this.origin || !this.origin.discussionId)) {
    this.origin = {
      type: 'discussion',
      discussionId: this.sourceDiscussionId,
      postId: this.origin?.postId || null,
    };
  }
  if (this.origin?.postId && !this.sourcePostId) {
    this.sourcePostId = this.origin.postId;
  }
});

// Compound indexes for searching & filtering
knowledgeSchema.index({ status: 1, publishedAt: -1 });
knowledgeSchema.index({ status: 1, format: 1, publishedAt: -1 });
knowledgeSchema.index({ status: 1, category: 1, publishedAt: -1 });
knowledgeSchema.index({ title: 'text', subtitle: 'text', summary: 'text', content: 'text' });

export const KnowledgeArticle = mongoose.model('KnowledgeArticle', knowledgeSchema);
