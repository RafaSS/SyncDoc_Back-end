import { Server, Socket } from "socket.io";
import { IDocumentService } from "../interfaces/document-service.interface";
import { Delta } from "../interfaces/delta.interface";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";
import { DeltaOperation } from "../types";

export class SocketService {
  private io: Server;
  private documentService: IDocumentService;
  private jwt: any;
  private activeUsers: {
    [socketId: string]: {
      documentId: string;
      userName: string;
      userId?: string;
      isAuthenticated: boolean;
    };
  } = {};
  private isTest = process.env.NODE_ENV === "test";

  constructor(io: Server, documentService: IDocumentService) {
    this.io = io;
    this.documentService = documentService;
    this.jwt = jwt;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    console.log("Setting up socket handlers", this.io.sockets.name);
    this.io.on("connection", (socket: Socket) => {
      console.log("Client connected:", socket.id);

      // Get userId directly from auth object
      const userId = socket.handshake.auth.token;
      if (userId && userId !== "undefined") {
        console.log("User identified:", userId);
        // Store userId on socket for later use
        (socket as any).userId = userId;
      } else {
        console.log(
          "Anonymous connection (no userId provided)",
          socket.handshake.auth
        );
      }

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

        // Allow connection with userId
        if ((socket as any).userId) {
          return next();
        }

        // No auth, reject for protected events
        if (
          [
            "join",
            "leave",
            "text-change",
            "cursor-change",
            "title-change",
          ].includes(event)
        ) {
          return next(new Error("Authentication required"));
        }

        // Allow other events
        next();
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
              { ops: [] },
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
          socket.join(documentId);

          // Check if userId is a temporary ID (it might or might not have a temp_ prefix)
          // Authenticated users will have UUIDs from Supabase that look different
          const isAuthenticatedUser =
            userId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              userId
            ) &&
            !userId.startsWith("temp_");

          // Set a standardized username for better identification
          let displayName = userName || "Anonymous";
          if (!isAuthenticatedUser && !displayName.startsWith("Visitor")) {
            displayName = `Visitor ${displayName}`;
          }

          // Store user in active users cache with additional auth info
          this.activeUsers[socket.id] = {
            documentId,
            userName: displayName,
            userId,
            isAuthenticated: isAuthenticatedUser,
          };

          console.log(
            `User ${userId} (${displayName}) added to document ${documentId} (authenticated: ${isAuthenticatedUser})`
          );

          // Get or create document
          let document = await this.documentService.getDocumentById(documentId);
          if (!document) {
            // Create a new document if it doesn't exist
            const result = await this.documentService.createDocument(
              "Untitled Document",
              { ops: [] },
              this.activeUsers[socket.id].userId
            );
            documentId = result.id;
            document = await this.documentService.getDocumentById(documentId);
            console.log("Created new document:", documentId);
            // Update room to the new document ID
            socket.leave(documentId);
            socket.join(documentId);
          }

          // Add user to document
          await this.documentService.addUserToDocument(
            documentId,
            socket.id,
            displayName,
            this.activeUsers[socket.id].userId || socket.id
          );

          // Get the updated document
          document = await this.documentService.getDocumentById(documentId);

          // Send the document content to the client
          if (document && document.content) {
            console.log(
              "Sending document content: 💕💕💕💕💕💕",
              document.content
            );
            socket.emit("load-document", document.content, document.deltas);
          } else {
            // If no content exists, send an empty delta
            console.log("Sending empty document content");
            socket.emit("load-document", { ops: [] });
          }

          // Notify other users that a new user joined
          socket.to(documentId).emit("user-joined", socket.id, displayName);

          // Send the updated user list to all users in the room
          const users = document ? document.users : {};
          this.io.to(documentId).emit("user-list", users);

          console.log(`User ${displayName} joined document ${documentId}`);
        }
      );

      socket.on("get-users", async (documentId: string) => {
        try {
          // Get document users from the document service
          const documentUsers = await this.documentService.getDocumentUsers(
            documentId
          );

          // Also add current active users from socket connections
          // This ensures visitors are included even if they're not in the database
          const activeUsersForDocument = Object.entries(this.activeUsers)
            .filter(([_, user]) => user.documentId === documentId)
            .reduce((acc, [socketId, user]) => {
              // Use socket ID as user ID for visitors without a real userId
              const userId = user.userId || socketId;
              acc[userId] = user.userName;
              return acc;
            }, {} as Record<string, string>);

          // Merge both sets of users, with active socket users taking precedence
          const allUsers = { ...documentUsers, ...activeUsersForDocument };

          // Send the merged user list to the client
          socket.emit("user-list", allUsers);
        } catch (error) {
          console.error("Error getting document users:", error);
          socket.emit("error", "Failed to get document users");
        }
      });

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
          const deltaChange: Delta = {
            ops: delta,
          };
          await this.documentService.updateDocumentContent(
            documentId,
            content,
            deltaChange,
            socket.id,
            userName,
            this.activeUsers[socket.id].userId
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
          await this.documentService.removeUserFromDocument(
            documentId,
            userId || socket.id
          );

          // Get updated user list
          const users = await this.documentService.getDocumentUsers(documentId);

          // Notify room of user leaving
          this.io.to(documentId).emit("user-left", socket.id, userName);
          this.io.to(documentId).emit("user-list", users);

          // Clean up
          delete this.activeUsers[socket.id];

          console.log(`User ${userName} left document ${documentId}`);
        } else {
          // Find all documents where the user is present
          const documents = await this.documentService.getAllDocuments();

          for (const doc of documents) {
            const document = await this.documentService.getDocumentById(doc.id);
            if (!document) continue;

            // Check if the user is in this document
            if (document.users[socket.id]) {
              const userName = document.users[socket.id];

              // Remove user from document
              await this.documentService.removeUserFromDocument(
                doc.id,
                socket.id
              );

              // Notify other users
              this.io.to(doc.id).emit("user-left", socket.id, userName);

              // Send updated user list
              const updatedDoc = await this.documentService.getDocumentById(
                doc.id
              );
              if (updatedDoc) {
                this.io.to(doc.id).emit("user-list", updatedDoc.users);
              }

              console.log(`User ${userName} left document ${doc.id}`);
            }
          }
        }
      });
    });
  }
}
