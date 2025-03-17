import { MockDocumentRepository } from './src/repositories/mock-document.repository';
import { DocumentService } from './src/services/document.service';
import { UserRepository } from './src/repositories/user.repository';

/**
 * These functions patch the app to use mock repositories for testing.
 * They should be called before running tests.
 */

// Global mock repositories
export const mockDocumentRepository = new MockDocumentRepository();
export const userRepository = new UserRepository();

// Global mock services
export const mockDocumentService = new DocumentService(
  mockDocumentRepository as any,
  userRepository
);

/**
 * Function to patch service-factory to use mock repositories
 */
export function patchServiceFactory() {
  // Dynamically replace the imported module with our mock
  const serviceFactoryPath = require.resolve('./src/config/service-factory');
  delete require.cache[serviceFactoryPath];
  
  // Replace the existing module with our mock implementation
  require.cache[serviceFactoryPath] = {
    id: serviceFactoryPath,
    filename: serviceFactoryPath,
    loaded: true,
    exports: {
      createServices: () => {
        return {
          documentService: mockDocumentService,
          authService: {} // Add mock implementations as needed
        };
      }
    }
  };
}

// Call this function at the beginning of each test file
export function setupTestEnvironment() {
  // Set environment variables
  process.env.NODE_ENV = 'test';
  
  // Patch the service factory
  patchServiceFactory();
}
