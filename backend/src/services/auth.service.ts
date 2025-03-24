import { AuthRepository } from "../repositories/auth.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  IAuthResponse,
  IUserCredentials,
  IUserRegistration,
} from "../interfaces/user.interface";

/**
 * Service for authentication related operations
 */
export class AuthService {
  private authRepository: AuthRepository;
  private userRepository: UserRepository;

  /**
   * Create a new AuthService
   * @param authRepository Repository for auth operations
   * @param userRepository Repository for user operations
   */
  constructor(authRepository: AuthRepository, userRepository: UserRepository) {
    this.authRepository = authRepository;
    this.userRepository = userRepository;
  }

  /**
   * Register a new user
   * @param userData User registration data
   * @returns Authentication response with user and token
   */
  async register(userData: IUserRegistration): Promise<IAuthResponse> {
    return this.authRepository.register(userData);
  }

  /**
   * Login a user
   * @param credentials User credentials
   * @returns Authentication response with user and token
   */
  async login(credentials: IUserCredentials): Promise<IAuthResponse> {
    return this.authRepository.login(credentials);
  }

  /**
   * Logout current user
   * @returns True if logout was successful
   */
  async logout(): Promise<boolean> {
    return this.authRepository.logout();
  }

  /**
   * Verify a JWT token
   * @param token JWT token
   * @returns User ID if token is valid, null otherwise
   */
  async verifyToken(token: string): Promise<string | null> {
    return this.authRepository.verifyToken(token);
  }

  /**
   * Send password reset email
   * @param email User email
   * @returns True if email was sent successfully
   */
  async forgotPassword(email: string): Promise<boolean> {
    return this.authRepository.forgotPassword(email);
  }

  /**
   * Reset user password with token
   * @param newPassword New password
   * @returns True if password was reset successfully
   */
  async resetPassword(newPassword: string): Promise<boolean> {
    return this.authRepository.resetPassword(newPassword);
  }

  /**
   * Get current logged in user
   * @returns User data if logged in, null otherwise
   */
  async getCurrentUser(): Promise<Omit<
    IAuthResponse["user"],
    "password"
  > | null> {
    return this.authRepository.getCurrentUser();
  }
}
