import logger from '#config/logger.js';
import { registerSchema, loginSchema } from '#validations/auth.validations.js';
import { formValidationError } from '#utils/format.js';
import { createUser, authenticateUser } from '../services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const safeParseSignupSchema = (body) => registerSchema.safeParse(body);
export const safeParseLoginSchema = (body) => loginSchema.safeParse(body);

export const signup = async (req, res, next) => {
  try {
    const validationResult = safeParseSignupSchema(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formValidationError(validationResult.error),
      });
    }

    const { name, email, password, role } = validationResult.data;

    const user = await createUser({ name, email, password, role });
    if (!user) {
      return res.status(500).json({ message: 'User creation failed' });
    }

    const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });
    cookies.set(res, 'token', token);

    logger.info(`Signup request received for email: ${email}`);
    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    logger.error('Error in signup controller:', e);
    if (e.message === 'User already exists') {
      return res.status(409).json({ message: 'User already exists' });
    }
    return next(e);
  }
};

export const signin = async (req, res, next) => {
  try {
    const validationResult = safeParseLoginSchema(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: formValidationError(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;
    const user = await authenticateUser({ email, password });

    const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });
    cookies.set(res, 'token', token);

    logger.info(`Login request received for email: ${email}`);
    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    logger.error('Error in login controller:', e);
    if (e.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    if (e.message === 'Invalid credentials') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return next(e);
  }
};

export const signout = async (req, res, next) => {
  try {
    cookies.clearCookie(res, 'token');
    logger.info('Logout request received');
    return res.status(200).json({ message: 'Logout successful' });
  } catch (e) {
    logger.error('Error in logout controller:', e);
    return next(e);
  }
};

export const login = signin;
export const logout = signout;