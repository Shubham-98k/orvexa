/**
 * In-memory sliding-window rate limiter per route / route group.
 * Identifies clients using IP address combined with guest session token or user ID.
 */
export const createRateLimiter = ({
  windowMs = 60000,
  max = 60,
  message = 'Too many requests, please try again later.',
  endpointName = 'general',
} = {}) => {
  const hits = new Map();

  // Periodic cleanup of expired windows every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 60000).unref(); // unref so it won't block server shutdown or tests

  return (req, res, next) => {
    // Determine client identifier: authenticated user ID > guest preview token > IP address
    const guestToken = req.headers['x-guest-preview-token'] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const clientId = req.user?._id?.toString() || (guestToken ? `guest:${guestToken.slice(-16)}` : `ip:${ip}`);
    const key = `${endpointName}:${clientId}`;

    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
};

// Standard rate limiters
export const publicApiRateLimiter = (req, res, next) => {
  const windowMs = parseInt(process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS, 10) || 60000;
  const max = parseInt(process.env.PUBLIC_API_RATE_LIMIT_MAX_REQUESTS, 10) || 60;
  return createRateLimiter({
    windowMs,
    max,
    endpointName: 'public-api',
    message: 'Too many requests on public content. Please slow down.',
  })(req, res, next);
};

export const publicSearchRateLimiter = (req, res, next) => {
  const windowMs = parseInt(process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS, 10) || 60000;
  const max = parseInt(process.env.PUBLIC_SEARCH_RATE_LIMIT_MAX_REQUESTS, 10) || 20;
  return createRateLimiter({
    windowMs,
    max,
    endpointName: 'public-search',
    message: 'Search rate limit exceeded. Please wait a moment.',
  })(req, res, next);
};
