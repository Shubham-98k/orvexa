import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { KnowledgeDraft } from '../models/KnowledgeDraft.js';
import { KnowledgeVersion } from '../models/KnowledgeVersion.js';
import { SourceSnapshot } from '../models/SourceSnapshot.js';
import { SourceAnalysis } from '../models/SourceAnalysis.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { Save, Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { createSourceSnapshot } from '../services/sourceIngestionService.js';
import { runZeroCostAnalysis } from '../services/analysisPipelineService.js';

// ==========================================
// 1. PUBLISHED KNOWLEDGE BROWSING & DETAIL
// ==========================================

export const getKnowledgeArticles = async (req, res, next) => {
  try {
    const { category, format, topic, search, sort = 'newest', mode, page = 1, limit = 12 } = req.query;
    const query = { status: 'published' };

    if (category && category !== 'All' && category !== 'All topics') {
      query.category = category;
    }
    if (format && format !== 'All') {
      query.format = format.toLowerCase();
    }
    if (topic) {
      query.topics = topic;
    }
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // Following mode: requires authenticated user
    if (mode === 'following') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Please log in to view knowledge from people you follow.',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }
      const currentUser = await User.findById(req.user._id);
      const followingIds = currentUser?.following || [];
      if (followingIds.length === 0) {
        return res.json({ articles: [], total: 0, page: 1, totalPages: 0 });
      }
      query.authorId = { $in: followingIds };
    }

    // Sort order
    let sortObj = { publishedAt: -1, createdAt: -1 };
    if (sort === 'Most saved' || sort === 'saved') {
      sortObj = { savesCount: -1, publishedAt: -1 };
    } else if (sort === 'Most helpful' || sort === 'helpful') {
      sortObj = { helpfulCount: -1, publishedAt: -1 };
    } else if (sort === 'relevance' && search) {
      sortObj = { score: { $meta: 'textScore' } };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [articles, total] = await Promise.all([
      KnowledgeArticle.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      KnowledgeArticle.countDocuments(query),
    ]);

    // Check saved state for authenticated user
    let savedArticleIds = new Set();
    if (req.user) {
      const saves = await Save.find({
        userId: req.user._id,
        itemType: 'knowledge',
        itemId: { $in: articles.map((a) => a._id) },
      }).select('itemId').lean();
      savedArticleIds = new Set(saves.map((s) => s.itemId.toString()));
    }

    const mappedArticles = articles.map((article) => ({
      ...article,
      isSaved: savedArticleIds.has(article._id.toString()),
      hasVotedHelpful: req.user && Array.isArray(article.helpfulVoters)
        ? article.helpfulVoters.some((v) => v.toString() === req.user._id.toString())
        : false,
    }));

    res.json({
      articles: mappedArticles,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

export const getKnowledgeById = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const article = await KnowledgeArticle.findById(articleId).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Enforce publication visibility
    const isAuthor = req.user && article.authorId && req.user._id.toString() === article.authorId.toString();
    const isAdmin = req.user && (req.user.platformRole === 'admin' || req.user.role === 'admin');
    if (article.status !== 'published' && !isAuthor && !isAdmin) {
      return res.status(404).json({ error: 'Article is not published' });
    }

    // Populate saved & helpful status
    let isSaved = false;
    let hasVotedHelpful = false;
    let isFollowingAuthor = false;

    if (req.user) {
      const [savedDoc, currentUser] = await Promise.all([
        Save.exists({ userId: req.user._id, itemType: 'knowledge', itemId: article._id }),
        User.findById(req.user._id).select('following').lean(),
      ]);
      isSaved = Boolean(savedDoc);
      hasVotedHelpful = Array.isArray(article.helpfulVoters)
        ? article.helpfulVoters.some((v) => v.toString() === req.user._id.toString())
        : false;
      isFollowingAuthor = currentUser?.following?.some((f) => f.toString() === article.authorId?.toString()) || false;
    }

    // Fetch related articles (same category or shared topics)
    const relatedArticles = await KnowledgeArticle.find({
      _id: { $ne: article._id },
      status: 'published',
      $or: [
        { category: article.category },
        { topics: { $in: article.topics || [] } },
      ],
    })
      .select('_id title summary category format readingTimeMinutes readTime authorName authorInitials authorColor publishedAt')
      .limit(3)
      .lean();

    // Fetch more from author
    const moreFromAuthor = await KnowledgeArticle.find({
      _id: { $ne: article._id },
      authorId: article.authorId,
      status: 'published',
    })
      .select('_id title summary readingTimeMinutes readTime publishedAt')
      .limit(3)
      .lean();

    // Origin metadata if derived from Discussion or Post
    let originDetails = null;
    if (article.origin?.type === 'discussion' && article.origin.discussionId) {
      const disc = await Discussion.findById(article.origin.discussionId)
        .select('_id title authorName commentsCount contributorsCount')
        .lean();
      if (disc) {
        originDetails = {
          type: 'discussion',
          id: disc._id,
          title: disc.title,
          authorName: disc.authorName,
          contributionCount: disc.commentsCount,
          contributorCount: disc.contributorsCount,
        };
      }
    } else if (article.origin?.type === 'post' && article.origin.postId) {
      const post = await Post.findById(article.origin.postId)
        .select('_id title body authorName commentCount likeCount')
        .lean();
      if (post) {
        originDetails = {
          type: 'post',
          id: post._id,
          title: post.title || post.body.slice(0, 70),
          authorName: post.authorName,
          commentCount: post.commentCount,
        };
      }
    }

    res.json({
      article: {
        ...article,
        isSaved,
        hasVotedHelpful,
        isFollowingAuthor,
        originDetails,
      },
      relatedArticles,
      moreFromAuthor,
    });
  } catch (err) {
    next(err);
  }
};

export const voteHelpful = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const userId = req.user._id;

    const article = await KnowledgeArticle.findById(articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (!Array.isArray(article.helpfulVoters)) {
      article.helpfulVoters = [];
    }

    const idx = article.helpfulVoters.findIndex((v) => v.toString() === userId.toString());
    let helpful = false;
    if (idx === -1) {
      article.helpfulVoters.push(userId);
      article.helpfulCount = (article.helpfulCount || 0) + 1;
      helpful = true;
    } else {
      article.helpfulVoters.splice(idx, 1);
      article.helpfulCount = Math.max(0, (article.helpfulCount || 0) - 1);
      helpful = false;
    }

    await article.save();
    res.json({ helpful, helpfulCount: article.helpfulCount });
  } catch (err) {
    next(err);
  }
};

export const saveKnowledge = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const existing = await Save.findOne({ userId: req.user._id, itemType: 'knowledge', itemId: articleId });
    if (existing) {
      await Save.deleteOne({ _id: existing._id });
      article.savesCount = Math.max(0, (article.savesCount || 0) - 1);
      await article.save();
      return res.json({ saved: false, message: 'Removed from Reading List' });
    }

    await Save.create({
      userId: req.user._id,
      itemType: 'knowledge',
      itemId: articleId,
      title: article.title,
      description: article.summary,
      author: article.authorName,
      category: article.category,
      metadata: { readTime: article.readTime, format: article.format },
    });
    article.savesCount = (article.savesCount || 0) + 1;
    await article.save();

    res.json({ saved: true, message: 'Saved to your Reading List' });
  } catch (err) {
    next(err);
  }
};

