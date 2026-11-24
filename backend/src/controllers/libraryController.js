import { Save } from '../models/Notification.js';
import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';

export const getLibrary = async (req, res, next) => {
  try {
    const { type } = req.query;
    let query = { userId: req.user._id };
    if (type && type !== 'all') query.itemType = type;

    const savedItems = await Save.find(query).sort({ createdAt: -1 }).lean();
    const postIds = savedItems.filter((item) => item.itemType === 'post').map((item) => item.itemId);
    const discussionIds = savedItems.filter((item) => item.itemType === 'discussion').map((item) => item.itemId);
    const knowledgeIds = savedItems.filter((item) => item.itemType === 'knowledge').map((item) => item.itemId);

    const [posts, discussions, knowledge] = await Promise.all([
      postIds.length ? Post.find({ _id: { $in: postIds }, status: 'published' }).lean() : [],
      discussionIds.length ? Discussion.find({ _id: { $in: discussionIds }, status: { $ne: 'removed' } }).lean() : [],
      knowledgeIds.length ? KnowledgeArticle.find({ _id: { $in: knowledgeIds }, status: 'published' }).lean() : [],
    ]);

    const postsById = new Map(posts.map((post) => [post._id.toString(), post]));
    const discussionsById = new Map(discussions.map((discussion) => [discussion._id.toString(), discussion]));
    const knowledgeById = new Map(knowledge.map((article) => [article._id.toString(), article]));

    const items = savedItems
      .map((saved) => {
        const id = saved.itemId?.toString();
        let content = null;
        if (saved.itemType === 'post') content = postsById.get(id);
        if (saved.itemType === 'discussion') content = discussionsById.get(id);
        if (saved.itemType === 'knowledge') content = knowledgeById.get(id);
        if (!content) return null;

        return {
          _id: saved._id,
          itemType: saved.itemType,
          itemId: saved.itemId,
          title: content.title || saved.title,
          description: content.body || content.summary || saved.description || '',
          author: content.authorName || saved.author,
          category: content.category || saved.category,
          metadata: saved.metadata,
          content,
          savedAt: saved.createdAt,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (err) {
    next(err);
  }
};
