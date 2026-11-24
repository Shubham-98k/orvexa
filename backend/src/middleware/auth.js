import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'orvexa_jwt_dev_secret_key_8932478';
  return jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const secret = process.env.JWT_SECRET || 'orvexa_jwt_dev_secret_key_8932478';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'User session invalid. Please log in again.' });
    }

    if (user.accountStatus === 'banned' || user.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended or banned. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (token) {
      const secret = process.env.JWT_SECRET || 'orvexa_jwt_dev_secret_key_8932478';
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id).select('-passwordHash');
    }
  } catch {
    // Continue as guest
  }
  next();
};