export const deleteKnowledgeArticle = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const { reason } = req.body || {};
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const isOwner = req.user && String(article.authorId) === String(req.user._id);
    const isModOrAdmin = req.user && (
      req.user.platformRole === 'admin' ||
      req.user.platformRole === 'moderator' ||
      req.user.role === 'admin' ||
      req.user.role === 'moderator'
    );

    if (!isOwner && !isModOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this knowledge article' });
    }

    article.status = 'archived';
    await article.save();

    if (isModOrAdmin && !isOwner && article.authorId) {
      try {
        await Notification.create({
          recipientId: article.authorId,
          actorId: req.user._id,
          actorName: req.user.displayName || req.user.username || 'Moderation Team',
          actorInitials: req.user.initials || 'MOD',
          type: 'content_deleted',
          title: 'Article removed by moderation',
          message: reason || 'Your article was removed by moderation for violating community standards.',
          reason: reason || 'Violating community guidelines',
          targetType: 'knowledge',
          targetId: article._id,
          timeText: 'Just now',
        });
      } catch (notifErr) {
        console.error('Failed to create moderation notification:', notifErr);
      }
    }

    res.json({ success: true, message: 'Knowledge article removed successfully' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. KNOWLEDGE DRAFTS (CREATION & STUDIO)
// ==========================================

export const createIndependentDraft = async (req, res, next) => {
  try {
    const { title, format = 'guide', category = 'Thinking', topics = [] } = req.body || {};

    const initialBlocks = [
      {
        id: 'block-1',
        type: 'heading1',
        content: title || 'Introduction',
        data: {},
      },
      {
        id: 'block-2',
        type: 'paragraph',
        content: 'Start writing your guide or resource here. Add structured sections, citations, or quotes.',
        data: {},
      },
    ];

    const draft = await KnowledgeDraft.create({
      authorId: req.user._id,
      title: title || 'Untitled Knowledge Draft',
      format,
      category,
      topics,
      body: initialBlocks,
      origin: { type: 'independent' },
      status: 'active',
      versionNumber: 1,
    });

    res.status(201).json({ draft });
  } catch (err) {
    next(err);
  }
};

export const createDraftFromDiscussion = async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { focus = 'all_themes', selectionCriteria = {} } = req.body || {};

    // 1. Create reproducible source snapshot using cursor batching
    const { snapshot, rawItems, sourceRecord } = await createSourceSnapshot({
      sourceType: 'discussion',
      sourceId: discussionId,
      selectionCriteria: { focus, ...selectionCriteria },
    });

    // 2. Run Zero-Cost Analysis pipeline (TF-IDF themes & algorithmic outline)
    const analysis = await runZeroCostAnalysis({
      snapshot,
      rawItems,
      sourceTitle: sourceRecord.title,
    });

    // 3. Transform outline sections into initial draft blocks
    const initialBlocks = [
      {
        id: 'block-intro',
        type: 'heading1',
        content: sourceRecord.title,
        data: {},
      },
      {
        id: 'block-summary',
        type: 'paragraph',
        content: `A structured synthesis based on community discussion "${sourceRecord.title}", incorporating insights from ${snapshot.uniqueContributors} contributors.`,
        data: {},
      },
      ...analysis.themes.map((theme, idx) => ({
        id: `block-theme-${idx + 1}`,
        type: 'heading2',
        content: theme.label,
        data: {},
      })),
    ];

    // 4. Create draft linked to snapshot & analysis
    const draft = await KnowledgeDraft.create({
      authorId: req.user._id,
      title: `${sourceRecord.title}: Synthesized Guide`,
      subtitle: `Community insights and practices from ${snapshot.uniqueContributors} contributors`,
      summary: `Synthesized from discussion with ${snapshot.totalEligibleSources} contributions.`,
      format: 'guide',
      category: sourceRecord.category || 'Thinking',
      topics: sourceRecord.tags || [],
      body: initialBlocks,
      outline: analysis.suggestedOutline,
      origin: {
        type: 'discussion',
        discussionId: sourceRecord._id,
      },
      sourceSnapshotId: snapshot._id,
      sourceAnalysisId: analysis._id,
      status: 'active',
      versionNumber: 1,
    });

    res.status(201).json({ draft, snapshot, analysis });
  } catch (err) {
    next(err);
  }
};

