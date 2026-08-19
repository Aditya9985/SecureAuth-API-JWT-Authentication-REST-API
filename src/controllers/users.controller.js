import logger from '#config/logger.js';
import { formValidationError } from '#utils/format.js';
import {
  getAllUsers,
  getUserById as fetchUserById,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/user.service.js';
import {
  userIdSchema,
  updateUserSchema,
} from '#validations/users.validation.js';

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

export const getUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;
    const user = await fetchUserById(id);

    logger.info(`Fetching user with id: ${id}`);
    return res.json({
      message: 'User fetched successfully',
      user,
    });
  } catch (e) {
    logger.error(e);
    if (e.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    return next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const idValidation = userIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateUserSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formValidationError(bodyValidation.error),
      });
    }

    const { id } = idValidation.data;
    const updates = bodyValidation.data;

    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res
        .status(403)
        .json({ message: 'You can only update your own account' });
    }
    if (updates.role && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Only admins can change the role of a user' });
    }

    const user = await updateUserService(id, updates);

    logger.info(`User updated via API with id: ${id}`);
    return res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (e) {
    logger.error(e);
    if (e.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    return next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res
        .status(403)
        .json({ message: 'You can only delete your own account' });
    }

    await deleteUserService(id);

    logger.info(`User deleted via API with id: ${id}`);
    return res.json({ message: 'User deleted successfully' });
  } catch (e) {
    logger.error(e);
    if (e.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    return next(e);
  }
};
