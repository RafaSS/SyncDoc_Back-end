import { Request, Response } from 'express';
import { createServices } from '../config/service-factory';

const { authService } = createServices();

/**
 * Authentication Controller
 * Handles user authentication operations
 */
export class AuthController {
  /**
   * Register a new user
   * @param req Express request
   * @param res Express response
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        res.status(400).json({ 
          error: 'Username, email, and password are required' 
        });
        return;
      }
      
      const result = await authService.register({ username, email, password });
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Login a user
   * @param req Express request
   * @param res Express response
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ 
          error: 'Email and password are required' 
        });
        return;
      }
      
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  /**
   * Logout the current user
   * @param req Express request
   * @param res Express response
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      await authService.logout();
      res.json({ message: 'Logout successful' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Send password reset email
   * @param req Express request
   * @param res Express response
   */
  public static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }
      
      await authService.forgotPassword(email);
      res.json({ message: 'Password reset email sent' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Reset password with token
   * @param req Express request
   * @param res Express response
   */
  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;
      
      if (!password) {
        res.status(400).json({ error: 'New password is required' });
        return;
      }
      
      await authService.resetPassword(password);
      res.json({ message: 'Password reset successful' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get current user data
   * @param req Express request
   * @param res Express response
   */
  public static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Verify authentication status
   * @param req Express request
   * @param res Express response
   */
  public static verify(req: Request, res: Response): void {
    res.json({ authenticated: true, user: (req as any).user });
  }
}
