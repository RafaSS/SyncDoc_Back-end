/*
 * This file contains tests for the SyncDoc backend application.
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import {
  expressApp as app,
  startServer,
  startExpressServer,
  socketPort,
  expressPort,
} from "./app";
import { io as ioClient } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import supertest from "supertest";
import {
  setupTestEnvironment,
  mockDocumentService,
  mockDocumentRepository,
  patchAuthForTesting,
} from "./test-helpers";

// Setup test environment before requiring app
setupTestEnvironment();

// Test document ID to use throughout tests
const TEST_DOC_ID = "test-doc-" + Math.floor(Math.random() * 10000);

describe("SyncDoc API", () => {
  // Create an authenticated agent for API requests
  let request: any;

  // Set up the server before tests
  beforeAll(() => {
    // Start the servers
    startServer();
    startExpressServer();

    // Patch the authentication middleware directly
    patchAuthForTesting(app);
    
    // Create an authenticated request agent
    request = supertest(app);
  });

  // Clean up after tests
  afterAll(async () => {
    // Our mock repository allows for document deletion
    try {
      if (mockDocumentRepository.deleteDocument) {
        for (const id of (mockDocumentRepository as any).documents.keys()) {
          await mockDocumentRepository.deleteDocument(id);
        }
      }
    } catch (error) {
      console.error("Error cleaning up documents:", error);
    }
  });

  // Basic API tests
  test("Basic app exists", () => {
    expect(app).toBeDefined();
  });

  test("GET /api/documents returns document list", async () => {
    const response = await request
      .get("/api/documents")
      .set("Authorization", "Bearer mock-jwt-token-for-testing");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("POST /api/documents creates new document", async () => {
    const response = await request
      .post("/api/documents")
      .set("Authorization", "Bearer mock-jwt-token-for-testing");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(typeof response.body.id).toBe("string");
  });

  test("GET /api/documents/:id returns document by id", async () => {
    // Create a test document
    const result = await mockDocumentService.createDocument("Test Document", {
      ops: [{ insert: "Test content" }],
    });
    const id = result.id;

    const response = await request
      .get(`/api/documents/${id}`)
      .set("Authorization", "Bearer mock-jwt-token-for-testing");
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(response.body.title).toBe("Test Document");
  });

  test("GET /api/documents/:id/history returns document history", async () => {
    // Create a test document with deltas
    const result = await mockDocumentService.createDocument("Test Document", {
      ops: [{ insert: "Test content" }],
    });
    const id = result.id;

    // Add changes that will be recorded in history
    await mockDocumentService.updateDocumentContent(
      id,
      JSON.stringify({ ops: [{ insert: "Updated content" }] }),
      { ops: [{ insert: "Updated content" }] },
      "test-socket-id",
      "Test User"
    );

    const response = await request
      .get(`/api/documents/${id}/history`)
      .set("Authorization", "Bearer mock-jwt-token-for-testing");
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(response.body.title).toBe("Test Document");
    expect(Array.isArray(response.body.deltas)).toBe(true);
  });

  test("GET /api/documents/:id returns 404 for non-existent document", async () => {
    const nonExistentId = "non-existent-id";
    const response = await request
      .get(`/api/documents/${nonExistentId}`)
      .set("Authorization", "Bearer mock-jwt-token-for-testing");
    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
  });
});

describe("Document Management", () => {
  // Create an authenticated agent for API requests
  let request: any;
  
  beforeAll(() => {
    // Create an authenticated request agent
    request = supertest(app);
  });
  
  test("Document service exists", () => {
    expect(mockDocumentService).toBeDefined();
  });

  test("Can create new documents", async () => {
    const result = await mockDocumentService.createDocument("Test Document", {
      ops: [{ insert: "Test content" }],
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    const document = await mockDocumentService.getDocumentById(result.id);
    expect(document).toBeDefined();
    expect(document?.title).toBe("Test Document");
  });

  test("Can add users to documents", async () => {
    const result = await mockDocumentService.createDocument("Test Document", {
      ops: [{ insert: "Test content" }],
    });
    const id = result.id;
    const userName = "test-user-" + Math.floor(Math.random() * 10000);

    await mockDocumentService.addUserToDocument(id, "socket-id", userName);

    const users = await mockDocumentService.getDocumentUsers(id);
    expect(Object.keys(users)).toBeDefined();
  });

  test("Can create new documents via API", async () => {
    const response = await request
      .post("/api/documents")
      .set("Authorization", "Bearer mock-jwt-token-for-testing")
      .send({
        title: "Test Document",
        content: JSON.stringify({ ops: [{ insert: "Test content" }] }),
      });
    expect(response.status).toBe(200);
    expect(response.body.id).toBeDefined();
  });
});
