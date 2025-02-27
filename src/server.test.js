import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { io as Client } from "socket.io-client";
import { Server } from "socket.io";

describe("WebSocket Server", () => {
  let io;
  let clientSocket;
  const TEST_PORT = 3001;

  beforeAll(() => {
    // Start a test server
    io = new Server(TEST_PORT, {
      cors: {
        origin: "*"
      }
    });

    // Set up server event handlers
    io.on("connection", (socket) => {
      socket.on("message", (data) => {
        io.emit("message", data);
      });
    });
  });

  afterAll(() => {
    // Clean up
    io.close();
    if (clientSocket) {
      clientSocket.close();
    }
  });

  test("should connect to the WebSocket server", async () => {
    clientSocket = Client(`http://localhost:${TEST_PORT}`);
    
    await new Promise((resolve) => {
      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        resolve();
      });
    });
  });

  test("should receive broadcast messages", async () => {
    const testMessage = "Broadcasting to multiple clients";
    
    await new Promise((resolve) => {
      clientSocket.on("message", (data) => {
        expect(data).toBe(testMessage);
        resolve();
      });
      
      clientSocket.emit("message", testMessage);
    });
  });

  test("should handle multiple clients", async () => {
    const client2 = Client(`http://localhost:${TEST_PORT}`);
    const testMessage = "Broadcasting to multiple clients";
    
    await new Promise((resolve) => {
      let receivedCount = 0;
      
      const messageHandler = (data) => {
        expect(data).toBe(testMessage);
        receivedCount++;
        
        // When both clients receive the message, we're done
        if (receivedCount === 2) {
          resolve();
        }
      };
      
      clientSocket.on("message", messageHandler);
      client2.on("message", messageHandler);
      
      // Wait for client2 to connect before sending message
      client2.on("connect", () => {
        clientSocket.emit("message", testMessage);
      });
    });
    
    client2.close();
  });
});
