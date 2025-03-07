import { IAuthResponse, IUser, IUserCredentials, IUserRegistration } from '../interfaces/user.interface';
import { IUserService } from '../interfaces/user-service.interface';
import { UserRepository } from '../models/repositories/user.repository';
import { v4 as uuidv4 } from 'uuid';

export class UserService implements IUserService {
  private userRepository: UserRepository;
  private tokenStorage: Map<string, string> = new Map(); // Simple in-memory token storage (userId -> token)

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  public async register(userData: IUserRegistration): Promise<IAuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = await this.userRepository.create({
      username: userData.username,
      email: userData.email,
      password: userData.password, // In a real app, we would hash the password
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate token
    const token = this.generateToken();
    this.tokenStorage.set(user.id, token);

    // Return user without password and token
    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  }

  public async login(credentials: IUserCredentials): Promise<IAuthResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password (in a real app, we would compare hashed passwords)
    if (user.password !== credentials.password) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken();
    this.tokenStorage.set(user.id, token);

    // Return user without password and token
    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  }

  public async getUserById(id: string): Promise<Omit<IUser, 'password'> | null> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      return null;
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  public async updateUser(
    id: string, 
    userData: Partial<Omit<IUser, 'id' | 'password'>>
  ): Promise<Omit<IUser, 'password'> | null> {
    const updatedUser = await this.userRepository.update(id, userData);
    if (!updatedUser) {
      return null;
    }

    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  public async deleteUser(id: string): Promise<boolean> {
    // Remove user token
    this.tokenStorage.delete(id);
    return this.userRepository.delete(id);
  }

  public async validateToken(token: string): Promise<Omit<IUser, 'password'> | null> {
    // Find user ID by token
    let userId: string | null = null;
    
    for (const [id, storedToken] of this.tokenStorage.entries()) {
      if (storedToken === token) {
        userId = id;
        break;
      }
    }

    if (!userId) {
      return null;
    }

    // Get user by ID
    return this.getUserById(userId);
  }

  private generateToken(): string {
    // In a real app, we would use JWT or another proper token system
    return uuidv4();
  }
}
