/*
 * Socket.IO functionality tests for SyncDoc backend application
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
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import {
  documents,
  startServer,
  socketPort,
} from "./app";
import { Delta } from "./types";

// Test document ID to use throughout tests
const TEST_DOC_ID = "test-doc-" + Math.floor(Math.random() * 10000);

// Test setup
describe("Socket.IO Functionality Tests", () => {
  let clientSocketA: ClientSocket;
  let clientSocketB: ClientSocket;
  const serverUrl = `http://localhost:${socketPort}`;
  
  // Set up before all tests
  beforeAll(() => {
    // Start the server
    startServer();
  });
  
  // Clean up after all tests
  afterAll(() => {
    // Clean up test documents
    if (documents[TEST_DOC_ID]) {
      delete documents[TEST_DOC_ID];
    }
  });
  
  // Set up before each test
  beforeEach((done) => {
    // Create client sockets
    clientSocketA = ioClient(serverUrl);
    clientSocketB = ioClient(serverUrl);
    
    // Wait for sockets to connect
    let connected = 0;
    const onConnect = () => {
      connected++;
      if (connected === 2) done();
    };
    
    clientSocketA.on("connect", onConnect);
    clientSocketB.on("connect", onConnect);
  });
  
  // Clean up after each test
  afterEach(() => {
    // Disconnect client sockets
    if (clientSocketA.connected) {
      clientSocketA.disconnect();
    }
    if (clientSocketB.connected) {
      clientSocketB.disconnect();
    }
  });
  
  // Test: Connection
  test("Sockets should successfully connect to the server", () => {
    expect(clientSocketA.connected).toBe(true);
    expect(clientSocketB.connected).toBe(true);
  });
  
  // Test: Join Document
  test("Users should be able to join a document", (done) => {
    // First user joins the document
    clientSocketA.emit("join-document", TEST_DOC_ID, "User A");
    
    // Listen for load-document event on first client
    clientSocketA.once("load-document", (content) => {
      expect(content).toBeDefined();
      
      // Check if the user was added to the document
      expect(documents[TEST_DOC_ID]).toBeDefined();
      expect(Object.values(documents[TEST_DOC_ID].users)).toContain("User A");
      
      // Second user joins the document
      clientSocketB.emit("join-document", TEST_DOC_ID, "User B");
      
      // First user should receive user-joined notification
      clientSocketA.once("user-joined", (socketId, userName) => {
        expect(socketId).toBeDefined();
        expect(userName).toBe("User B");
        
        // Check if user list is updated
        clientSocketA.once("user-list", (userList) => {
          expect(Object.keys(userList).length).toBe(2);
          expect(Object.values(userList)).toContain("User B");
          done();
        });
      });
    });
  });
  
  // Test: Text Change
  test("Text changes should be synchronized between users", (done) => {
    const testDelta: Delta = { ops: [{ insert: "Hello, world!" }] };
    
    // Both users join the document
    clientSocketA.emit("join-document", TEST_DOC_ID, "User A");
    
    // Wait for user A to load the document
    clientSocketA.once("load-document", () => {
      clientSocketB.emit("join-document", TEST_DOC_ID, "User B");
      
      // Wait for user B to load the document
      clientSocketB.once("load-document", () => {
        // User A makes a text change
        clientSocketA.emit("text-change", TEST_DOC_ID, testDelta, "user", JSON.stringify({ ops: [{ insert: "Hello, world!" }] }));
        
        // User B should receive the text change
        clientSocketB.once("text-change", (delta, userId, content) => {
          expect(delta).toBeDefined();
          expect(delta.ops).toEqual(testDelta.ops);
          expect(userId).toBe(clientSocketA.id);
          expect(content).toBeDefined();
          
          // Check if the document content is updated
          expect(documents[TEST_DOC_ID].content).toBe(JSON.stringify({ ops: [{ insert: "Hello, world!" }] }));
          expect(documents[TEST_DOC_ID].deltas.length).toBeGreaterThan(0);
          
          done();
        });
      });
    });
  });
  
  // Test: Title Change
  test("Document title changes should be synchronized between users", (done) => {
    const newTitle = "Updated Test Document";
    
    // Both users join the document
    clientSocketA.emit("join-document", TEST_DOC_ID, "User A");
    
    // Wait for user A to load the document
    clientSocketA.once("load-document", () => {
      clientSocketB.emit("join-document", TEST_DOC_ID, "User B");
      
      // Wait for user B to load the document
      clientSocketB.once("load-document", () => {
        // User A changes the document title
        clientSocketA.emit("title-change", TEST_DOC_ID, newTitle);
        
        // User B should receive the title change
        clientSocketB.once("title-change", (title) => {
          expect(title).toBe(newTitle);
          
          // Check if the document title is updated
          expect(documents[TEST_DOC_ID].title).toBe(newTitle);
          
          done();
        });
      });
    });
  });
  
  // Test: Cursor Movement
  test("Cursor movements should be synchronized between users", (done) => {
    const cursorPosition = { index: 5, length: 3 };
    
    // Both users join the document
    clientSocketA.emit("join-document", TEST_DOC_ID, "User A");
    
    // Wait for user A to load the document
    clientSocketA.once("load-document", () => {
      clientSocketB.emit("join-document", TEST_DOC_ID, "User B");
      
      // Wait for user B to load the document
      clientSocketB.once("load-document", () => {
        // User A moves cursor
        clientSocketA.emit("cursor-move", TEST_DOC_ID, cursorPosition);
        
        // User B should receive cursor movement update
        clientSocketB.once("cursor-move", (userId, position) => {
          expect(userId).toBe(clientSocketA.id);
          expect(position).toEqual(cursorPosition);
          
          done();
        });
      });
    });
  });
  
  // Test: User Disconnection
  test("When a user disconnects, they should be removed from the document users list", (done) => {
    // Clear the document first to ensure a clean state
    if (documents[TEST_DOC_ID]) {
      delete documents[TEST_DOC_ID];
    }

    // Both users join the document
    clientSocketA.emit("join-document", TEST_DOC_ID, "User A");
    
    // Wait for user A to load the document
    clientSocketA.once("load-document", () => {
      clientSocketB.emit("join-document", TEST_DOC_ID, "User B");
      
      // Wait for user B to load the document
      clientSocketB.once("load-document", () => {
        // Verify initial state has both users
        expect(Object.keys(documents[TEST_DOC_ID].users).length).toBe(2);
        
        // Save User A's name for verification
        const userAName = documents[TEST_DOC_ID].users[clientSocketA.id];
        
        // Set up listener for user-left event
        clientSocketB.once("user-left", (socketId, userName) => {
          // Instead of checking the exact socketId (which can change), 
          // verify that a user left and their username matches
          expect(userName).toBe(userAName);
          
          // Wait for updated user list
          clientSocketB.once("user-list", (userList) => {
            expect(Object.keys(userList).length).toBe(1);
            expect(Object.values(userList)).not.toContain(userAName);
            
            done();
          });
        });
        
        // Disconnect user A
        clientSocketA.disconnect();
      });
    });
  });
  
  // Test: Multiple Changes
  test("Documents should track multiple changes correctly", (done) => {
    // Clear the document first to ensure a clean state
    if (documents[TEST_DOC_ID]) {
      delete documents[TEST_DOC_ID];
    }

    const firstDelta: Delta = { ops: [{ insert: "First change" }] };
    const secondDelta: Delta = { ops: [{ insert: "Second change" }] };
    
    // Both users join the document
    clientSocketA.emit("join-document", TEST_DOC_ID, "User A");
    
    // Wait for user A to load the document
    clientSocketA.once("load-document", () => {
      clientSocketB.emit("join-document", TEST_DOC_ID, "User B");
      
      // Wait for user B to load the document
      clientSocketB.once("load-document", () => {
        // Verify delta count starts at 0
        expect(documents[TEST_DOC_ID].deltas.length).toBe(0);
        
        // User A makes a text change
        clientSocketA.emit("text-change", TEST_DOC_ID, firstDelta, "user", JSON.stringify({ ops: [{ insert: "First change" }] }));
        
        // User B should receive the first text change
        clientSocketB.once("text-change", () => {
          // Verify delta count after first change
          expect(documents[TEST_DOC_ID].deltas.length).toBe(1);
          expect(documents[TEST_DOC_ID].deltas[0].delta.ops).toEqual(firstDelta.ops);
          
          // User B makes a text change
          clientSocketB.emit("text-change", TEST_DOC_ID, secondDelta, "user", JSON.stringify({ ops: [{ insert: "First changeSecond change" }] }));
          
          // User A should receive the second text change
          clientSocketA.once("text-change", () => {
            // Check if the document tracked both changes
            expect(documents[TEST_DOC_ID].deltas.length).toBe(2);
            expect(documents[TEST_DOC_ID].deltas[0].delta.ops).toEqual(firstDelta.ops);
            expect(documents[TEST_DOC_ID].deltas[1].delta.ops).toEqual(secondDelta.ops);
            
            done();
          });
        });
      });
    });
  });
});
