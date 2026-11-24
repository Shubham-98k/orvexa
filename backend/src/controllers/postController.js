import { Post } from '../models/Post.js';
import { Save } from '../models/Notification.js';

export const getPosts = async (req, res, next) => {
  try {
    const { mode, tag, circle } = req.query;
    let query = { status: 'published' };
    if (tag) query.tags = tag;
    if (circle) query.circleName = circle;

    let sort = { createdAt: -1 };
    if (mode === 'trending') sort = { likeCount: -1, createdAt: -1 };

    const posts = await Post.find(query).sort(sort).limit(30);
    res.json({ posts });
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
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const index = post.likedBy.indexOf(userId);
    let isLiked = false;
    if (index === -1) {
      post.likedBy.push(userId);
      post.likeCount += 1;
      isLiked = true;
    } else {
      post.likedBy.splice(index, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
      isLiked = false;
    }

    await post.save();
    res.json({ isLiked, likeCount: post.likeCount });
  } catch (err) {
    next(err);
  }
};

export const savePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = await Save.findOne({ userId: req.user._id, itemType: 'post', itemId: postId });
    if (existing) {
      await Save.deleteOne({ _id: existing._id });
      post.saveCount = Math.max(0, post.saveCount - 1);
      await post.save();
      return res.json({ saved: false, message: 'Removed from library' });
    }

    await Save.create({
      userId: req.user._id,
      itemType: 'post',
      itemId: postId,
      title: post.title || post.body.slice(0, 40),
      description: post.body,
      author: post.authorName,
      category: post.tags?.[0] || 'Community',
    });
    post.saveCount += 1;
    await post.save();

    res.json({ saved: true, message: 'Saved to your library' });
  } catch (err) {
    next(err);
  }
};
