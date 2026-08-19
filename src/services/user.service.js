import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '#services/auth.service.js';

const userProjection = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

export const getAllUsers = async () => {
  try {
    return await db.select(userProjection).from(users);
  } catch (e) {
    logger.error('Error in getAllUsers service:', e);
    throw e;
  }
};

export const getUserById = async (id) => {
  try {
    const result = await db
      .select(userProjection)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (result.length === 0) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (e) {
    logger.error('Error in getUserById service:', e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (existing.length === 0) {
      throw new Error('User not found');
    }

    const { password, ...fields } = updates;
    const data = { ...fields, updated_at: new Date() };
    if (password) {
      data.password = await hashPassword(password);
    }

    const result = await db.update(users).set(data).where(eq(users.id, id)).returning(userProjection);

    logger.info(`User updated successfully with id: ${id}`);
    return result[0] ?? null;
  } catch (e) {
    logger.error('Error in updateUser service:', e);
    throw e;
  }
};

export const deleteUser = async (id) => {
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (existing.length === 0) {
      throw new Error('User not found');
    }

    await db.delete(users).where(eq(users.id, id));

    logger.info(`User deleted successfully with id: ${id}`);
    return true;
  } catch (e) {
    logger.error('Error in deleteUser service:', e);
    throw e;
  }
};