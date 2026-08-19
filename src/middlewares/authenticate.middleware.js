import logger from '#config/logger.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const authenticate = (req, res, next) => {
  try {
    const headerToken =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined;
    const token = cookies.getCookie(req, 'token') || headerToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = jwttoken.verify(token);
    next();
  } catch (e) {
    logger.error('Authentication failed:', e);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowed.includes(req.user.role)) {
      logger.warn(`Forbidden: required role(s) ${allowed.join('/')} for ${req.ip}`, { path: req.path });
      return res.status(403).json({ message: `Forbidden: ${allowed.join('/')} access required` });
    }
    next();
  };
};