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
import { Document, DocumentsCollection, Delta, DeltaChange } from "./types";

dotenv.config();

const app = express();

const isTest = process.env.NODE_ENV === "test";
const socketPort = isTest ? 3002 : process.env.PORT || 3000;
const expressPort = isTest ? 3003 : process.env.EXPRESS_PORT || 3001;

let server: any = null;
let io: any = null;

const startServer = () => {
  if (server) return;

  server = http.createServer();

  server.listen(socketPort, () => {
    console.log(`Socket.IO server running at http://localhost:${socketPort}`);
  });

  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  setupSocketHandlers();
};

const documents: DocumentsCollection = {
  welcome: {
    title: "Welcome",
    content: "Welcome to SyncDoc! This is a collaborative document editor. Start typing to edit the document.",
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

      console.log(`User ${documents[documentId].users[socket.id]} joined document ${documentId}`);
    });

    socket.on("text-change", (documentId: string, delta: Delta, source: string, content: string) => {
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

      console.log(`Document ${documentId} updated by ${documents[documentId]?.users[socket.id] || "unknown user"}`);
    });

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.static(path.join(import.meta.dir, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(import.meta.dir, "../public/index.html"));
});

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
    deltaCount: documents[id].deltas.length
  });
});

app.get("/api/documents/:id/history", (req, res) => {
  const { id } = req.params;
  
  if (!documents[id]) {
    return res.status(404).json({ error: "Document not found" });
  }
  
  // Return the deltas history for the document
  // This could be paginated in a real application to handle large histories
  res.json({
    id,
    title: documents[id].title,
    deltas: documents[id].deltas
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

let expressServer: any = null;

const startExpressServer = () => {
  if (expressServer) return;

  expressServer = app.listen(expressPort, () => {
    console.log(`Express server running at http://localhost:${expressPort}`);
  });
};

if (!isTest) {
  startServer();
  startExpressServer();
}

export {
  app,
  server,
  io,
  documents,
  startServer,
  startExpressServer,
  socketPort,
  expressPort,
};
