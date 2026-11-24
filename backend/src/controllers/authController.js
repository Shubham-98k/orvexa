import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

export const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields (display name, username, email, password) are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and alphanumeric or underscore only.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        return res.status(409).json({ error: 'That username is already taken. Please choose another.' });
      }
      return res.status(409).json({ error: 'An account with that email already exists. Please log in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Initial avatar color and initials
    const words = displayName.trim().split(/\s+/);
    const initials = (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase().slice(0, 2);
    const colors = ['purple', 'blue', 'pink', 'green', 'gold'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    // Check if this is the very first registered user -> appoint as admin bootstrap
    const totalUsers = await User.countDocuments();
    const platformRole = totalUsers === 0 ? 'admin' : 'user';

    // Email verification token
    const verificationToken = crypto.randomBytes(24).toString('hex');

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      displayName: displayName.trim(),
      passwordHash,
      initials,
      avatarColor,
      platformRole,
      emailVerificationToken: verificationToken,
      emailVerifiedAt: totalUsers === 0 ? new Date() : null, // First admin auto-verified
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        headline: user.headline,
        avatar: user.avatar,
        avatarColor: user.avatarColor,
        initials: user.initials,
        role: user.platformRole,
        platformRole: user.platformRole,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        emailVerified: !!user.emailVerifiedAt,
      },
      message: 'Account registered successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    const identifier = emailOrUsername.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    if (user.accountStatus === 'banned' || user.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended or banned. Please contact platform support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    user.lastActiveAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        headline: user.headline,
        avatar: user.avatar,
        avatarColor: user.avatarColor,
        initials: user.initials,
        role: user.platformRole,
        platformRole: user.platformRole,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        emailVerified: !!user.emailVerifiedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const user = req.user;
    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        headline: user.headline,
        avatar: user.avatar,
        avatarColor: user.avatarColor,
        initials: user.initials,
        role: user.platformRole,
        platformRole: user.platformRole,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        emailVerified: !!user.emailVerifiedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Please provide your email address.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Development notice / log capture
      console.log(`[Auth] Password reset token for ${user.email}: ${resetToken}`);
    }

    // Always return safe generic confirmation to prevent user enumeration
    res.json({
      message: 'If an account exists with that email address, password reset instructions have been sent.',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token required.' });

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired email verification token.' });
    }

    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = null;
    await user.save();

    res.json({ message: 'Email address verified successfully.' });
  } catch (err) {
    next(err);
  }
};
