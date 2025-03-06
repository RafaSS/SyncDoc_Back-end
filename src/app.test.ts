/*
 * This file contains tests for the SyncDoc application.
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
  documents,
  startServer,
  startExpressServer,
  socketPort,
  expressPort,
} from "./app";
import { io as ioClient } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import supertest from "supertest";
import { Document } from "./types";

// Set test environment
process.env.NODE_ENV = "test";

// Test document ID to use throughout tests
const TEST_DOC_ID = "test-doc-" + Math.floor(Math.random() * 10000);

describe("SyncDoc API", () => {
  // Set up the server before tests
  beforeAll(() => {
    // Start the servers
    startServer();
    startExpressServer();
  });

  // Close the server after tests
  afterAll(() => {
    // Clean up any test documents
    if (documents[TEST_DOC_ID]) {
      delete documents[TEST_DOC_ID];
    }
  });

  // Basic API tests
  test("Basic app exists", () => {
    expect(app).toBeDefined();
  });

  test("GET /api/documents returns document list", async () => {
    const response = await supertest(app).get("/api/documents");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("POST /api/documents creates new document", async () => {
    const response = await supertest(app).post("/api/documents");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(typeof response.body.id).toBe("string");
  });

  test("GET /api/documents/:id returns document by id", async () => {
    // Create a test document
    const id = uuidv4();
    documents[id] = {
      title: "Test Document",
      content: "Test content",
      users: {},
      deltas: [],
    };

    const response = await supertest(app).get(`/api/documents/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(response.body.title).toBe("Test Document");
    expect(response.body.content).toBe("Test content");
    
    // Clean up
    delete documents[id];
  });

  test("GET /api/documents/:id/history returns document history", async () => {
    // Create a test document with deltas
    const id = uuidv4();
    documents[id] = {
      title: "Test Document",
      content: "Test content",
      users: {},
      deltas: [{
        delta: { ops: [{ insert: "Test content" }] },
        userId: "test-user",
        userName: "Test User",
        timestamp: Date.now()
      }],
    };

    const response = await supertest(app).get(`/api/documents/${id}/history`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(response.body.title).toBe("Test Document");
    expect(Array.isArray(response.body.deltas)).toBe(true);
    expect(response.body.deltas.length).toBe(1);
    
    // Clean up
    delete documents[id];
  });

  test("GET /api/documents/:id returns 404 for non-existent document", async () => {
    const nonExistentId = "non-existent-id";
    const response = await supertest(app).get(`/api/documents/${nonExistentId}`);
    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
  });
});

describe("Document Management", () => {
  test("Documents object exists", () => {
    expect(documents).toBeDefined();
    expect(documents.welcome).toBeDefined();
  });

  test("Can add new documents", () => {
    const id = uuidv4();
    documents[id] = {
      title: "Test Document",
      content: "Test content",
      users: {},
      deltas: [],
    };

    expect(documents[id]).toBeDefined();
    expect(documents[id].content).toBe("Test content");
    
    // Clean up
    delete documents[id];
  });

  test("Can add users to documents", () => {
    const id = uuidv4();
    const userId = "test-user-" + Math.floor(Math.random() * 10000);

    documents[id] = {
      title: "Test Document",
      content: "",
      users: {},
      deltas: [],
    };

    documents[id].users["socket-id"] = userId;

    expect(Object.keys(documents[id].users).length).toBe(1);
    expect(documents[id].users["socket-id"]).toBe(userId);
    
    // Clean up
    delete documents[id];
  });

  test("Can create new documents via API", async () => {
    const response = await supertest(app).post("/api/documents").send({
      title: "Test Document",
      content: "Test content",
      users: {},
    });
    expect(response.status).toBe(200);
    expect(response.body.id).toBeDefined();
    
    // Clean up
    if (response.body.id) {
      delete documents[response.body.id];
    }
  });
});
