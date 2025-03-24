//app.ts
/*
 * SyncDoc Application - Built with Bun
 * Supabase Database Integration with Authentication
 */

import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import * as http from "http";
import cors from "cors";
import { createServices } from "./config/service-factory";
import { authRoutes, documentRoutes, userRoutes } from "./routes";

// Load the appropriate .env file based on the environment
const isTest = process.env.NODE_ENV === "test";
if (isTest) {
  console.log("Loading test environment configuration");
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

// Initialize services - simplified for testing
const { socketService } = createServices();
let services;
if (isTest) {
  // Explicitly require and use createMockServices
  const testHelpers = require("./test-helpers");
  // Call setupTestEnvironment to ensure the patching is done
  if (testHelpers.setupTestEnvironment) {
    testHelpers.setupTestEnvironment();
  }
  services = testHelpers.createMockServices();
} else {
  // socketService.setupSocketHandlers();
}

const app = express();

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["*"];
console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);

// Get port from environment variable or use default
const PORT = isTest ? process.env.TEST_PORT || 3003 : process.env.PORT || 3000;
const SOCKET_PORT = isTest
  ? process.env.TEST_SOCKET_PORT || 3002
  : process.env.SOCKET_PORT || 3001;

// Export ports for testing
export const expressPort = PORT;
export const socketPort = SOCKET_PORT;

// Get or create the socket.io server
let server: http.Server | null = null;
let expressServer: http.Server | null = null;

// Export variables for testing
export { server, app as expressApp };

// In-memory cache of connected users (socketId -> document data)
const activeUsers: {
  [socketId: string]: { documentId: string; userName: string; userId?: string };
} = {};

// Start the Express server separately for testing
export const startExpressServer = () => {
  if (expressServer) return expressServer;

  expressServer = app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });

  return expressServer;
};
// Start the Socket.IO server
const startServer = () => {
  if (server) return server;

  // Get the HTTP server that Socket.IO is using
  server = (socketService as any).io.httpServer || http.createServer();

  // Initialize socket handlers (if not already initialized)
  // socketService.setupSocketHandlers();
  console.log("🚀 Socket handlers initialized");

  // Start the Socket.IO server
  server?.listen(SOCKET_PORT, () => {
    console.log(`Socket.IO server running on port ${SOCKET_PORT}`);
  });

  // // Start the Express server separately
  // expressServer = app.listen(PORT, () => {
  //   console.log(`Express server running on port ${PORT}`);
  // });

  return server;
};

// All the socket handler code is now in the SocketService class
// Keep the commented out section as reference

// Apply middleware
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser(process.env.COOKIE_SECRET));

// Enable CORS for all routes
app.use(
  cors({
    // origin: allowedOrigins,
    // credentials: true,
  })
);

// Authentication Routes
app.use("/api/auth", authRoutes);

// API Routes
app.use("/api/documents", documentRoutes);
app.use("/api/users", userRoutes);

// In non-test mode, start both servers automatically
if (!isTest) {
  startServer();
}

// Export the necessary modules and variables for testing
export { PORT, SOCKET_PORT, startServer, expressServer };
