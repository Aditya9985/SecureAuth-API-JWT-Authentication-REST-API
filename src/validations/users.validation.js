import { z } from 'zod';

export const userIdSchema = z.object({
  id: z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be a positive number'),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1, { message: 'Name must not be empty' }).optional(),
    email: z
      .string()
      .max(255)
      .toLowerCase()
      .trim()
      .email({ message: 'Invalid email address' })
      .optional(),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' })
      .optional(),
    role: z.enum(['user', 'admin']).optional(),
  })
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided for update',
  });
