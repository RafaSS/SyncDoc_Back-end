import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
const { expect, test, describe, beforeAll, afterAll } = require("bun:test");
describe("WebSocket Server", () => {
    let io;
    let clientSocket = null;
    beforeAll(() => {
        // Start the server
        io = new Server(3001, {
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
        clientSocket = Client("ws://localhost:3001");
        await new Promise((resolve) => {
            if (!clientSocket) {
                throw new Error("Failed to create client socket");
            }
            // Using non-null assertion operator since we've verified it's not null
            const socket = clientSocket;
            socket.on("connect", () => {
                expect(socket.connected).toBe(true);
                resolve();
            });
        });
    });
    test("should receive broadcast messages", async () => {
        if (!clientSocket) {
            throw new Error("Client socket is not initialized");
        }
        const testMessage = "Broadcasting to multiple clients";
        const socket = clientSocket; // Non-null assertion
        await new Promise((resolve) => {
            socket.on("message", (data) => {
                expect(data).toBe(testMessage);
                resolve();
            });
            socket.emit("message", testMessage);
        });
    });
    test("should handle multiple clients", async () => {
        if (!clientSocket) {
            throw new Error("Client socket is not initialized");
        }
        const socket = clientSocket; // Non-null assertion
        const client2 = Client("ws://localhost:3001");
        const testMessage = "Broadcasting to multiple clients";
        await new Promise((resolve) => {
            let receivedCount = 0;
            const messageHandler = (data) => {
                expect(data).toBe(testMessage);
                receivedCount++;
                if (receivedCount === 2) {
                    client2.close();
                    resolve();
                }
            };
            socket.on("message", messageHandler);
            client2.on("message", messageHandler);
            // Wait for client2 to connect before sending message
            client2.on("connect", () => {
                socket.emit("message", testMessage);
            });
        });
    });
});
