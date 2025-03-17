/*
 * SyncDoc Application - Built with Bun
 * Supabase Database Integration with Authentication
 */

import express from "express";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import * as http from "http";
import cors from "cors";
import { createServices } from "./config/service-factory";
import { Delta, DeltaChange } from "./interfaces/delta.interface";
import { authRoutes, documentRoutes, userRoutes } from "./routes";
import {
  isAuthenticated,
  hasDocumentPermission,
} from "./middleware/auth.middleware";
import { supabase } from "./config/supabase";

// Load the appropriate .env file based on the environment
const isTest = process.env.NODE_ENV === "test";
if (isTest) {
  console.log("Loading test environment configuration");
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

// Initialize services - simplified for testing
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
  services = createServices();
}

const { documentService, authService } = services;

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

let server: http.Server | null = null;
let io: Server;
let expressServer: http.Server | null = null;

// Export variables for testing
export { io, server, app as expressApp };

// In-memory cache of connected users (socketId -> document data)
const activeUsers: {
  [socketId: string]: { documentId: string; userName: string; userId?: string };
} = {};

const startServer = () => {
  if (server) return;

  // Create HTTP server for Socket.IO
  server = http.createServer();

  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://your-frontend-url.com",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization"],
      credentials: true,
    },
  });

  // Initialize socket handlers
  setupSocketHandlers();

  // Start the Socket.IO server
  server.listen(SOCKET_PORT, () => {
    console.log(`Socket.IO server running on port ${SOCKET_PORT}`);
  });

  // Start the Express server separately
  expressServer = app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });

  return server;
};

// Start the Express server separately for testing
export const startExpressServer = () => {
  if (expressServer) return expressServer;

  expressServer = app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });

  return expressServer;
};

const setupSocketHandlers = () => {
  if (!io) return;

  io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Authentication middleware for Socket.IO
    socket.use(async ([event, ...args], next) => {
      // Skip auth check during tests
      if (isTest) {
        return next();
      }

      // Skip auth for certain events
      if (event === "auth") {
        return next();
      }

      // Check token in handshake auth
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          return next(new Error("Invalid token"));
        }

        // Store user ID in the socket for later use
        (socket as any).userId = data.user.id;
        next();
      } catch (error) {
        next(new Error("Authentication error"));
      }
    });

    // Handle authentication
    socket.on(
      "auth",
      async (
        token: string,
        callback: (error: string | null, data?: any) => void
      ) => {
        try {
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data.user) {
            return callback("Invalid token");
          }

          // Store user ID in the socket
          (socket as any).userId = data.user.id;
          callback(null, { authenticated: true, userId: data.user.id });
        } catch (error: any) {
          callback(error.message || "Authentication error");
        }
      }
    );

    socket.on("join-document", async (documentId: string, userName: string) => {
      socket.join(documentId);

      // If authenticated, get the actual user data
      const userId = (socket as any).userId;

      // Store user in active users cache
      activeUsers[socket.id] = {
        documentId,
        userName,
        userId,
      };

      // Get document from database or create if it doesn't exist
      let document = await documentService.getDocumentById(documentId);

      if (!document) {
        // Create a new document if it doesn't exist
        const result = await documentService.createDocument();
        documentId = result.id;
        document = await documentService.getDocumentById(documentId);

        // Update room to the new document ID
        socket.leave(documentId);
        socket.join(documentId);
      }

      // Add user to document
      await documentService.addUserToDocument(
        documentId,
        socket.id,
        userName,
        userId
      );

      // Get the document content
      if (document && document.content) {
        socket.emit("load-document", document.content);
      } else {
        // If no content exists, send an empty delta
        socket.emit("load-document", JSON.stringify({ ops: [] }));
      }

      // Get users in the document
      const users = await documentService.getDocumentUsers(documentId);

      // Notify others that user joined
      socket.to(documentId).emit("user-joined", socket.id, userName);

      // Send updated user list to all clients in room
      io.to(documentId).emit("user-list", users);

      console.log(
        `User ${userName} (${
          userId || "anonymous"
        }) joined document ${documentId}`
      );
    });

    socket.on(
      "text-change",
      async (
        documentId: string,
        delta: Delta,
        source: string,
        content: string
      ) => {
        if (source !== "user" || !activeUsers[socket.id]) return;

        const userName = activeUsers[socket.id].userName;
        const userId = activeUsers[socket.id].userId;

        // Update document content in database
        await documentService.updateDocumentContent(
          documentId,
          content,
          delta,
          socket.id,
          userName,
          userId
        );

        // Send the delta to all other clients in the room
        socket.to(documentId).emit("text-change", delta, socket.id, content);

        console.log(
          `Document ${documentId} updated by ${userName || "unknown user"}`
        );
      }
    );

    socket.on("title-change", async (documentId: string, title: string) => {
      // Update title in database
      await documentService.updateDocumentTitle(documentId, title);

      // Broadcast title change to all clients
      io.to(documentId).emit("title-change", title);
    });

    socket.on("cursor-move", (documentId: string, cursorPosition: any) => {
      socket.to(documentId).emit("cursor-move", socket.id, cursorPosition);
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      // If user was in a document, remove them
      if (activeUsers[socket.id]) {
        const { documentId, userName } = activeUsers[socket.id];

        // Remove user from document in database
        await documentService.removeUserFromDocument(documentId, socket.id);

        // Get updated user list
        const users = await documentService.getDocumentUsers(documentId);

        // Notify room of user leaving
        io.to(documentId).emit("user-left", socket.id, userName);
        io.to(documentId).emit("user-list", users);

        // Clean up
        delete activeUsers[socket.id];

        console.log(`User ${userName} left document ${documentId}`);
      }
    });
  });
};

// Apply middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Enable CORS for all routes
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

// In non-test mode, start both servers automatically
if (!isTest) {
  startServer();
}

// Export the necessary modules and variables for testing
export { PORT, SOCKET_PORT, startServer, expressServer };
