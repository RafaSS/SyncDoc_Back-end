import { Server, Socket } from "socket.io";
import { IDocumentService } from "../interfaces/document-service.interface";
import { Delta } from "../interfaces/delta.interface";

export class SocketService {
  private io: Server;
  private documentService: IDocumentService;

  constructor(io: Server, documentService: IDocumentService) {
    this.io = io;
    this.documentService = documentService;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log("New user connected:", socket.id);

      socket.on(
        "join-document",
        async (documentId: string, userName: string) => {
          socket.join(documentId);

          // Get or create document
          let document = await this.documentService.getDocumentById(documentId);
          if (!document) {
            // Create a new document if it doesn't exist
            await this.documentService.createDocument();
            document = await this.documentService.getDocumentById(documentId);
          }

          // Add user to document
          await this.documentService.addUserToDocument(
            documentId,
            socket.id,
            userName
          );

          // Get the updated document
          document = await this.documentService.getDocumentById(documentId);

          // Send the document content to the client
          if (document && document.content) {
            socket.emit("load-document", document.content);
          } else {
            // If no content exists, send an empty delta
            socket.emit("load-document", JSON.stringify({ ops: [] }));
          }

          // Notify other users that a new user joined
          socket.to(documentId).emit("user-joined", socket.id, userName);

          // Send the updated user list to all users in the room
          const users = document ? document.users : {};
          this.io.to(documentId).emit("user-list", users);

          console.log(`User ${userName} joined document ${documentId}`);
        }
      );

      socket.on(
        "text-change",
        async (
          documentId: string,
          delta: Delta,
          source: string,
          content: string
        ) => {
          if (source !== "user") return;

          const document = await this.documentService.getDocumentById(
            documentId
          );
          if (!document) return;

          const userName = document.users[socket.id] || "Anonymous";

          // Update document content
          await this.documentService.updateDocumentContent(
            documentId,
            content,
            delta,
            socket.id,
            userName
          );

          // Send the delta directly without needing to stringify/parse on client
          socket.to(documentId).emit("text-change", delta, socket.id, content);

          console.log(`Document ${documentId} updated by ${userName}`);
        }
      );

      socket.on("title-change", async (documentId: string, title: string) => {
        await this.documentService.updateDocumentTitle(documentId, title);
        this.io.to(documentId).emit("title-change", title);
      });

      socket.on("cursor-move", (documentId: string, cursorPosition: any) => {
        socket.to(documentId).emit("cursor-move", socket.id, cursorPosition);
      });

      socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);

        // Find all documents where the user is present
        const documents = await this.documentService.getAllDocuments();

        for (const doc of documents) {
          const document = await this.documentService.getDocumentById(doc.id);
          if (!document) continue;

          // Check if the user is in this document
          if (document.users[socket.id]) {
            const userName = document.users[socket.id];

            // Remove user from document using the socket ID
            // Note: Make sure documentService.removeUserFromDocument can handle socket IDs
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
      });
    });
  }
}
