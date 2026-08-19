import express from 'express';
import {
  authenticate,
  requireRole,
} from '#middlewares/authenticate.middleware.js';
import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controller.js';

const router = express.Router();

router.get('/', authenticate, fetchAllUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, requireRole(['admin']), deleteUser);

export default router;
