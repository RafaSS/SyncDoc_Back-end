import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

interface BunTest {
  expect: any;
  test: any;
  describe: any;
  beforeAll: any;
  afterAll: any;
}

const { expect, test, describe, beforeAll, afterAll } = require("bun:test") as BunTest;

describe("WebSocket Server", () => {
  let io: Server;
  let clientSocket: any;
  const TEST_PORT = 3002;
  
  beforeAll(() => {
    io = new Server(TEST_PORT, {
      cors: {
        origin: "*"
      }
    });

    io.on("connection", (socket) => {
      socket.on("message", (data) => {
        io.emit("message", data);
      });
    });
  });

  afterAll(() => {
    io.close();
    if (clientSocket) {
      clientSocket.close();
    }
  });

  test("should connect to the WebSocket server", async () => {
    clientSocket = Client(`http://localhost:${TEST_PORT}`);
    
    await new Promise<void>((resolve) => {
      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        resolve();
      });
    });
  });

  test("should receive broadcast messages", async () => {
    const testMessage = "Broadcasting to multiple clients";
    
    await new Promise<void>((resolve) => {
      clientSocket.on("message", (data: string) => {
        expect(data).toBe(testMessage);
        resolve();
      });
      
      clientSocket.emit("message", testMessage);
    });
  });

  test("should handle multiple clients", async () => {
    const client2 = Client(`http://localhost:${TEST_PORT}`);
    const testMessage = "Broadcasting to multiple clients";
    
    await new Promise<void>((resolve) => {
      let receivedCount = 0;
      const messageHandler = (data: string) => {
        expect(data).toBe(testMessage);
        receivedCount++;
        if (receivedCount === 2) {
          client2.close();
          resolve();
        }
      };

      clientSocket.on("message", messageHandler);
      client2.on("message", messageHandler);
      
      client2.on("connect", () => {
        clientSocket.emit("message", testMessage);
      });
    });
  });
});
