import { Server, Socket } from "socket.io";
import { IDocumentService } from "../interfaces/document-service.interface";
import { Delta } from "../interfaces/delta.interface";
import { supabase } from "../config/supabase";
import { DeltaOperation } from "../types";

export class SocketService {
  private io: Server;
  private documentService: IDocumentService;
  private activeUsers: {
    [socketId: string]: {
      documentId: string;
      userName: string;
      userId?: string;
    };
  } = {};
  private isTest = process.env.NODE_ENV === "test";

  constructor(io: Server, documentService: IDocumentService) {
    this.io = io;
    this.documentService = documentService;
    this.setupSocketHandlers();
  }

  public setupSocketHandlers(): void {
    console.log("Setting up socket handlers", this.io.sockets.name);
    this.io.on("connection", (socket: Socket) => {
      console.log("New user connected:", socket.id, "🤷‍♀️");

      // Authentication middleware for Socket.IO
      socket.use(async ([event, ...args], next) => {
        console.log("Socket event:", event);
        console.log("Socket args:", args);

        // Skip auth check during tests
        if (this.isTest) {
          return next();
        }

        // Skip auth for certain events
        if (event === "auth") {
          return next();
        }

        // Check token in handshake auth
        const token = socket.handshake.auth.token;
        if (!token) {
          console.log(
            "No token provided, but proceeding anyway for development"
          );
          return next();
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
          console.log("Authenticating user...");
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

      socket.on("test", () => {
        console.log("Test event received");
      });

      socket.on(
        "create-document",
        async (userId: string, callback: (documentId: string) => void) => {
          console.log("Creating new document for:", userId);
          try {
            // Create document with the provided user ID
            const result = await this.documentService.createDocument(
              "Untitled Document",
              userId
            );
            console.log("Document created with ID:", result.id);
            callback(result.id);
          } catch (error) {
            console.error("Error creating document:", error);
            callback(
              error instanceof Error
                ? `Error: ${error.message}`
                : "Error: An unknown error occurred"
            );
          }
        }
      );

      socket.on(
        "join-document",
        async (documentId: string, userName: string, userId: string) => {
          console.log("User:", userId, "joining document:", documentId);
          socket.join(documentId);

          // Store user in active users cache
          this.activeUsers[socket.id] = {
            documentId,
            userName,
            userId,
          };

          // Get document from database or create if it doesn't exist
          let document = await this.documentService.getDocumentById(documentId);

          if (!document) {
            console.log("Document not found, creating new document...🐃🐃🐃");
            // Create a new document if it doesn't exist
            const result = await this.documentService.createDocument(
              "Untitled Document",
              userId
            );
            documentId = result.id;
            document = await this.documentService.getDocumentById(documentId);
            console.log("Created new document:", documentId);
            // Update room to the new document ID
            socket.leave(documentId);
            socket.join(documentId);
          }

          // Add user to document
          console.log("Adding user to document:", userId);
          await this.documentService.addUserToDocument(documentId, userId);

          // Get the document content
          if (document && document.content) {
            console.log(
              "Sending document content: 💕💕💕💕💕💕",
              document.content
            );
            socket.emit(
              "load-document",
              document.content,
              document.deltas,
              document.documentContent
            );
          } else {
            // If no content exists, send an empty delta
            console.log("Sending empty document content");
            socket.emit("load-document", { ops: [] });
          }

          // Get users in the document
          const users = await this.documentService.getDocumentUsers(documentId);

          // Notify others that user joined
          socket.to(documentId).emit("user-joined", socket.id, userName);

          // Send updated user list to all clients in room
          this.io.to(documentId).emit("user-list", users);

          console.log(
            `User ${userName} (${
              userId || "anonymous"
            }) joined document ${documentId}`
          );
        }
      );

      socket.on(
        "text-change",
        async (
          documentId: string,
          delta: DeltaOperation[],
          source: string,
          userId: string,
          content: any
        ) => {
          const userName = this.activeUsers[socket.id].userName;

          // Update document content in database
          await this.documentService.updateDocumentContent(
            documentId,
            delta,
            userId,
            content
          );

          // Send the delta to all other clients in the room
          await socket
            .to(documentId)
            .emit("text-change", documentId, delta, source, userId, content);

          console.log(
            `Document ${documentId} updated by ${userName || "unknown user"}`
          );
        }
      );

      socket.on("title-change", async (documentId: string, title: string) => {
        // Update title in database
        await this.documentService.updateDocumentTitle(documentId, title);

        // Broadcast title change to all clients
        this.io.to(documentId).emit("title-change", title);
      });

      socket.on(
        "cursor-move",
        async (documentId: string, cursorPosition: any, userId: string) => {
          await socket
            .to(documentId)
            .emit("cursor-move", userId, cursorPosition);
        }
      );

      socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);

        // If user was in a document, remove them
        if (this.activeUsers[socket.id]) {
          const { documentId, userName, userId } = this.activeUsers[socket.id];

          // Remove user from document in database
          await this.documentService.removeUserFromDocument(documentId, userId);

          // Get updated user list
          const users = await this.documentService.getDocumentUsers(documentId);

          // Notify room of user leaving
          this.io.to(documentId).emit("user-left", socket.id, userName);
          this.io.to(documentId).emit("user-list", users);

          // Clean up
          delete this.activeUsers[socket.id];

          console.log(`User ${userName} left document ${documentId}`);
        }
      });
    });
  }
}
