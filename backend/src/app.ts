// Modify your app.ts to use a single server:

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

// Initialize Express app
const app = express();

// Create a single HTTP server
const server = http.createServer(app);

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [
      "https://sync-doc.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
    ];
console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);

// Get port from environment variable or use default
const PORT = isTest ? process.env.TEST_PORT || 3003 : process.env.PORT || 3001;

// Export port for testing
export const expressPort = PORT;

// Export server and app for testing
export { server, app as expressApp };

// Initialize services with the HTTP server
const { socketService } = createServices(server);

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
  // Initialize Socket.IO with the HTTP server
  // socketService.setupSocketHandlers(server);
}

// In-memory cache of connected users (socketId -> document data)
const activeUsers: {
  [socketId: string]: { documentId: string; userName: string; userId?: string };
} = {};

// Start the single server
const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (Express & Socket.IO)`);
  });
  return server;
};

// Apply middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Authentication Routes
app.use("/api/auth", authRoutes);

// API Routes
app.use("/api/documents", documentRoutes);
app.use("/api/users", userRoutes);

// In non-test mode, start the server automatically
if (!isTest) {
  startServer();
}

// Export the necessary modules and variables for testing
export { PORT, startServer };
