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
  private documentSaveTimers: { [documentId: string]: NodeJS.Timer } = {};
  private pendingContentChanges: {
    [documentId: string]: {
      content: any;
      deltaChange: Delta;
      socketId: string;
      userName: string;
      userId?: string;
    };
  } = {};
  private isTest = process.env.NODE_ENV === "test";

  constructor(io: Server, documentService: IDocumentService) {
    this.io = io;
    this.documentService = documentService;
    this.jwt = jwt;
    this.setupSocketHandlers();
  }

  private debouncedSaveDocument(documentId: string): void {
    if (this.documentSaveTimers[documentId]) {
      clearTimeout(this.documentSaveTimers[documentId]);
    }

    this.documentSaveTimers[documentId] = setTimeout(async () => {
      const changes = this.pendingContentChanges[documentId];
      if (!changes) return;

      // console.log(`Saving document ${documentId} after 1 second of inactivity`);

      try {
        await this.documentService.updateDocumentContent(
          documentId,
          changes.content,
          changes.deltaChange,
          changes.socketId,
          changes.userName || "",
          changes.userId
        );

        delete this.pendingContentChanges[documentId];
        // console.log(`Document ${documentId} saved successfully`);
      } catch (error) {
        console.error(`Error saving document ${documentId}:`, error);
      }
    }, 1000);
  }

  private setupSocketHandlers(): void {
    // console.log("Setting up socket handlers", this.io.sockets.name);
    this.io.on("connection", (socket: Socket) => {
      console.log("Client connected:", socket.id);

      const userId = socket.handshake.auth.token;
      if (userId && userId !== "undefined") {
        // Validate UUID format
        const isValidUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            userId
          );
        if (isValidUuid) {
          // console.log("User identified:", userId);
          (socket as any).userId = userId;
        } else {
          console.log("Invalid user ID format, authentication required");
        }
      } else {
        console.log("Authentication required - no user ID provided");
      }

      socket.use(async ([event, ...args], next) => {
        // console.log("Socket event:", event);

        if (this.isTest) {
          return next();
        }

        if (event === "auth") {
          return next();
        }

        if ((socket as any).userId) {
          return next();
        }

        if (
          [
            "join",
            "leave",
            "text-change",
            "cursor-move",
            "title-change",
          ].includes(event)
        ) {
          return next(new Error("Authentication required"));
        }

        next();
      });

      socket.on(
        "auth",
        async (
          token: string,
          callback: (error: string | null, data?: any) => void
        ) => {
          // console.log("Authenticating user...");
          try {
            const { data, error } = await supabase.auth.getUser(token);
            if (error || !data.user) {
              return callback("Invalid token");
            }

            (socket as any).userId = data.user.id;
            callback(null, { authenticated: true, userId: data.user.id });
          } catch (error: any) {
            callback(error.message || "Authentication error");
          }
        }
      );

      socket.on("test", () => {
        // console.log("Test event received");
      });

      socket.on(
        "join-document",
        async (documentId: string, userName: string, userId: string) => {
          console.log(`User ${userId} joining document ${documentId}`);

          // Enforce authenticated sessions
          if (
            !userId ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              userId
            )
          ) {
            console.log(
              `Authentication required to join document ${documentId}`
            );
            console.log("Invalid user ID format, authentication required");
            return;
          }

          try {
            // User display name handling
            let displayName = userName || "";

            // Get document content
            console.log("Fetching document with ID... 🥴");
            let document = await this.documentService.getDocumentById(
              documentId
            );

            if (!document) {
              console.log("Document not found");
              return;
            }

            // Join the socket room
            socket.join(documentId);

            document = await this.documentService.getDocumentById(documentId);
            if (!document) {
              const result = await this.documentService.createDocument(
                "Untitled Document",
                { ops: [] },
                userId
              );
              documentId = result.id;
              document = await this.documentService.getDocumentById(documentId);
              // console.log("Created new document:", documentId);
              socket.leave(documentId);
              socket.join(documentId);
            }

            await this.documentService.addUserToDocument(
              documentId,
              socket.id,
              displayName,
              userId
            );
            console.log("😂😂😂😂", documentId, socket.id, displayName, userId);
            document = await this.documentService.getDocumentById(documentId);

            if (document && document.content) {
              // console.log("Sending document content to client", document.content);
              socket.emit("load-document", document.content, document.deltas);
              socket.emit("document-content", document.content);
            } else {
              // console.log("Sending empty document content");
              socket.emit("load-document", { ops: [] }, []);
              socket.emit("document-content", { ops: [] });
            }

            if (document && document.title) {
              socket.emit("title-change", document.title);
            }

            socket.to(documentId).emit("user-joined", socket.id, displayName);

            const users = document ? document.users : {};
            this.io.to(documentId).emit("user-list", users);

            // console.log(`User ${displayName} joined document ${documentId}`);
          } catch (error) {
            console.error("Error joining document:", error);
            console.log("Error joining document");
          }
        }
      );

      socket.on("get-users", async (documentId: string) => {
        try {
          const documentUsers = await this.documentService.getDocumentUsers(
            documentId
          );

          const activeUsersForDocument = Object.entries(this.activeUsers)
            .filter(([_, user]) => user.documentId === documentId)
            .reduce((acc, [socketId, user]) => {
              const userId = user.userId || socketId;
              acc[userId] = user.userName;
              return acc;
            }, {} as Record<string, string>);

          const allUsers = {
            // ...documentUsers,
            ...activeUsersForDocument,
          };

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
          content: DeltaOperation[]
        ) => {
          const userName = this.activeUsers[socket.id]?.userName;

          this.pendingContentChanges[documentId] = {
            content,
            deltaChange: { ops: delta },
            socketId: socket.id,
            userName: userName || "",
            userId: this.activeUsers[socket.id]?.userId,
          };

          this.debouncedSaveDocument(documentId);

          socket
            .to(documentId)
            .emit("text-change", documentId, delta, source, userId, content);

          console.log(
            `Document ${documentId} changes queued for saving (by ${
              userName || "unknown user"
            })`
          );
          console.log(delta);
        }
      );

      socket.on("title-change", async (documentId: string, title: string) => {
        await this.documentService.updateDocumentTitle(documentId, title);

        this.io.to(documentId).emit("title-change", title);
      });

      socket.on(
        "cursor-move",
        async (documentId: string, cursorPosition: any, userId: string) => {
          socket.to(documentId).emit("cursor-move", userId, cursorPosition);
        }
      );

      socket.on("get-document-history", async (callback) => {
        try {
          const documentId = this.activeUsers[socket.id]?.documentId;

          if (!documentId) {
            console.error("No document ID found for socket:", socket.id);
            callback([]);
            return;
          }

          const document = await this.documentService.getDocumentById(
            documentId
          );

          if (!document) {
            console.error("Document not found:", documentId);
            callback([]);
            return;
          }

          callback(document.deltas || []);
        } catch (error) {
          console.error("Error getting document history:", error);
          callback([]);
        }
      });

      socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);

        if (this.activeUsers[socket.id]) {
          const { documentId, userName, userId } = this.activeUsers[socket.id];

          if (this.pendingContentChanges[documentId]) {
            if (this.documentSaveTimers[documentId]) {
              clearTimeout(this.documentSaveTimers[documentId]);
              delete this.documentSaveTimers[documentId];
            }

            const changes = this.pendingContentChanges[documentId];
            try {
              await this.documentService.updateDocumentContent(
                documentId,
                changes.content,
                changes.deltaChange,
                changes.socketId,
                changes.userName,
                changes.userId
              );
              // console.log(`Saved pending changes for document ${documentId} on disconnect`);
              delete this.pendingContentChanges[documentId];
            } catch (error) {
              console.error(
                `Error saving pending changes for document ${documentId}:`,
                error
              );
            }
          }

          await this.documentService.removeUserFromDocument(
            documentId,
            userId || socket.id
          );

          const users = await this.documentService.getDocumentUsers(documentId);

          this.io.to(documentId).emit("user-left", socket.id, userName);
          this.io.to(documentId).emit("user-list", users);

          delete this.activeUsers[socket.id];

          console.log(`User ${userName} left document ${documentId}`);
        } else {
          const documents = await this.documentService.getAllDocuments();

          for (const doc of documents) {
            const document = await this.documentService.getDocumentById(doc.id);
            if (!document) continue;

            if (document.users[socket.id]) {
              const userName = document.users[socket.id];

              await this.documentService.removeUserFromDocument(
                doc.id,
                socket.id
              );

              this.io.to(doc.id).emit("user-left", socket.id, userName);

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

      socket.on("leave-document", async () => {
        if (this.activeUsers[socket.id]) {
          const { documentId, userName, userId } = this.activeUsers[socket.id];

          if (this.pendingContentChanges[documentId]) {
            if (this.documentSaveTimers[documentId]) {
              clearTimeout(this.documentSaveTimers[documentId]);
              delete this.documentSaveTimers[documentId];
            }

            const changes = this.pendingContentChanges[documentId];
            try {
              await this.documentService.updateDocumentContent(
                documentId,
                changes.content,
                changes.deltaChange,
                changes.socketId,
                changes.userName,
                changes.userId
              );
              // console.log(`Saved pending changes for document ${documentId} on leave`);
              delete this.pendingContentChanges[documentId];
            } catch (error) {
              console.error(
                `Error saving pending changes for document ${documentId}:`,
                error
              );
            }
          }

          await this.documentService.removeUserFromDocument(
            documentId,
            userId || socket.id
          );

          socket.leave(documentId);

          const users = await this.documentService.getDocumentUsers(documentId);

          this.io.to(documentId).emit("user-left", socket.id, userName);
          this.io.to(documentId).emit("user-list", users);

          delete this.activeUsers[socket.id];

          console.log(`User ${userName} left document ${documentId}`);
        }
      });
    });
  }
}
