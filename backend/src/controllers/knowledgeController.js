import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Save } from '../models/Notification.js';
import { User } from '../models/User.js';

export const getKnowledgeArticles = async (req, res, next) => {
  try {
    const { category, sort, mode } = req.query;
    let query = { status: 'published' };
    if (category && category !== 'All topics') query.category = category;

    // 1. "Following" feed: requires authenticated user and following list
    if (mode === 'following') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Please log in to view knowledge articles from people you follow.',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }
      const currentUser = await User.findById(req.user._id);
      const followingIds = currentUser?.following || [];
      if (followingIds.length === 0) {
        return res.json({ articles: [] });
      }
      query.authorId = { $in: followingIds };
    }

    let sortObj = { createdAt: -1 };
    if (mode === 'trending' || sort === 'Most saved') sortObj = { savesCount: -1, helpfulCount: -1, createdAt: -1 };
    else if (mode === 'for-you' || mode === 'for you') sortObj = { savesCount: -1, createdAt: -1 };
    else if (mode === 'latest') sortObj = { createdAt: -1 };

    const articles = await KnowledgeArticle.find(query).sort(sortObj);
    res.json({ articles });
  } catch (err) {
    next(err);
  }
};

export const getKnowledgeById = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ article });
  } catch (err) {
    next(err);
  }
};

export const createKnowledge = async (req, res, next) => {
  try {
    const { title, subtitle, summary, content, category, readTime, source, sourceDiscussionId, references } = req.body;
    if (!title || !summary || !content) {
      return res.status(400).json({ error: 'Title, summary, and content are required' });
    }

    const article = await KnowledgeArticle.create({
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      title: title.trim(),
      subtitle: subtitle || '',
      summary: summary.trim(),
      content: content.trim(),
      category: category || 'Thinking',
      readTime: readTime || '6 min read',
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

export const voteHelpful = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const userId = req.user._id;

    const article = await KnowledgeArticle.findById(articleId);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const idx = article.helpfulVoters.indexOf(userId);
    let helpful = false;
    if (idx === -1) {
      article.helpfulVoters.push(userId);
      article.helpfulCount += 1;
      helpful = true;
    } else {
      article.helpfulVoters.splice(idx, 1);
      article.helpfulCount = Math.max(0, article.helpfulCount - 1);
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
      article.savesCount = Math.max(0, article.savesCount - 1);
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
      metadata: { readTime: article.readTime, source: article.source },
    });
    article.savesCount += 1;
    await article.save();

    res.json({ saved: true, message: 'Saved to your Reading List' });
  } catch (err) {
    next(err);
  }
};
