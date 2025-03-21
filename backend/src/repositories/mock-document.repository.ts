import { IDocument } from "../interfaces/document.interface";
import { Delta, DeltaChange } from "../interfaces/delta.interface";

/**
 * Mock repository class for document operations (for testing)
 */
export class MockDocumentRepository {
  private documents: Map<string, IDocument> = new Map();
  private changes: Map<string, Array<any>> = new Map();
  private userDocuments: Map<string, Array<any>> = new Map();

  /**
   * Create a new document
   */
  async createDocument(
    title: string = "Untitled Document",
    content: Delta = { ops: [] },
    userId?: string
  ): Promise<IDocument> {
    const id = userId || `test-doc-${Date.now()}`;
    const document: IDocument = {
      id,
      title,
      content: JSON.stringify(content),
      createdAt: new Date(),
      updatedAt: new Date(),
      users: {},
      deltas: [],
      ownerId: userId || "system",
    };

    this.documents.set(id, document);
    return document;
  }

  /**
   * Get a document by ID
   */
  async getDocumentById(documentId: string): Promise<IDocument | null> {
    // Special case for non-existent-id to test 404 responses
    if (documentId === "non-existent-id") {
      return null;
    }

    // For tests, if the document doesn't exist, create it
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
    }
    return this.documents.get(documentId) || null;
  }

  /**
   * Get all documents
   */
  async getAllDocuments(
    options = { page: 1, limit: 10 }
  ): Promise<IDocument[]> {
    return Array.from(this.documents.values());
  }

  /**
   * Update a document
   */
  async updateDocument(
    documentId: string,
    updates: Partial<IDocument>
  ): Promise<IDocument> {
    // For tests, if the document doesn't exist, create it
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
    }

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const updatedDocument = {
      ...document,
      ...updates,
      updatedAt: new Date(),
    };

    this.documents.set(documentId, updatedDocument);
    return updatedDocument;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.documents.has(documentId)) {
      return false;
    }

    this.documents.delete(documentId);
    this.changes.delete(documentId);
    this.userDocuments.delete(documentId);
    return true;
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(
    userId: string,
    options = { page: 1, limit: 10 }
  ): Promise<IDocument[]> {
    return Array.from(this.documents.values());
  }

  /**
   * Save a document change
   */
  async saveDocumentChange(
    documentId: string,
    userId: string,
    delta: DeltaChange
  ): Promise<any> {
    // Make sure the document exists
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
    }

    if (!this.changes.has(documentId)) {
      this.changes.set(documentId, []);
    }

    const change = {
      id: `change-${Date.now()}`,
      document_id: documentId,
      user_id: userId,
      delta,
      created_at: new Date().toISOString(),
    };

    this.changes.get(documentId)!.push(change);

    // Also update the document's deltas array
    const document = this.documents.get(documentId);
    if (document) {
      document.deltas.push(delta);
      this.documents.set(documentId, document);
    }

    return change;
  }

  /**
   * Get document history
   */
  async getDocumentHistory(
    documentId: string,
    options = { page: 1, limit: 10 }
  ): Promise<any[]> {
    // If the document doesn't exist in changes, create an empty array
    if (!this.changes.has(documentId)) {
      this.changes.set(documentId, []);
    }
    return this.changes.get(documentId) || [];
  }

  /**
   * Share a document with a user
   */
  async shareDocument(
    documentId: string,
    userId: string,
    role: string
  ): Promise<any> {
    // Make sure the document exists
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
    }

    if (!this.userDocuments.has(documentId)) {
      this.userDocuments.set(documentId, []);
    }

    const relation = {
      id: `relation-${Date.now()}`,
      document_id: documentId,
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
      user: {
        name: "Test User",
      },
    };

    this.userDocuments.get(documentId)!.push(relation);

    // Update the users object in the document
    const document = this.documents.get(documentId);
    if (document) {
      document.users[userId] = userId;
      this.documents.set(documentId, document);
    }

    return relation;
  }

  /**
   * Remove user access to a document
   */
  async removeDocumentAccess(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    if (!this.userDocuments.has(documentId)) {
      return false;
    }

    const relations = this.userDocuments.get(documentId)!;
    const updatedRelations = relations.filter((r) => r.user_id !== userId);
    this.userDocuments.set(documentId, updatedRelations);

    // Remove user from document's users object
    const document = this.documents.get(documentId);
    if (document && document.users[userId]) {
      delete document.users[userId];
      this.documents.set(documentId, document);
    }

    return true;
  }

  /**
   * Get users with access to a document
   */
  async getDocumentUsers(documentId: string): Promise<any[]> {
    // Make sure the document exists
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
      // Add a test user to the document for testing
      await this.addUserToDocument(documentId, "test-socket-id", "Test User");
    }

    // Return an array of user documents with the expected structure
    if (!this.userDocuments.has(documentId)) {
      return [];
    }

    return this.userDocuments.get(documentId) || [];
  }

  /**
   * Add a user to a document
   */
  async addUserToDocument(
    documentId: string,
    socketId: string,
    userName: string
  ): Promise<void> {
    // Make sure the document exists
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
    }

    await this.shareDocument(documentId, socketId, "editor");

    // Update the users object with the user name
    const document = this.documents.get(documentId);
    if (document) {
      document.users[socketId] = userName;
      this.documents.set(documentId, document);

      // Also update the user info in userDocuments
      if (this.userDocuments.has(documentId)) {
        const userDocs = this.userDocuments.get(documentId)!;
        for (const userDoc of userDocs) {
          if (userDoc.user_id === socketId) {
            userDoc.user.name = userName;
            break;
          }
        }
      }
    }
  }

  /**
   * Update document content
   */
  async updateDocumentContent(
    documentId: string,
    content: string,
    delta: Delta,
    socketId: string,
    userName: string
  ): Promise<void> {
    // Make sure the document exists
    if (!this.documents.has(documentId)) {
      await this.createDocument("Test Document", { ops: [] }, documentId);
    }

    // Update document content
    await this.updateDocument(documentId, { content });

    // Save change in history
    await this.saveDocumentChange(documentId, socketId, {
      delta,
      userId: socketId,
      userName,
      timestamp: Date.now(),
    });
  }
}
