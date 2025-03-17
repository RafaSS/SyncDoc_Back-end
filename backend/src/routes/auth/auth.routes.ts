import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware';
import { AuthController } from '../../controllers/auth.controller';

const router = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post('/register', AuthController.register);

/**
 * @route POST /api/auth/login
 * @description Login a user
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route POST /api/auth/logout
 * @description Logout the current user
 * @access Private
 */
router.post('/logout', isAuthenticated, AuthController.logout);

/**
 * @route POST /api/auth/forgot-password
 * @description Send password reset email
 * @access Public
 */
router.post('/forgot-password', AuthController.forgotPassword);

/**
 * @route POST /api/auth/reset-password
 * @description Reset password with token
 * @access Private
 */
router.post('/reset-password', isAuthenticated, AuthController.resetPassword);

/**
 * @route GET /api/auth/me
 * @description Get current user's data
 * @access Private
 */
router.get('/me', isAuthenticated, AuthController.getCurrentUser);

/**
 * @route GET /api/auth/verify
 * @description Verify authentication status
 * @access Private
 */
router.get('/verify', isAuthenticated, AuthController.verify);

export default router;