export const createDraftFromPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { includeReplies = true, focus = 'all_themes' } = req.body || {};

    // 1. Create source snapshot for post (handles 0 replies cleanly)
    const { snapshot, rawItems, sourceRecord } = await createSourceSnapshot({
      sourceType: 'post',
      sourceId: postId,
      selectionCriteria: { includeReplies, focus },
    });

    // 2. Run Zero-Cost Analysis
    const analysis = await runZeroCostAnalysis({
      snapshot,
      rawItems,
      sourceTitle: sourceRecord.title || sourceRecord.body.slice(0, 60),
    });

    // 3. Seed initial blocks from Post content
    const title = sourceRecord.title || `${sourceRecord.body.slice(0, 50)}...`;
    const initialBlocks = [
      {
        id: 'block-heading',
        type: 'heading1',
        content: title,
        data: {},
      },
      {
        id: 'block-post-body',
        type: 'quote',
        content: sourceRecord.body,
        data: { sourceLabel: `Original Post by ${sourceRecord.authorName}` },
      },
      {
        id: 'block-analysis-section',
        type: 'heading2',
        content: 'Core Observations & Context',
        data: {},
      },
      {
        id: 'block-body-1',
        type: 'paragraph',
        content: 'Expanding on the core premise with practical implementation steps.',
        data: {},
      },
    ];

    // 4. Create draft
    const draft = await KnowledgeDraft.create({
      authorId: req.user._id,
      title,
      summary: sourceRecord.body.slice(0, 160),
      format: 'guide',
      category: sourceRecord.circleName ? 'Community' : 'Thinking',
      topics: sourceRecord.tags || [],
      body: initialBlocks,
      outline: analysis.suggestedOutline,
      origin: {
        type: 'post',
        postId: sourceRecord._id,
      },
      sourceSnapshotId: snapshot._id,
      sourceAnalysisId: analysis._id,
      status: 'active',
      versionNumber: 1,
    });

    res.status(201).json({ draft, snapshot, analysis });
  } catch (err) {
    next(err);
  }
};

