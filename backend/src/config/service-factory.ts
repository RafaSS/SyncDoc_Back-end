import { DocumentService } from '../services/document.service';
import { DocumentRepository } from '../repositories/document.repository';
import { UserRepository as SupabaseUserRepository } from '../repositories/user.repository';
import { UserRepository as LegacyUserRepository } from '../models/repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

/**
 * Factory function to create and initialize all services
 * @returns Object containing all initialized services
 */
export function createServices() {
  // Initialize repositories
  const documentRepository = new DocumentRepository();
  const supabaseUserRepository = new SupabaseUserRepository();
  const legacyUserRepository = new LegacyUserRepository();
  const authRepository = new AuthRepository();

  // Initialize services
  const documentService = new DocumentService(documentRepository, supabaseUserRepository);
  const authService = new AuthService(authRepository, supabaseUserRepository);
  const userService = new UserService(legacyUserRepository);

  return {
    documentService,
    authService,
    userService
  };
}
