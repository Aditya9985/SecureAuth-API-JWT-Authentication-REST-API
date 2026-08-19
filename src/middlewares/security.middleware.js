import aj from '#config/arcjet.js';
import logger from '#config/logger.js';

const securityMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, {
      requested: 1,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        logger.warn(`Rate limit exceeded from ${req.ip}`, {
          path: req.path,
          method: req.method,
        });
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again later.',
          retryAfter: decision.headers.get('Retry-After'),
        });
      }

      if (decision.reason.isBot()) {
        logger.warn(`Bot detected from ${req.ip}`, {
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Automated requests are not allowed.',
        });
      }

      if (decision.reason.isShield()) {
        logger.warn(`Shield blocked request from ${req.ip}`, {
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Request blocked for security reasons.',
        });
      }

      if (decision.reason.isRateLimit()) {
        logger.warn(`Rate limit exceeded from ${req.ip}`, {
          path: req.path,
          method: req.method,
        });
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again later.',
          retryAfter: decision.headers.get('Retry-After'),
        });
      }

      logger.warn(`Request denied from ${req.ip}`, {
        path: req.path,
        reason: decision.reason,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request blocked.',
      });
    }

    next();
  } catch (error) {
    logger.error('Security middleware error', {
      error: error.message,
      ip: req.ip,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected security error occurred.',
    });
  }
};

export default securityMiddleware;
