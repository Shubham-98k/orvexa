import jwt from 'jsonwebtoken';

const GUEST_SECRET = process.env.JWT_SECRET || 'orvexa_jwt_dev_secret_key_8932478';

/**
 * Gets configured preview duration in seconds.
 */
export const getGuestPreviewSeconds = () => {
  const val = parseInt(process.env.GUEST_PREVIEW_SECONDS, 10);
  return Number.isFinite(val) && val > 0 ? val : 120;
};

/**
 * Issues a signed guest preview token with the first-seen timestamp.
 */
export const issueGuestPreviewToken = (existingCreatedAt = null) => {
  const now = Date.now();
  const createdAt = existingCreatedAt || now;
  const maxAgeSeconds = getGuestPreviewSeconds();
  
  // Expiry is relative to first-seen timestamp
  const expiresAt = createdAt + maxAgeSeconds * 1000;

  return jwt.sign(
    {
      type: 'guest_preview',
      createdAt,
      expiresAt,
    },
    GUEST_SECRET,
    { expiresIn: `${maxAgeSeconds + 60}s` } // give small clock-skew margin in jwt exp
  );
};

/**
 * Validates guest preview session or authenticated user.
 * If user is logged in (via Bearer token), bypasses guest limitation.
 * If user is unauthenticated, checks guest preview token header:
 * 'X-Guest-Preview-Token'. If missing, auto-issues one in header.
 * If expired (> GUEST_PREVIEW_SECONDS from createdAt), rejects with 403 GUEST_PREVIEW_EXPIRED.
 */
export const requireGuestPreviewOrAuth = (req, res, next) => {
  // 1. If authenticated, user is exempt from guest preview limit
  if (req.user) {
    return next();
  }

  const guestToken = req.headers['x-guest-preview-token'];
  const maxDurationMs = getGuestPreviewSeconds() * 1000;
  const now = Date.now();

  if (!guestToken) {
    // Brand new guest session: issue token and allow request
    const newToken = issueGuestPreviewToken(now);
    res.setHeader('X-Guest-Preview-Token', newToken);
    res.setHeader('X-Guest-Preview-Remaining', Math.round(maxDurationMs / 1000));
    req.guestSession = { createdAt: now, remainingSeconds: Math.round(maxDurationMs / 1000) };
    return next();
  }

  try {
    const decoded = jwt.verify(guestToken, GUEST_SECRET);
    if (decoded.type !== 'guest_preview' || !decoded.createdAt) {
      throw new Error('Invalid guest token payload');
    }

    const elapsedMs = now - decoded.createdAt;
    const remainingMs = maxDurationMs - elapsedMs;

    if (remainingMs <= 0) {
      return res.status(403).json({
        error: 'Your 2-minute guest preview has expired. Please sign up or log in to continue reading.',
        code: 'GUEST_PREVIEW_EXPIRED',
        expiredAt: decoded.createdAt + maxDurationMs,
      });
    }

    const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));
    res.setHeader('X-Guest-Preview-Token', guestToken);
    res.setHeader('X-Guest-Preview-Remaining', remainingSeconds);
    req.guestSession = {
      createdAt: decoded.createdAt,
      remainingSeconds,
    };

    next();
  } catch (err) {
    // If token is invalid or tampered with, issue a fresh one to be resilient
    const freshToken = issueGuestPreviewToken(now);
    res.setHeader('X-Guest-Preview-Token', freshToken);
    res.setHeader('X-Guest-Preview-Remaining', Math.round(maxDurationMs / 1000));
    req.guestSession = { createdAt: now, remainingSeconds: Math.round(maxDurationMs / 1000) };
    next();
  }
};
