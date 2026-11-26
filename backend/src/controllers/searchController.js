import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Circle } from '../models/Circle.js';
import { User } from '../models/User.js';
import { getCircleContentFilter, getJoinedCircleIds } from '../services/circleAccessService.js';

export const globalSearch = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.json({ posts: [], discussions: [], knowledge: [], circles: [], users: [] });
    }

    const regex = new RegExp(q.trim(), 'i');
    const circleAccess = await getCircleContentFilter(req.user?._id);
    const joinedCircleIds = req.user ? await getJoinedCircleIds(req.user._id) : [];

    const [posts, discussions, knowledge, circles, users] = await Promise.all([
      Post.find({
        $and: [
          { status: 'published', $or: [{ title: regex }, { body: regex }, { tags: regex }] },
          circleAccess,
        ],
      }).limit(6),
      Discussion.find({
        $and: [
          { status: { $nin: ['removed', 'closed'] }, $or: [{ title: regex }, { body: regex }, { tags: regex }] },
          circleAccess,
        ],
      }).limit(6),
      KnowledgeArticle.find({
        $and: [
          { status: 'published', $or: [{ title: regex }, { summary: regex }, { category: regex }] },
          circleAccess,
        ],
      }).limit(6),
      Circle.find({
        status: 'active',
        $and: [
          { $or: [{ name: regex }, { description: regex }] },
          { $or: [{ visibility: 'public' }, { _id: { $in: joinedCircleIds } }] },
        ],
      }).limit(6),
      User.find({ $or: [{ displayName: regex }, { username: regex }, { headline: regex }] }).limit(6),
    ]);

    res.json({ posts, discussions, knowledge, circles, users });
  } catch (err) {
    next(err);
  }
};
