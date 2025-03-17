// Let's update the test-helpers.ts file with a more robust solution
import { Express, Request, Response, NextFunction } from "express";
import { MockDocumentRepository } from "./repositories/mock-document.repository";
import { DocumentService } from "./services/document.service";
import { UserRepository } from "./repositories/user.repository";
import supertest from "supertest";

/**
 * Helper functions and mock objects for testing
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
 * Mock implementation of service factory for testing
 */
export function createMockServices() {
  return {
    documentService: mockDocumentService,
    authService: {}, // Add mock implementations as needed
  };
}

/**
 * Setup the test environment
 */
export function setupTestEnvironment() {
  // Set environment variables
  process.env.NODE_ENV = "test";
  console.log("Test environment set up with mock services");
}

/**
 * Creates an authenticated supertest agent for testing protected routes
 */
export function createAuthenticatedAgent(app: Express) {
  // Create a supertest agent with the auth token
  return supertest(app)
    .set("Authorization", "Bearer mock-jwt-token-for-testing");
}

/**
 * Patches the app's auth middleware for testing
 * This is a more direct approach than using a separate middleware
 */
export function patchAuthForTesting(app: Express) {
  // Directly override auth middleware handlers
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer: any) => {
      // Check for route middleware
      if (layer.route) {
        layer.route.stack.forEach((handler: any) => {
          // Replace any auth-related middleware
          if (
            handler.name === "authenticate" ||
            handler.name.includes("auth") ||
            handler.name === "verifyToken" ||
            handler.name === "checkAuth" ||
            handler.name === "requireAuth"
          ) {
            handler.handle = mockAuthFunction;
          }
        });
      }
      // Check for application middleware
      else if (
        layer.name === "authenticate" ||
        layer.name.includes("auth") ||
        layer.name === "verifyToken" ||
        layer.name === "checkAuth" ||
        layer.name === "requireAuth" ||
        (layer.handle &&
          typeof layer.handle === "function" &&
          (layer.handle.name === "authenticate" ||
            layer.handle.name.includes("auth") ||
            layer.handle.name === "verifyToken"))
      ) {
        layer.handle = mockAuthFunction;
      }
    });
  }
}

// Extract the mock auth function to make the code cleaner
function mockAuthFunction(req: any, res: any, next: Function) {
  req.user = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
  };
  next();
}
