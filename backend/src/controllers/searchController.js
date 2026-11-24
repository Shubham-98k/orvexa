import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { User } from '../models/User.js';

export const globalSearch = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.json({ posts: [], discussions: [], knowledge: [], circles: [], users: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const [posts, discussions, knowledge, circles, users] = await Promise.all([
      Post.find({ $or: [{ title: regex }, { body: regex }, { tags: regex }] }).limit(6),
      Discussion.find({ $or: [{ title: regex }, { body: regex }, { tags: regex }] }).limit(6),
      KnowledgeArticle.find({ $or: [{ title: regex }, { summary: regex }, { category: regex }] }).limit(6),
      Circle.find({ $or: [{ name: regex }, { description: regex }] }).limit(6),
      User.find({ $or: [{ displayName: regex }, { username: regex }, { headline: regex }] }).limit(6),
    ]);

    res.json({ posts, discussions, knowledge, circles, users });
  } catch (err) {
    next(err);
  }
};
