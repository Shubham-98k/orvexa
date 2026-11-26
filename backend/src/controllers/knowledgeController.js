import { KnowledgeArticle, parseKnowledgeContentToBlocks } from '../models/KnowledgeArticle.js';
import { KnowledgeDraft } from '../models/KnowledgeDraft.js';
import { KnowledgeVersion } from '../models/KnowledgeVersion.js';
import { SourceSnapshot } from '../models/SourceSnapshot.js';
import { SourceAnalysis } from '../models/SourceAnalysis.js';
import { Discussion } from '../models/Discussion.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';
import { Post } from '../models/Post.js';
import { PostReply } from '../models/PostReply.js';
import { Save } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Circle } from '../models/Circle.js';
import { createSourceSnapshot } from '../services/sourceIngestionService.js';
import { runZeroCostAnalysis } from '../services/analysisPipelineService.js';
import { authorizeCircleContent, getCircleContentFilter, withCircleContentAccess } from '../services/circleAccessService.js';

const findAccessibleKnowledge = async (articleId, userId) =>
  KnowledgeArticle.findOne(await withCircleContentAccess({ _id: articleId }, userId));
const MAX_SOURCE_MANIFEST_ITEMS = 300;
const presentSourceSnapshot = (snapshot) => {
  if (!snapshot) return null;
  const data = typeof snapshot.toObject === 'function' ? snapshot.toObject() : snapshot;
  const safeSnapshot = { ...data };
  delete safeSnapshot.sourceText;
  safeSnapshot.sourceManifest = (data.sourceManifest || []).map((item) => {
    const safeItem = { ...(typeof item.toObject === 'function' ? item.toObject() : item) };
    delete safeItem.sourceText;
    return safeItem;
  });
  return safeSnapshot;
};

// ==========================================
// 1. PUBLISHED KNOWLEDGE BROWSING & DETAIL
// ==========================================

