import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Discussion } from '../models/Discussion.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { getCircleContentFilter } from '../services/circleAccessService.js';

/**
 * GET /api/users/me
 * Explicitly return authenticated user's full account information
 */
export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id).select(
      '-passwordHash -resetPasswordToken -resetPasswordExpires -emailVerificationToken'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}

/**
 * GET /api/users/:username
 * Public profile lookup by username with real counts and follow status.
 */
export async function getUserByUsername(req, res) {
  try {
    const username = req.params.username.toLowerCase().trim();
    const user = await User.findOne({ username }).select(
      'username displayName headline bio initials avatarColor avatar platformRole followersCount followingCount followers createdAt'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const circleAccess = await getCircleContentFilter(req.user?._id);

    // Fetch user's public posts, discussions, and knowledge articles
    const [posts, discussions, knowledge] = await Promise.all([
      Post.find({
        $and: [
          { $or: [{ authorName: user.displayName }, { authorId: user._id }], status: 'published' },
          circleAccess,
        ],
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Discussion.find({
        $and: [
          { $or: [{ authorName: user.displayName }, { authorId: user._id }], status: { $nin: ['removed', 'closed'] } },
          circleAccess,
        ],
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      KnowledgeArticle.find({
        $and: [
          { $or: [{ authorName: user.displayName }, { authorId: user._id }], status: 'published' },
          circleAccess,
        ],
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const isFollowing = req.user
      ? user.followers?.some((f) => f.toString() === req.user._id.toString())
      : false;

    res.json({
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        headline: user.headline,
        bio: user.bio,
        initials: user.initials,
        avatarColor: user.avatarColor,
        avatar: user.avatar,
        platformRole: user.platformRole,
        followersCount: user.followersCount || user.followers?.length || 0,
        followingCount: user.followingCount || 0,
        createdAt: user.createdAt,
        isFollowing,
        isSelf: req.user ? req.user._id.toString() === user._id.toString() : false,
      },
      posts,
      discussions,
      knowledge,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}

/**
 * POST /api/users/:userId/follow
 * Real follow/unfollow toggle
 */
export async function toggleFollowUser(req, res) {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const isFollowing = targetUser.followers?.some((f) => f.toString() === currentUserId.toString());

    if (isFollowing) {
      // Unfollow
      targetUser.followers = targetUser.followers.filter((f) => f.toString() !== currentUserId.toString());
      targetUser.followersCount = Math.max(0, targetUser.followers.length);
      currentUser.following = currentUser.following.filter((f) => f.toString() !== targetUserId.toString());
      currentUser.followingCount = Math.max(0, currentUser.following.length);
    } else {
      // Follow
      if (!targetUser.followers) targetUser.followers = [];
      targetUser.followers.push(currentUserId);
      targetUser.followersCount = targetUser.followers.length;
      if (!currentUser.following) currentUser.following = [];
      currentUser.following.push(targetUserId);
      currentUser.followingCount = currentUser.following.length;
    }

    await Promise.all([targetUser.save(), currentUser.save()]);

    res.json({
      isFollowing: !isFollowing,
      followersCount: targetUser.followersCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle follow', details: err.message });
  }
}

/**
 * GET /api/users
 * Real search for people/users
 */
export async function searchUsers(req, res) {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    let query = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query = {
        $or: [{ username: regex }, { displayName: regex }, { headline: regex }],
      };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10));

    const users = await User.find(query)
      .select('username displayName headline bio initials avatarColor avatar platformRole followersCount')
      .sort({ followersCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(Math.min(50, parseInt(limit, 10)))
      .lean();

    const mapped = users.map((u) => ({
      ...u,
      isFollowing: req.user ? u.followers?.some((f) => f.toString() === req.user._id.toString()) : false,
    }));

    res.json({ users: mapped });
  } catch (err) {
    res.status(500).json({ error: 'User search failed', details: err.message });
  }
}

/**
 * PATCH /api/users/me
 * Update authenticated user profile fields
 */
export async function updateProfile(req, res) {
  try {
    const { displayName, headline, bio, avatar } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.trim().slice(0, 80);
    if (headline !== undefined) updates.headline = headline.trim().slice(0, 120);
    if (bio !== undefined) updates.bio = bio.trim().slice(0, 500);
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash -resetPasswordToken -resetPasswordExpires -emailVerificationToken');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'Update failed', details: err.message });
  }
}