export const getUserDrafts = async (req, res, next) => {
  try {
    const drafts = await KnowledgeDraft.find({
      authorId: req.user._id,
      status: 'active',
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ drafts });
  } catch (err) {
    next(err);
  }
};

export const getDraftById = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const draft = await KnowledgeDraft.findById(draftId).lean();
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    // Enforce author ownership
    if (draft.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized draft access' });
    }

    // Optional snapshot & analysis
    let snapshot = null;
    let analysis = null;
    if (draft.sourceSnapshotId) {
      snapshot = await SourceSnapshot.findById(draft.sourceSnapshotId).lean();
    }
    if (draft.sourceAnalysisId) {
      analysis = await SourceAnalysis.findById(draft.sourceAnalysisId).lean();
    }

    res.json({ draft, snapshot, analysis });
  } catch (err) {
    next(err);
  }
};

export const updateDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const draft = await KnowledgeDraft.findById(draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    if (draft.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized draft modification' });
    }

    const {
      title,
      subtitle,
      summary,
      body,
      outline,
      format,
      category,
      topics,
      tags,
      coverImage,
      sourceReferences,
      aiAssisted,
      aiDisclosure,
    } = req.body;

    if (title !== undefined) draft.title = title.trim();
    if (subtitle !== undefined) draft.subtitle = subtitle.trim();
    if (summary !== undefined) draft.summary = summary.trim();
    if (body !== undefined && Array.isArray(body)) draft.body = body;
    if (outline !== undefined && Array.isArray(outline)) draft.outline = outline;
    if (format !== undefined) draft.format = format;
    if (category !== undefined) draft.category = category;
    if (topics !== undefined) draft.topics = topics;
    if (tags !== undefined) draft.tags = tags;
    if (coverImage !== undefined) draft.coverImage = coverImage;
    if (sourceReferences !== undefined) draft.sourceReferences = sourceReferences;
    if (aiAssisted !== undefined) draft.aiAssisted = aiAssisted;
    if (aiDisclosure !== undefined) draft.aiDisclosure = aiDisclosure;

    draft.versionNumber = (draft.versionNumber || 1) + 1;
    await draft.save();

    res.json({ draft, savedAt: draft.updatedAt });
  } catch (err) {
    next(err);
  }
};

export const discardDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const draft = await KnowledgeDraft.findById(draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    if (draft.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized draft deletion' });
    }

    draft.status = 'discarded';
    await draft.save();

    res.json({ success: true, message: 'Draft moved to discarded' });
  } catch (err) {
    next(err);
  }
};

