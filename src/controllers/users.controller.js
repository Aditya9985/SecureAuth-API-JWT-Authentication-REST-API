import logger from '#config/logger.js';
import { getAllUsers } from '#services/user.service.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Fetching all users from database');
    const users = await getAllUsers();

    res.json({
      message: 'Users fetched successfully',
      users,
      count: users.length,
    });
  } catch (e) {
    logger.error(e);
    next(e);
  }
};