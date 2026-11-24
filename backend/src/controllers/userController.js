import { User } from '../models/User.js';

/**
 * GET /api/users/:username
 * Public profile lookup by username.
 */
export async function getUserByUsername(req, res) {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      '-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/**
 * PATCH /api/users/me
 * Update the authenticated user's editable profile fields.
 * Allowed: displayName, headline, bio, avatar
 */
export async function updateProfile(req, res) {
  try {
    const { displayName, headline, bio, avatar } = req.body;

    // Only pick allowed fields — never accept role/email changes here
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.trim().slice(0, 80);
    if (headline !== undefined) updates.headline = headline.trim().slice(0, 120);
    if (bio !== undefined) updates.bio = bio.trim().slice(0, 500);
    if (avatar !== undefined) updates.avatar = avatar; // URL string

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
}
