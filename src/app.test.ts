/*
 * This file contains tests for the SyncDoc application.
 * Uncomment the tests as you implement the corresponding functionality.
 */

import request from 'supertest';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
 import io, { Socket } from 'socket.io-client';
import { app, httpServer } from './app';

let clientSocket: typeof Socket;
let server: HttpServer;
let ioServer: SocketIOServer;

// Helper function to create a socket.io client that connects to our server
const createSocketClient = (): Promise<typeof Socket> => {
  return new Promise((resolve) => {
    const socket = io(`http://localhost:${process.env.PORT || 3000}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    socket.on('connect', () => {
      resolve(socket);
    });
  });
};

describe('SyncDoc Server', () => {
  // Set up server before tests
  beforeAll((done) => {
    server = httpServer;
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : 3000;
      process.env.PORT = port?.toString();
      done();
    });
  });

  // Clean up after tests
  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    server.close(done);
  });

  // Test API endpoints
  describe('API Endpoints', () => {
    /*
    test('GET / should serve the index.html file', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/html');
    });

    test('GET /api/documents should return a list of documents', async () => {
      const response = await request(app).get('/api/documents');
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    test('POST /api/documents should create a new document', async () => {
      const response = await request(app).post('/api/documents');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
    */
  });

  // Test Socket.IO functionality
  describe('Socket.IO', () => {
    /*
    beforeEach(async () => {
      clientSocket = await createSocketClient();
    });

    afterEach(() => {
      if (clientSocket) {
        clientSocket.disconnect();
      }
    });

    test('should connect to Socket.IO server', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('should join a document', (done) => {
      clientSocket.emit('join-document', 'test-document', 'test-user');
      clientSocket.on('load-document', (content) => {
        expect(content).toBeDefined();
        done();
      });
    });

    test('should broadcast text changes to other users', (done) => {
      // Create two clients
      const clientA = clientSocket;
      createSocketClient().then((clientB) => {
        // Both clients join the same document
        const documentId = 'test-document-' + Date.now();
        clientA.emit('join-document', documentId, 'user-A');
        clientB.emit('join-document', documentId, 'user-B');

        // Set up clientB to listen for text changes
        clientB.on('text-change', (delta, userId) => {
          expect(delta).toBeDefined();
          expect(userId).toBe(clientA.id);
          clientB.disconnect();
          done();
        });

        // Wait for both clients to join
        setTimeout(() => {
          // ClientA makes a change
          const delta = JSON.stringify({ ops: [{ insert: 'Hello, World!' }] });
          clientA.emit('text-change', documentId, delta, 'user');
        }, 100);
      });
    });

    test('should notify when users join and leave', (done) => {
      // Create two clients
      const clientA = clientSocket;
      createSocketClient().then((clientB) => {
        // ClientA joins first
        const documentId = 'test-document-' + Date.now();
        clientA.emit('join-document', documentId, 'user-A');

        // Set up clientA to listen for user-joined event
        clientA.on('user-joined', (socketId, userName) => {
          expect(socketId).toBe(clientB.id);
          expect(userName).toBe('user-B');

          // Now test user-left event
          clientA.on('user-left', (leftSocketId, leftUserName) => {
            expect(leftSocketId).toBe(clientB.id);
            expect(leftUserName).toBe('user-B');
            done();
          });

          // Disconnect clientB to trigger user-left event
          clientB.disconnect();
        });

        // ClientB joins after clientA
        setTimeout(() => {
          clientB.emit('join-document', documentId, 'user-B');
        }, 100);
      });
    });
    */
  });

  // Test Document Management
  describe('Document Management', () => {
    /*
    test('should create a new document with empty content', async () => {
      const response = await request(app).post('/api/documents');
      const documentId = response.body.id;
      
      // Get the document list to verify it exists
      const listResponse = await request(app).get('/api/documents');
      const documentExists = listResponse.body.some((doc: any) => doc.id === documentId);
      expect(documentExists).toBe(true);
    });

    test('should update document content when users make changes', (done) => {
      // Create a new document
      request(app).post('/api/documents').then((response) => {
        const documentId = response.body.id;
        
        // Connect to Socket.IO and join the document
        createSocketClient().then((client) => {
          client.emit('join-document', documentId, 'test-user');
          
          // Make a change to the document
          const delta = JSON.stringify({ ops: [{ insert: 'Test content' }] });
          client.emit('text-change', documentId, delta, 'user');
          
          // Connect with another client to verify the content
          createSocketClient().then((client2) => {
            client2.emit('join-document', documentId, 'test-user-2');
            
            client2.on('load-document', (content) => {
              expect(JSON.parse(content)).toEqual({ ops: [{ insert: 'Test content' }] });
              client.disconnect();
              client2.disconnect();
              done();
            });
          });
        });
      });
    });
    */
  });
});
