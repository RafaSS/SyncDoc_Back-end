/*
 * SyncDoc Application - Built with Bun
 */

import express from "express";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import * as http from "http";
import cors from "cors";
import { Document, DocumentsCollection, Delta, DeltaChange } from "./types";

// Load the appropriate .env file based on the environment
const isTest = process.env.NODE_ENV === "test";
if (isTest) {
  console.log("Loading test environment configuration");
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

const app = express();

// Get allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ["*"];
console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);

// Get port from environment variable or use default
const PORT = process.env.PORT || 10000;

let server: http.Server | null = null;
let io: Server;
let expressServer: http.Server | null = null;

const startServer = () => {
  if (server) return;

  // Use the same server for both HTTP and Socket.IO
  server = http.createServer(app);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Initialize socket handlers
  setupSocketHandlers();

  // Start the combined server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  return server;
};

const documents: DocumentsCollection = {
  welcome: {
    title: "Welcome",
    content:
      "Welcome to SyncDoc! This is a collaborative document editor. Start typing to edit the document.",
    users: {},
    deltas: [],
  },
};

const setupSocketHandlers = () => {
  if (!io) return;

  io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    socket.on("join-document", (documentId: string, userName: string) => {
      socket.join(documentId);

      if (!documents[documentId]) {
        documents[documentId] = {
          title: "Untitled Document",
          content: "",
          users: {},
          deltas: [],
        };
      }

      documents[documentId].users[socket.id] = userName;

      // Send the document content to the client
      if (documents[documentId].content) {
        socket.emit("load-document", documents[documentId].content);
      } else {
        // If no content exists, send an empty delta
        socket.emit("load-document", JSON.stringify({ ops: [] }));
      }

      socket.to(documentId).emit("user-joined", socket.id, userName);

      io.to(documentId).emit("user-list", documents[documentId].users);

      console.log(
        `User ${
          documents[documentId].users[socket.id]
        } joined document ${documentId}`
      );
    });

    socket.on(
      "text-change",
      (documentId: string, delta: Delta, source: string, content: string) => {
        if (source !== "user") return;

        documents[documentId].content = content;

        // Create a new delta change record
        const deltaChange: DeltaChange = {
          delta,
          userId: socket.id,
          userName: documents[documentId].users[socket.id] || "Anonymous",
          timestamp: Date.now(),
        };

        // Add the delta to the document's delta array
        documents[documentId].deltas.push(deltaChange);

        // Send the delta directly without needing to stringify/parse on client
        socket.to(documentId).emit("text-change", delta, socket.id, content);

        console.log(
          `Document ${documentId} updated by ${
            documents[documentId]?.users[socket.id] || "unknown user"
          }`
        );
      }
    );

    socket.on("title-change", (documentId: string, title: string) => {
      documents[documentId].title = title;
      io.to(documentId).emit("title-change", title);
    });

    socket.on("cursor-move", (documentId: string, cursorPosition: any) => {
      socket.to(documentId).emit("cursor-move", socket.id, cursorPosition);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      Object.keys(documents).forEach((documentId) => {
        if (documents[documentId].users[socket.id]) {
          const userName = documents[documentId].users[socket.id];
          delete documents[documentId].users[socket.id];

          io.to(documentId).emit("user-left", socket.id, userName);
          io.to(documentId).emit("user-list", documents[documentId].users);

          console.log(`User ${userName} left document ${documentId}`);
        }
      });
    });
  });
};

// Apply middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Enable CORS for all routes
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// API Routes
app.get("/api/documents", (req, res) => {
  const documentList = Object.keys(documents).map((id) => ({
    id,
    title: documents[id].title,
    userCount: Object.keys(documents[id].users).length,
  }));

  res.json(documentList);
});

app.get("/api/documents/:id", (req, res) => {
  const { id } = req.params;

  if (!documents[id]) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Return document without sending all deltas to keep response size manageable
  res.json({
    id,
    title: documents[id].title,
    content: documents[id].content,
    userCount: Object.keys(documents[id].users).length,
    deltaCount: documents[id].deltas.length,
  });
});

app.get("/api/documents/:id/history", (req, res) => {
  const { id } = req.params;

  if (!documents[id]) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Return the deltas history for the document
  res.json({
    id,
    title: documents[id].title,
    deltas: documents[id].deltas,
  });
});

app.post("/api/documents", (req, res) => {
  const id = uuidv4();
  documents[id] = {
    title: "Untitled Document",
    content: "",
    users: {},
    deltas: [],
  };

  res.json({ id });
});

// In non-test mode, start both servers automatically
if (!isTest) {
  startServer();
}

// Export the necessary modules and variables
export {
  PORT,
  startServer,
  server,
  io,
  app as expressApp,
  documents,
};
