import { Request, Response } from 'express';
import { IUserService } from '../interfaces/user-service.interface';

export class UserController {
  private userService: IUserService;

  constructor(userService: IUserService) {
    this.userService = userService;
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }
      
      const result = await this.userService.register({ username, email, password });
      res.status(201).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      res.status(400).json({ error: errorMessage });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }
      
      const result = await this.userService.login({ email, password });
      res.status(200).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      res.status(401).json({ error: errorMessage });
    }
  };

  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // User is already authenticated via middleware and added to request
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.status(200).json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };

  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { username, email } = req.body;
      const updatedUser = await this.userService.updateUser(userId, { username, email });
      
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };

  public deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const success = await this.userService.deleteUser(userId);
      
      if (!success) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };
}
