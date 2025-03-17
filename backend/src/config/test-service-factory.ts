import { DocumentService } from '../services/document.service';
import { MockDocumentRepository } from '../repositories/mock-document.repository';
import { UserRepository } from '../repositories/user.repository';

/**
 * Create services for testing
 * This function creates mock services that don't depend on Supabase
 */
export function createTestServices() {
  const mockDocumentRepository = new MockDocumentRepository();
  const userRepository = new UserRepository();
  
  return {
    documentService: new DocumentService(mockDocumentRepository as any, userRepository),
    documentRepository: mockDocumentRepository
  };
}
