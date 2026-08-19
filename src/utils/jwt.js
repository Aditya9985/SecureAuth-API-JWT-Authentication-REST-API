import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = '1d';

export const jwttoken = {
  sign: payload => {
    try {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    } catch (error) {
      throw new Error('Error signing JWT token: ' + error.message, {
        cause: error,
      });
    }
  },
  verify: token => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error?.name === 'JsonWebTokenError') {
        throw new Error('Invalid JWT token: ' + error.message, {
          cause: error,
        });
      }
      throw new Error('Error verifying JWT token: ' + error.message, {
        cause: error,
      });
    }
  },
};
