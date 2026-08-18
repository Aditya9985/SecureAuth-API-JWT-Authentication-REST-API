import logger from '#config/logger.js';
import bcrypt from 'bcrypt';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';

export const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (err) {
    logger.error('Error hashing password:', err);
    throw new Error('Error hashing password');
  }
};

export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (err) {
    logger.error('Error comparing password:', err);
    throw new Error('Error comparing password');
  }
};

export const createUser = async ({ name, email, password, role = 'user' }) => {
  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    const passwordHash = await hashPassword(password);

    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: passwordHash,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
      });

    logger.info(`User created successfully with email: ${email}`);
    return newUser[0] ?? null;
  } catch (err) {
    logger.error('Error creating user:', err);
    throw err;
  }
};

export const authenticateUser = async ({ email, password }) => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    const foundUser = user[0];
    const isPasswordValid = await comparePassword(password, foundUser.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    logger.info(`User authenticated successfully with email: ${email}`);
    return foundUser;
  } catch (err) {
    logger.error('Error authenticating user:', err);
    throw err;
  }
};