import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Save } from '../models/Notification.js';
import { PostReply } from '../models/PostReply.js';
import { Notification } from '../models/Notification.js';

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
      if (followingIds.length === 0) {
        return res.json({ posts: [] });
      }
      query.authorId = { $in: followingIds };
    }

    // 2. Sorting based on feed mode
    let sort = { createdAt: -1 }; // default "Latest"
    if (mode === 'trending') {
      // Trending: engagement with recent bias
      sort = { likeCount: -1, commentCount: -1, createdAt: -1 };
    } else if (mode === 'for-you' || mode === 'for you') {
      // Personalized or non-personalized public ranking
      sort = { likeCount: -1, createdAt: -1 };
    } else if (mode === 'latest') {
      sort = { createdAt: -1 };
    }

    const posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.min(50, parseInt(limit, 10)))
      .lean();

    const mapped = posts.map((p) => {
      const hasLiked = req.user
        ? Boolean(
            p.likes?.some((l) => l.toString() === req.user._id.toString()) ||
              p.likedBy?.some((l) => l.toString() === req.user._id.toString())
          )
        : false;
      return {
        ...p,
        hasLiked,
        isLiked: hasLiked,
        likeCount: p.likeCount || 0,
        commentCount: p.commentCount || p.commentsCount || 0,
        commentsCount: p.commentsCount || p.commentCount || 0,
      };
    });

    res.json({ posts: mapped });
  } catch (err) {
    next(err);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      status: 'published',
    }).lean();

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [saved, hasLiked, replies] = await Promise.all([
      Save.exists({
        userId: req.user._id,
        itemType: 'post',
        itemId: post._id,
      }),
      post.likes?.some((id) => id.toString() === req.user._id.toString()) ||
        post.likedBy?.some((id) => id.toString() === req.user._id.toString()),
      PostReply.find({ postId: post._id }).sort({ createdAt: 1 }).lean(),
    ]);

    res.json({
      post: {
        ...post,
        isSaved: Boolean(saved),
        saved: Boolean(saved),
        hasLiked: Boolean(hasLiked),
        isLiked: Boolean(hasLiked),
        likeCount: post.likeCount || 0,
        commentCount: replies.length || post.commentCount || post.commentsCount || 0,
        commentsCount: replies.length || post.commentsCount || post.commentCount || 0,
      },
      replies,
    });
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
      likedBy: [],
      commentsCount: 0,
      commentCount: 0,
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
    if (!post.likedBy) post.likedBy = [];

    const index = post.likes.findIndex((l) => l.toString() === userId.toString());
    const likedByIdx = post.likedBy.findIndex((l) => l.toString() === userId.toString());
    let hasLiked = false;

    if (index > -1 || likedByIdx > -1) {
      if (index > -1) post.likes.splice(index, 1);
      if (likedByIdx > -1) post.likedBy.splice(likedByIdx, 1);
      post.likeCount = Math.max(0, post.likes.length);
      hasLiked = false;
    } else {
      post.likes.push(userId);
      post.likedBy.push(userId);
      post.likeCount = post.likes.length;
      hasLiked = true;
    }

    await post.save();
    res.json({ likeCount: post.likeCount, hasLiked, isLiked: hasLiked });
  } catch (err) {
    next(err);
  }
};

export const getPostReplies = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const replies = await PostReply.find({ postId: post._id }).sort({ createdAt: 1 }).lean();
    res.json({ replies, replyCount: replies.length });
  } catch (err) {
    next(err);
  }
};

export const addPostReply = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const body = req.body.body?.trim();
    const parentReplyId = req.body.parentReplyId || null;
    let parentReply = null;
    if (!body) return res.status(400).json({ error: 'Reply content is required' });
    if (parentReplyId) {
      parentReply = await PostReply.findOne({
        _id: parentReplyId,
        postId: post._id,
      });
      if (!parentReply) {
        return res.status(404).json({ error: 'Reply not found' });
      }
    }

    const reply = await PostReply.create({
      postId: post._id,
      parentReplyId,
      authorId: req.user._id,
      authorName: req.user.displayName,
      authorInitials: req.user.initials,
      authorColor: req.user.avatarColor,
      body,
    });

    const replyCount = await PostReply.countDocuments({ postId: post._id });
    post.commentCount = replyCount;
    post.commentsCount = replyCount;
    await post.save();

    const recipientIds = new Set();
    if (post.authorId && post.authorId.toString() !== req.user._id.toString()) {
      recipientIds.add(post.authorId.toString());
    }
    if (parentReply?.authorId && parentReply.authorId.toString() !== req.user._id.toString()) {
      recipientIds.add(parentReply.authorId.toString());
    }

    if (recipientIds.size > 0) {
      const recipients = await User.find({
        _id: { $in: [...recipientIds] },
        'notificationPreferences.replies': { $ne: false },
      }).select('_id');

      await Notification.insertMany(
        recipients.map((recipient) => ({
          recipientId: recipient._id,
          actorId: req.user._id,
          actorName: req.user.displayName,
          actorInitials: req.user.initials,
          actorColor: req.user.avatarColor,
          type: 'comment',
          title: parentReply
            ? `replied to ${parentReply.authorId.toString() === recipient._id.toString() ? 'your reply' : 'a reply'} on "${post.title || 'your post'}"`
            : `replied to your post "${post.title || 'Untitled post'}"`,
          targetType: 'post',
          targetId: post._id,
        }))
      );
    }

    res.status(201).json({ reply, replyCount, commentCount: replyCount });
  } catch (err) {
    next(err);
  }
};

export const savePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = await Save.findOne({
      userId,
      $or: [
        { itemType: 'post', itemId: postId },
        { targetType: 'post', targetId: postId },
      ],
    });
    if (existing) {
      await Save.deleteOne({ _id: existing._id });
      return res.json({ saved: false });
    }

    await Save.create({
      userId,
      itemType: 'post',
      itemId: postId,
      title: post.title || (post.body?.slice(0, 80) ?? 'Untitled post'),
      description: post.body,
      author: post.authorName,
      metadata: {
        circleName: post.circleName,
        tags: post.tags,
        imageUrl: post.imageUrl,
      },
    });
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
};
