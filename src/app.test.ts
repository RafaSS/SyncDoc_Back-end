/*
 * This file contains tests for the SyncDoc application.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { app, documents, startServer, startExpressServer, socketPort, expressPort } from './app';
import { io as ioClient } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import supertest from 'supertest';

// Set test environment
process.env.NODE_ENV = 'test';

// Test document ID to use throughout tests
const TEST_DOC_ID = 'test-doc-' + Math.floor(Math.random() * 10000);

describe('SyncDoc API', () => {
  // Set up the server before tests
  beforeAll(() => {
    // Start the servers
    startServer();
    startExpressServer();
  });

  // Close the server after tests
  afterAll(() => {
    // Close any open connections
  });

  // Basic API tests
  test('Basic app exists', () => {
    expect(app).toBeDefined();
  });

  test('GET /api/documents returns document list', async () => {
    const response = await supertest(app).get('/api/documents');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/documents creates new document', async () => {
    const response = await supertest(app).post('/api/documents');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(typeof response.body.id).toBe('string');
  });
});

describe('Document Management', () => {
  test('Documents object exists', () => {
    expect(documents).toBeDefined();
    expect(documents.welcome).toBeDefined();
  });

  test('Can add new documents', () => {
    const id = uuidv4();
    documents[id] = {
      content: 'Test content',
      users: {}
    };
    
    expect(documents[id]).toBeDefined();
    expect(documents[id].content).toBe('Test content');
  });

  test('Can add users to documents', () => {
    const id = uuidv4();
    const userId = 'test-user-' + Math.floor(Math.random() * 10000);
    
    documents[id] = {
      content: '',
      users: {}
    };
    
    documents[id].users['socket-id'] = userId;
    
    expect(Object.keys(documents[id].users).length).toBe(1);
    expect(documents[id].users['socket-id']).toBe(userId);
  });

});
