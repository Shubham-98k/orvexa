import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Save } from '../models/Notification.js';

export const getPosts = async (req, res, next) => {
  try {
    const { mode, tag, circle, page = 1, limit = 20 } = req.query;
    let query = { status: 'published' };
    if (tag && tag !== 'All') query.tags = tag;
    if (circle) query.circleName = circle;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10));

    // 1. "Following" feed: requires authenticated user and following list
    if (mode === 'following') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Please log in to view posts from people you follow.',
          code: 'AUTHENTICATION_REQUIRED',
        });
      }
      const currentUser = await User.findById(req.user._id);
      const followingIds = currentUser?.following || [];
      query.authorId = { $in: followingIds };
    }

    // 2. Sorting based on feed mode
    let sort = { createdAt: -1 }; // default "Latest"
    if (mode === 'trending') {
      // Trending: engagement with recent bias
      sort = { likeCount: -1, commentsCount: -1, createdAt: -1 };
    } else if (mode === 'for-you' || mode === 'for you') {
      // Personalized or non-personalized public ranking
      sort = { likeCount: -1, createdAt: -1 };
    }

    const posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.min(50, parseInt(limit, 10)))
      .lean();

    const mapped = posts.map((p) => ({
      ...p,
      hasLiked: req.user ? p.likes?.some((l) => l.toString() === req.user._id.toString()) : false,
      likeCount: p.likeCount || 0,
    }));

    res.json({ posts: mapped });
  } catch (err) {
    next(err);
  }
};

export const createPost = async (req, res, next) => {
  try {
    const { body, title, tags, imageUrl, circleName } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const post = await Post.create({
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      title: title || '',
      body: body.trim(),
      tags: tags || ['#OrvexaCommunity'],
      imageUrl: imageUrl || '',
      circleName: circleName || null,
      likeCount: 0,
      likes: [],
      commentsCount: 0,
    });

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
};

export const toggleLikePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (!post.likes) post.likes = [];
    const index = post.likes.findIndex((l) => l.toString() === userId.toString());
    let hasLiked = false;

    if (index > -1) {
      post.likes.splice(index, 1);
      post.likeCount = Math.max(0, post.likes.length);
      hasLiked = false;
    } else {
      post.likes.push(userId);
      post.likeCount = post.likes.length;
      hasLiked = true;
    }

    await post.save();
    res.json({ likeCount: post.likeCount, hasLiked });
  } catch (err) {
    next(err);
  }
};

export const savePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const existing = await Save.findOne({ userId, targetId: postId, targetType: 'post' });
    if (existing) {
      await Save.deleteOne({ _id: existing._id });
      return res.json({ saved: false });
    }

    await Save.create({ userId, targetId: postId, targetType: 'post' });
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
};