export const publishDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const draft = await KnowledgeDraft.findById(draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    if (draft.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized publish attempt' });
    }

    if (!draft.title || !draft.title.trim() || draft.title === 'Untitled Draft') {
      return res.status(400).json({ error: 'Please provide a clear title before publishing.' });
    }

    const blocks = draft.body || [];
    if (blocks.length === 0) {
      return res.status(400).json({ error: 'An article cannot be published with empty content.' });
    }

    // Generate summary fallback if not provided
    const textContent = blocks.map((b) => b.content).filter(Boolean).join('\n\n');
    const summary = draft.summary?.trim() || textContent.slice(0, 160) + '...';

    // Create or update published article
    let article;
    if (draft.publishedArticleId) {
      article = await KnowledgeArticle.findById(draft.publishedArticleId);
    }

    if (!article) {
      article = new KnowledgeArticle({
        authorId: req.user._id,
        authorName: req.user.displayName,
        authorInitials: req.user.initials,
        authorColor: req.user.avatarColor,
        status: 'published',
        publishedAt: new Date(),
      });
    }

    article.title = draft.title;
    article.subtitle = draft.subtitle || '';
    article.summary = summary;
    article.body = blocks;
    article.content = textContent;
    article.format = draft.format || 'guide';
    article.category = draft.category || 'Thinking';
    article.topics = draft.topics || [];
    article.tags = draft.tags || [];
    article.coverImage = draft.coverImage || '';
    article.origin = draft.origin || { type: 'independent' };
    article.sourceSnapshotId = draft.sourceSnapshotId || null;
    article.sourceReferences = draft.sourceReferences || [];
    article.aiAssisted = draft.aiAssisted || false;
    article.aiDisclosure = draft.aiDisclosure || '';
    article.version = (article.version || 0) + 1;

    // Link back to discussion/post if applicable
    if (draft.origin?.type === 'discussion' && draft.origin.discussionId) {
      article.sourceDiscussionId = draft.origin.discussionId;
      article.source = 'Developed from an Idea';
    } else if (draft.origin?.type === 'post' && draft.origin.postId) {
      article.sourcePostId = draft.origin.postId;
      article.source = 'Developed from a Post';
    } else {
      article.source = 'Independent article';
    }

    await article.save();

    // Mark draft as published
    draft.status = 'published';
    draft.publishedArticleId = article._id;
    await draft.save();

    // Create immutable version checkpoint
    await KnowledgeVersion.create({
      draftId: draft._id,
      articleId: article._id,
      versionNumber: article.version,
      title: article.title,
      subtitle: article.subtitle,
      summary: article.summary,
      body: article.body,
      outline: draft.outline,
      sourceReferences: article.sourceReferences,
      changeSummary: 'Published version checkpoint',
      authorId: req.user._id,
      isPublishedSnapshot: true,
    });

    res.status(200).json({
      success: true,
      message: 'Article published successfully',
      article,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. SOURCE METADATA & CITATIONS LOOKUP
// ==========================================

export const getArticleSources = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const article = await KnowledgeArticle.findById(articleId).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const references = article.sourceReferences || [];
    const sourceIds = references.map((r) => r.sourceId).filter(Boolean);

    // Fetch permitted active records
    const [contributions, replies] = await Promise.all([
      DiscussionContribution.find({ _id: { $in: sourceIds }, status: 'active' })
        .select('_id authorName authorInitials authorColor body createdAt votes')
        .lean(),
      PostReply.find({ _id: { $in: sourceIds } })
        .select('_id authorName authorInitials authorColor body createdAt')
        .lean(),
    ]);

    const activeMap = new Map();
    contributions.forEach((c) => activeMap.set(c._id.toString(), { ...c, type: 'contribution' }));
    replies.forEach((r) => activeMap.set(r._id.toString(), { ...r, type: 'reply' }));

    // Map references, handling unavailable/removed gracefully
    const resolvedSources = references.map((ref) => {
      const live = activeMap.get(ref.sourceId?.toString());
      if (!live) {
        return {
          ...ref,
          isAvailable: false,
          unavailableNotice: 'Source contribution is unavailable or removed.',
        };
      }
      return {
        ...ref,
        isAvailable: true,
        authorName: live.authorName,
        authorInitials: live.authorInitials,
        authorColor: live.authorColor,
        previewText: live.body?.slice(0, 200) || '',
        createdAt: live.createdAt,
      };
    });

    // If references were empty or origin root is present, include the root origin as a source
    if (resolvedSources.length === 0 && article.origin) {
      if (article.origin.type === 'post' && article.origin.postId) {
        const originPost = await Post.findById(article.origin.postId)
          .select('_id authorName authorInitials authorColor body createdAt title')
          .lean();
        if (originPost) {
          resolvedSources.push({
            sourceId: originPost._id,
            sourceType: 'post',
            isAvailable: true,
            authorName: originPost.authorName,
            authorInitials: originPost.authorInitials,
            authorColor: originPost.authorColor,
            previewText: originPost.body?.slice(0, 200) || originPost.title || 'Original post content',
            quoteText: originPost.body?.slice(0, 140) || originPost.title,
            createdAt: originPost.createdAt,
            role: 'Catalyst / Original Post Author',
          });
        }
      } else if (article.origin.type === 'discussion' && article.origin.discussionId) {
        const originDisc = await Discussion.findById(article.origin.discussionId)
          .select('_id authorName authorInitials authorColor body createdAt title')
          .lean();
        if (originDisc) {
          resolvedSources.push({
            sourceId: originDisc._id,
            sourceType: 'discussion',
            isAvailable: true,
            authorName: originDisc.authorName,
            authorInitials: originDisc.authorInitials,
            authorColor: originDisc.authorColor,
            previewText: originDisc.body?.slice(0, 200) || originDisc.title || 'Discussion prompt',
            quoteText: originDisc.body?.slice(0, 140) || originDisc.title,
            createdAt: originDisc.createdAt,
            role: 'Discussion Catalyst',
          });
        }
      }
    }

    res.json({ sources: resolvedSources });
  } catch (err) {
    next(err);
  }
};

// Backwards-compatible legacy create
export const createKnowledge = async (req, res, next) => {
  try {
    const { title, subtitle, summary, content, category, readTime, source, sourceDiscussionId, references, body, coverImage } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const article = await KnowledgeArticle.create({
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      title: title.trim(),
      subtitle: subtitle || '',
      summary: (summary || content || '').slice(0, 160).trim(),
      content: content ? content.trim() : '',
      body: Array.isArray(body) && body.length > 0 ? body : undefined,
      coverImage: coverImage || '',
      category: category || 'Thinking',
      readTime: readTime || '5 min read',
      source: source || 'Independent article',
      sourceDiscussionId: sourceDiscussionId || null,
      references: references || [],
      status: 'published',
    });

    res.status(201).json({ article });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. VERSIONING & INCREMENTAL SOURCE UPDATES
// ==========================================

export const getArticleVersions = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const versions = await KnowledgeVersion.find({ articleId })
      .sort({ versionNumber: -1 })
      .select('versionNumber title changeSummary isPublishedSnapshot createdAt authorId')
      .lean();

    res.json({ versions });
  } catch (err) {
    next(err);
  }
};

export const restoreArticleVersion = async (req, res, next) => {
  try {
    const { articleId, versionId } = req.params;

    const [article, version] = await Promise.all([
      KnowledgeArticle.findById(articleId),
      KnowledgeVersion.findById(versionId),
    ]);

    if (!article) return res.status(404).json({ error: 'Article not found' });
    if (!version) return res.status(404).json({ error: 'Version record not found' });

    // Authorization
    const isAuthor = article.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.platformRole === 'admin' || req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to restore version' });
    }

    // Apply version snapshot
    article.title = version.title;
    article.subtitle = version.subtitle || '';
    article.summary = version.summary;
    article.body = version.body || [];
    article.sourceReferences = version.sourceReferences || [];
    article.version = (article.version || 1) + 1;
    await article.save();

    // Create a new checkpoint recording the restoration
    await KnowledgeVersion.create({
      articleId: article._id,
      versionNumber: article.version,
      title: article.title,
      subtitle: article.subtitle,
      summary: article.summary,
      body: article.body,
      sourceReferences: article.sourceReferences,
      changeSummary: `Restored to version ${version.versionNumber}`,
      authorId: req.user._id,
      isPublishedSnapshot: true,
    });

    res.json({
      success: true,
      message: `Successfully restored article to version ${version.versionNumber}`,
      article,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDraftSources = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const draft = await KnowledgeDraft.findById(draftId);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    if (draft.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized draft modification' });
    }

    if (!draft.sourceSnapshotId) {
      return res.status(400).json({ error: 'This draft does not have an attached source snapshot.' });
    }

    const snapshot = await SourceSnapshot.findById(draft.sourceSnapshotId);
    if (!snapshot) return res.status(404).json({ error: 'Source snapshot not found' });

    const lastBoundary = snapshot.snapshotBoundaryTime || snapshot.createdAt;
    const now = new Date();

    let newItemsCount = 0;
    const newItems = [];

    if (snapshot.sourceType === 'discussion') {
      const cursor = DiscussionContribution.find({
        discussionId: snapshot.sourceId,
        status: 'active',
        createdAt: { $gt: lastBoundary, $lte: now },
      })
        .select('authorId authorName authorInitials authorColor body votes createdAt parentContributionId')
        .lean()
        .cursor();

      for await (const c of cursor) {
        newItems.push({
          sourceType: 'discussionContribution',
          sourceId: c._id,
          parentSourceId: c.parentContributionId || null,
          authorId: c.authorId,
          authorName: c.authorName,
          authorInitials: c.authorInitials,
          authorColor: c.authorColor,
          contentPreview: c.body?.slice(0, 200) || '',
          fullBody: c.body || '',
          voteCount: c.votes || 0,
          createdAt: c.createdAt,
        });
      }
    } else if (snapshot.sourceType === 'post') {
      const cursor = PostReply.find({
        postId: snapshot.sourceId,
        createdAt: { $gt: lastBoundary, $lte: now },
      })
        .select('authorId authorName authorInitials authorColor body createdAt parentReplyId')
        .lean()
        .cursor();

      for await (const r of cursor) {
        newItems.push({
          sourceType: 'postReply',
          sourceId: r._id,
          parentSourceId: r.parentReplyId || null,
          authorId: r.authorId,
          authorName: r.authorName,
          authorInitials: r.authorInitials,
          authorColor: r.authorColor,
          contentPreview: r.body?.slice(0, 200) || '',
          fullBody: r.body || '',
          voteCount: 0,
          createdAt: r.createdAt,
        });
      }
    }

    newItemsCount = newItems.length;

    if (newItemsCount === 0) {
      return res.json({
        hasNewContributions: false,
        newContributionsCount: 0,
        message: 'No new contributions were added since the last snapshot.',
      });
    }

    // Append new items to snapshot manifest
    const newManifestItems = newItems.map((item) => ({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      parentSourceId: item.parentSourceId,
      authorId: item.authorId,
      authorName: item.authorName,
      authorInitials: item.authorInitials,
      authorColor: item.authorColor,
      contentPreview: item.contentPreview,
      voteCount: item.voteCount,
      selectionReason: 'novel',
      createdAt: item.createdAt,
    }));

    snapshot.sourceManifest = [...(snapshot.sourceManifest || []), ...newManifestItems];
    snapshot.totalEligibleSources = (snapshot.totalEligibleSources || 0) + newItemsCount;
    snapshot.snapshotBoundaryTime = now;
    await snapshot.save();

    // Re-run zero-cost analysis to update themes
    const updatedAnalysis = await runZeroCostAnalysis({
      snapshot,
      rawItems: snapshot.sourceManifest,
      sourceTitle: snapshot.sourceTitle,
    });

    draft.sourceAnalysisId = updatedAnalysis._id;
    await draft.save();

    res.json({
      hasNewContributions: true,
      newContributionsCount: newItemsCount,
      message: `Incorporated ${newItemsCount} new community contributions into the analysis.`,
      updatedAnalysis,
      snapshot,
    });
  } catch (err) {
    next(err);
  }
};

export const updateKnowledgeArticle = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const { title, summary, content, coverImage, category } = req.body || {};

    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Knowledge article not found' });
    }

    const isOwner = req.user && String(article.authorId) === String(req.user._id);
    const isModOrAdmin = req.user && (
      req.user.platformRole === 'admin' ||
      req.user.platformRole === 'moderator' ||
      req.user.role === 'admin' ||
      req.user.role === 'moderator'
    );

    if (!isOwner && !isModOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized to edit this article' });
    }

    if (title !== undefined) article.title = String(title).trim();
    if (summary !== undefined) article.summary = String(summary).trim();
    if (content !== undefined) article.content = String(content).trim();
    if (coverImage !== undefined) article.coverImage = coverImage ? String(coverImage).trim() : undefined;
    if (category !== undefined) article.category = category;

    await article.save();
    res.json({ success: true, article });
  } catch (err) {
    next(err);
  }
};