export const getKnowledgeArticles = async (req, res, next) => {
  try {
    const { category, format, topic, search, sort = 'newest', mode, page = 1, limit = 12 } = req.query;
    const query = {
      $and: [
        { status: 'published' },
        await getCircleContentFilter(req.user?._id),
      ],
    };

    if (category && category !== 'All' && category !== 'All topics') {
      query.$and[0].category = category;
    }
    if (format && format !== 'All') {
      query.$and[0].format = format.toLowerCase();
    }
    if (topic) {
      query.$and[0].topics = topic;
    }
    if (search && search.trim()) {
      query.$and[0].$text = { $search: search.trim() };
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
      query.$and[0].authorId = { $in: followingIds };
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
    const article = await KnowledgeArticle.findOne(
      await withCircleContentAccess({ _id: articleId }, req.user?._id)
    ).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    const articleAuthor = article.authorId
      ? await User.findById(article.authorId).select('username').lean()
      : null;

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
    const relatedArticles = await KnowledgeArticle.find(await withCircleContentAccess({
      _id: { $ne: article._id },
      status: 'published',
      $or: [
        { category: article.category },
        { topics: { $in: article.topics || [] } },
      ],
    }, req.user?._id))
      .select('_id title summary category format readingTimeMinutes readTime authorName authorInitials authorColor publishedAt')
      .limit(3)
      .lean();

    // Fetch more from author
    const moreFromAuthor = await KnowledgeArticle.find(await withCircleContentAccess({
      _id: { $ne: article._id },
      authorId: article.authorId,
      status: 'published',
    }, req.user?._id))
      .select('_id title summary readingTimeMinutes readTime publishedAt')
      .limit(3)
      .lean();

    // Origin metadata if derived from Discussion or Post
    let originDetails = null;
    if (article.origin?.type === 'discussion' && article.origin.discussionId) {
      const disc = await Discussion.findOne(await withCircleContentAccess(
        { _id: article.origin.discussionId },
        req.user?._id
      ))
        .select('_id title authorName commentsCount contributorsCount circleId')
        .lean();
      if (disc) {
        originDetails = {
          type: 'discussion',
          id: disc._id,
          title: disc.title,
          authorName: disc.authorName,
          contributionCount: disc.commentsCount,
          contributorCount: disc.contributorsCount,
          circleId: disc.circleId || null,
        };
      }
    } else if (article.origin?.type === 'post' && article.origin.postId) {
      const post = await Post.findOne(await withCircleContentAccess(
        { _id: article.origin.postId },
        req.user?._id
      ))
        .select('_id title body authorName commentCount likeCount circleId')
        .lean();
      if (post) {
        originDetails = {
          type: 'post',
          id: post._id,
          title: post.title || post.body.slice(0, 70),
          authorName: post.authorName,
          commentCount: post.commentCount,
          circleId: post.circleId || null,
        };
      }
    }

    const sourceCircleId = article.origin?.circleId || originDetails?.circleId || article.circleId;
    const circle = sourceCircleId
      ? await Circle.findById(sourceCircleId).select('_id name slug').lean()
      : null;

    res.json({
      article: {
        ...article,
        authorUsername: articleAuthor?.username || null,
        circleDetails: circle
          ? { _id: circle._id, name: circle.name, slug: circle.slug }
          : null,
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

    const article = await findAccessibleKnowledge(articleId, userId);
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
    const article = await findAccessibleKnowledge(articleId, req.user._id);
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
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const isOwner = req.user && String(article.authorId) === String(req.user._id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete this knowledge article' });
    }

    article.status = 'archived';
    await article.save();

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
    const { title, format = 'guide', category = 'Thinking', topics = [], circleId, visibility } = req.body || {};
    const circleAccess = await authorizeCircleContent({
      circleId,
      userId: req.user._id,
      contentType: 'knowledge',
      visibility,
    });
    if (circleAccess.error) return res.status(circleAccess.status).json({ error: circleAccess.error });

    const draft = await KnowledgeDraft.create({
      authorId: req.user._id,
      circleId: circleAccess.circle?._id || null,
      visibility: circleAccess.visibility,
      title: typeof title === 'string' ? title.trim() : '',
      format,
      category,
      topics,
      body: [],
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
    const sourceDiscussion = await Discussion.findOne(
      await withCircleContentAccess({ _id: discussionId }, req.user._id)
    ).lean();
    if (!sourceDiscussion) return res.status(404).json({ error: 'Discussion not found' });

    // 1. Create reproducible source snapshot using cursor batching
    const { snapshot, rawItems, sourceRecord } = await createSourceSnapshot({
      sourceType: 'discussion',
      sourceId: discussionId,
      selectionCriteria: { focus, ...selectionCriteria },
    });

    // Keep measurable source analysis separate from the author's editable outline.
    const analysis = await runZeroCostAnalysis({
      snapshot,
      rawItems,
    });

    // Create a blank editor with its provenance attached; no generated copy is implied.
    const draft = await KnowledgeDraft.create({
      authorId: req.user._id,
      circleId: sourceDiscussion.visibility === 'circle' ? sourceDiscussion.circleId : null,
      visibility: sourceDiscussion.visibility === 'circle' ? 'circle' : 'public',
      title: sourceRecord.title,
      subtitle: '',
      summary: '',
      format: 'synthesis',
      category: sourceRecord.category || 'Thinking',
      topics: sourceRecord.tags || [],
      body: [],
      outline: [],
      origin: {
        type: 'discussion',
        discussionId: sourceRecord._id,
        circleId: sourceDiscussion.circleId || null,
      },
      sourceSnapshotId: snapshot._id,
      sourceAnalysisId: analysis._id,
      status: 'active',
      versionNumber: 1,
    });

    res.status(201).json({ draft, snapshot: presentSourceSnapshot(snapshot), analysis });
  } catch (err) {
    next(err);
  }
};

export const createDraftFromPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { includeReplies = true, focus = 'all_themes' } = req.body || {};
    const sourcePost = await Post.findOne(
      await withCircleContentAccess({ _id: postId }, req.user._id)
    ).lean();
    if (!sourcePost) return res.status(404).json({ error: 'Post not found' });

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
    });

    const title = sourceRecord.title || `${sourceRecord.body.slice(0, 50)}...`;
    const draft = await KnowledgeDraft.create({
      authorId: req.user._id,
      circleId: sourcePost.visibility === 'circle' ? sourcePost.circleId : null,
      visibility: sourcePost.visibility,
      title,
      subtitle: '',
      summary: '',
      format: includeReplies && snapshot.totalEligibleSources > 1 ? 'synthesis' : 'freeform',
      category: sourceRecord.circleName ? 'Community' : 'Thinking',
      topics: sourceRecord.tags || [],
      body: [],
      outline: [],
      origin: {
        type: 'post',
        postId: sourceRecord._id,
        circleId: sourcePost.circleId || null,
      },
      sourceSnapshotId: snapshot._id,
      sourceAnalysisId: analysis._id,
      status: 'active',
      versionNumber: 1,
    });

    res.status(201).json({ draft, snapshot: presentSourceSnapshot(snapshot), analysis });
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

export const createArticleEditingDraft = async (req, res, next) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.articleId);
    if (!article || article.status !== 'published') {
      return res.status(404).json({ error: 'Published Knowledge article not found' });
    }
    if (String(article.authorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the article author can edit it' });
    }

    let draft = await KnowledgeDraft.findOne({
      authorId: req.user._id,
      publishedArticleId: article._id,
      status: { $ne: 'discarded' },
    });

    if (!draft) {
      const latestVersion = await KnowledgeVersion.findOne({ articleId: article._id })
        .sort({ versionNumber: -1 })
        .lean();
      const body = Array.isArray(article.body) && article.body.length
        ? article.body.map((block) => (typeof block.toObject === 'function' ? block.toObject() : block))
        : parseKnowledgeContentToBlocks(article.content || '');
      draft = await KnowledgeDraft.create({
        authorId: article.authorId,
        circleId: article.circleId || null,
        visibility: article.visibility || 'public',
        title: article.title,
        subtitle: article.subtitle || '',
        summary: article.summary || '',
        format: article.format || 'guide',
        category: article.category || 'Thinking',
        topics: article.topics || [],
        tags: article.tags || [],
        coverImage: article.coverImage || '',
        body,
        outline: latestVersion?.outline || [],
        origin: article.origin || { type: 'independent' },
        sourceSnapshotId: article.sourceSnapshotId || null,
        sourceReferences: article.sourceReferences || [],
        aiAssisted: article.aiAssisted || false,
        aiDisclosure: article.aiDisclosure || '',
        versionNumber: article.version || 1,
        publishedArticleId: article._id,
        status: 'active',
      });
    }

    res.json({ draft });
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
      const storedSnapshot = await SourceSnapshot.findById(draft.sourceSnapshotId).lean();
      snapshot = presentSourceSnapshot(storedSnapshot);
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
      useSourceContext,
      aiAssisted,
      aiDisclosure,
    } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string') return res.status(400).json({ error: 'Title must be text' });
      draft.title = title.trim();
    }
    if (subtitle !== undefined) {
      if (typeof subtitle !== 'string') return res.status(400).json({ error: 'Subtitle must be text' });
      draft.subtitle = subtitle.trim();
    }
    if (summary !== undefined) {
      if (typeof summary !== 'string') return res.status(400).json({ error: 'Summary must be text' });
      draft.summary = summary.trim();
    }
    if (body !== undefined && Array.isArray(body)) {
      const imageBlocks = body.filter((block) => block?.type === 'image');
      if (imageBlocks.length > 8) {
        return res.status(400).json({ error: 'Articles can contain at most 8 inline images.' });
      }
      if (imageBlocks.some((block) => typeof block.content !== 'string' || block.content.length > 1_050_000)) {
        return res.status(400).json({ error: 'Each inline image must be uploaded as a compressed JPG, PNG, or WebP under 750 KB.' });
      }
      draft.body = body;
    }
    if (outline !== undefined && Array.isArray(outline)) {
      draft.outline = outline
        .filter((section) => typeof section?.heading === 'string' && section.heading.trim())
        .map((section, index) => ({ ...section, heading: section.heading.trim(), order: index + 1 }));
    }
    if (format !== undefined) draft.format = format;
    if (category !== undefined) draft.category = category;
    if (topics !== undefined) draft.topics = topics;
    if (tags !== undefined) draft.tags = tags;
    if (coverImage !== undefined) draft.coverImage = coverImage;
    if (sourceReferences !== undefined) draft.sourceReferences = sourceReferences;
    if (useSourceContext !== undefined) draft.useSourceContext = Boolean(useSourceContext);
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
    const circleAccess = await authorizeCircleContent({
      circleId: draft.circleId,
      userId: req.user._id,
      contentType: 'knowledge',
      visibility: draft.visibility,
    });
    if (circleAccess.error) return res.status(circleAccess.status).json({ error: circleAccess.error });

    if (
      !draft.title ||
      !draft.title.trim() ||
      ['Untitled Draft', 'Untitled Knowledge Article', 'Untitled Knowledge Draft'].includes(draft.title.trim())
    ) {
      return res.status(400).json({ error: 'Please provide a clear title before publishing.' });
    }

    const blocks = draft.body || [];
    if (blocks.length === 0) {
      return res.status(400).json({ error: 'An article cannot be published with empty content.' });
    }

    // Generate summary fallback if not provided
    const textContent = blocks
      .filter((block) => block.type !== 'image')
      .map((block) => block.content)
      .filter(Boolean)
      .join('\n\n');
    if (!textContent.trim()) {
      return res.status(400).json({ error: 'Add article text before publishing.' });
    }
    const summary = draft.summary?.trim() || textContent.slice(0, 160);

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
    article.circleId = circleAccess.circle?._id || null;
    article.visibility = circleAccess.visibility;
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
    const articleDoc = await findAccessibleKnowledge(articleId, req.user?._id);
    const article = typeof articleDoc?.toObject === 'function' ? articleDoc.toObject() : articleDoc;
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
        const originPost = await Post.findOne(await withCircleContentAccess(
          { _id: article.origin.postId },
          req.user?._id
        ))
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
        const originDisc = await Discussion.findOne(await withCircleContentAccess(
          { _id: article.origin.discussionId },
          req.user?._id
        ))
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
    const { title, subtitle, summary, content, category, readTime, source, sourceDiscussionId, references, body, coverImage, circleId, visibility } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const circleAccess = await authorizeCircleContent({
      circleId,
      userId: req.user._id,
      contentType: 'knowledge',
      visibility,
    });
    if (circleAccess.error) return res.status(circleAccess.status).json({ error: circleAccess.error });

    const article = await KnowledgeArticle.create({
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      circleId: circleAccess.circle?._id || null,
      visibility: circleAccess.visibility,
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
    const article = await findAccessibleKnowledge(articleId, req.user?._id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
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
      findAccessibleKnowledge(articleId, req.user._id),
      KnowledgeVersion.findOne({ _id: versionId, articleId }),
    ]);

    if (!article) return res.status(404).json({ error: 'Article not found' });
    if (!version) return res.status(404).json({ error: 'Version record not found' });

    // Authorization
    const isAuthor = article.authorId.toString() === req.user._id.toString();
    if (!isAuthor) {
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
        newItemsCount += 1;
        if (newItems.length >= MAX_SOURCE_MANIFEST_ITEMS) continue;
        newItems.push({
          sourceType: 'discussionContribution',
          sourceId: c._id,
          parentSourceId: c.parentContributionId || null,
          authorId: c.authorId,
          authorName: c.authorName,
          authorInitials: c.authorInitials,
          authorColor: c.authorColor,
          contentPreview: c.body?.slice(0, 200) || '',
          fullBody: (c.body || '').slice(0, 1200),
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
        newItemsCount += 1;
        if (newItems.length >= MAX_SOURCE_MANIFEST_ITEMS) continue;
        newItems.push({
          sourceType: 'postReply',
          sourceId: r._id,
          parentSourceId: r.parentReplyId || null,
          authorId: r.authorId,
          authorName: r.authorName,
          authorInitials: r.authorInitials,
          authorColor: r.authorColor,
          contentPreview: r.body?.slice(0, 200) || '',
          fullBody: (r.body || '').slice(0, 1200),
          voteCount: 0,
          createdAt: r.createdAt,
        });
      }
    }

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
      sourceText: item.fullBody || item.contentPreview || '',
      voteCount: item.voteCount,
      selectionReason: 'novel',
      createdAt: item.createdAt,
    }));

    const rootPost = snapshot.sourceType === 'post'
      ? (snapshot.sourceManifest || []).find((item) => item.sourceType === 'post')
      : null;
    const combinedManifest = [
      ...(snapshot.sourceManifest || []).filter((item) => item.sourceType !== 'post'),
      ...newManifestItems,
    ];
    const availableSlots = MAX_SOURCE_MANIFEST_ITEMS - (rootPost ? 1 : 0);
    snapshot.sourceManifest = [
      ...(rootPost ? [rootPost] : []),
      ...combinedManifest.slice(-availableSlots),
    ];
    snapshot.selectedCount = snapshot.sourceManifest.length;
    snapshot.totalEligibleSources = (snapshot.totalEligibleSources || 0) + newItemsCount;
    snapshot.snapshotBoundaryTime = now;

    if (snapshot.sourceType === 'discussion') {
      const [contributors] = await DiscussionContribution.aggregate([
        {
          $match: {
            discussionId: snapshot.sourceId,
            status: 'active',
            createdAt: { $lte: now },
          },
        },
        { $group: { _id: '$authorId' } },
        { $count: 'count' },
      ]);
      snapshot.uniqueContributors = contributors?.count || 0;
    } else {
      const [replyContributors] = await PostReply.aggregate([
        { $match: { postId: snapshot.sourceId, createdAt: { $lte: now } } },
        { $group: { _id: '$authorId' } },
        { $count: 'count' },
      ]);
      const sourcePost = await Post.findById(snapshot.sourceId).select('authorId').lean();
      const authorReplied = sourcePost
        ? await PostReply.exists({ postId: snapshot.sourceId, authorId: sourcePost.authorId, createdAt: { $lte: now } })
        : false;
      snapshot.uniqueContributors = (replyContributors?.count || 0) + (authorReplied ? 0 : 1);
    }

    await snapshot.save();

    // Re-run zero-cost analysis to update themes
    const updatedAnalysis = await runZeroCostAnalysis({
      snapshot,
      rawItems: snapshot.sourceManifest,
    });

    draft.sourceAnalysisId = updatedAnalysis._id;
    await draft.save();

    res.json({
      hasNewContributions: true,
      newContributionsCount: newItemsCount,
      message: `Incorporated ${newItemsCount} new community contributions into the analysis.`,
      updatedAnalysis,
      snapshot: presentSourceSnapshot(snapshot),
    });
  } catch (err) {
    next(err);
  }
};

export const updateKnowledgeArticle = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const { title, summary, content, coverImage, category } = req.body || {};

    const article = await findAccessibleKnowledge(articleId, req.user._id);
    if (!article) {
      return res.status(404).json({ error: 'Knowledge article not found' });
    }

    const isOwner = req.user && String(article.authorId) === String(req.user._id);
    if (!isOwner) {
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
