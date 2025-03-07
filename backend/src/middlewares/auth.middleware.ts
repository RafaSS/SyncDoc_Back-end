import { Request, Response, NextFunction } from 'express';
import { IUserService } from '../interfaces/user-service.interface';

// Add user property to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

export class AuthMiddleware {
  private userService: IUserService;

  constructor(userService: IUserService) {
    this.userService = userService;
  }

  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({ error: 'Authorization token is required' });
        return;
      }
      
      const user = await this.userService.validateToken(token);
      
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      
      // Add user to request
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  };

  // Optional authentication - doesn't require authentication but adds user to request if token is valid
  public optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const user = await this.userService.validateToken(token);
        
        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email
          };
        }
      }
      
      next();
    } catch (error) {
      next();
    }
  };

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }
}
