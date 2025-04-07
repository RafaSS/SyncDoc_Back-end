import { Delta, DeltaChange } from "../interfaces/delta.interface";
import { IDocument } from "../interfaces/document.interface";
import { IDocumentService } from "../interfaces/document-service.interface";
import { DocumentRepository } from "../repositories/document.repository";
// import { UserRepository } from "../repositories/user.repository";
import { supabase, TABLES } from "../config/supabase";

export class DocumentService implements IDocumentService {
  private documentRepository: DocumentRepository;
  // private userRepository: UserRepository;

  constructor(documentRepository: DocumentRepository) {
    this.documentRepository = documentRepository;
  }

  public async getAllDocuments(): Promise<
    Array<{ id: string; title: string; userCount: number }>
  > {
    const allDocuments = await Promise.all(
      (
        await this.documentRepository.getUserDocuments(
          "00000000-0000-0000-0000-000000000000"
        )
      ).map(async (doc) => {
        const users = await this.documentRepository.getDocumentUsers(doc.id);
        return {
          id: doc.id,
          title: doc.title,
          userCount: users.length,
        };
      })
    );

    return allDocuments;
  }

  /**
   * Get all documents accessible by a specific user
   * @param userId User ID
   * @returns Array of document summaries with user counts
   */
  public async getAllDocumentsForUser(
    userId: string
  ): Promise<Array<{ id: string; title: string; userCount: number }>> {
    if (!userId) {
      return [];
    }

    const userDocuments = await Promise.all(
      (
        await this.documentRepository.getUserDocuments(userId)
      ).map(async (doc) => {
        const users = await this.documentRepository.getDocumentUsers(doc.id);
        return {
          id: doc.id,
          title: doc.title,
          userCount: users.length,
        };
      })
    );

    return userDocuments;
  }

  public async getDocumentById(id: string): Promise<IDocument | null> {
    return this.documentRepository.getDocumentById(id);
  }

  public async getDocumentHistory(
    id: string
  ): Promise<{ id: string; title: string; deltas: DeltaChange[] } | null> {
    const document = await this.documentRepository.getDocumentById(id);
    if (!document) {
      return null;
    }

    const history = await this.documentRepository.getDocumentHistory(id);
    return {
      id: document.id,
      title: document.title,
      deltas: history.map((change) => ({
        delta: change.delta,
        userId: change.user_id,
        userName: change.user ? change.user.name : "Unknown User",
        timestamp: new Date(change.created_at).getTime(),
      })),
    };
  }

  public async createDocument(
    title?: string,
    content?: Delta,
    userId?: string
  ): Promise<{ id: string }> {
    const document = await this.documentRepository.createDocument(
      title || "Untitled Document",
      content || { ops: [] },
      userId
    );

    return { id: document.id };
  }

  public async updateDocumentTitle(
    id: string,
    title: string
  ): Promise<boolean> {
    const document = await this.documentRepository.getDocumentById(id);
    if (!document) {
      return false;
    }

    await this.documentRepository.updateDocument(id, "", [], { title });
    return true;
  }

  public async updateDocumentContent(
    documentId: string,
    content: any,
    delta: Delta,
    socketId: string,
    userName: string,
    userId?: string
  ): Promise<void> {
    // Get the document first
    const document = await this.documentRepository.getDocumentById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} does not exist`);
    }

    // Create delta change record
    const deltaChange: DeltaChange = {
      delta: { ops: delta.ops || [] },
      userId: userId || socketId,
      userName: userName,
      timestamp: Date.now(),
    };

    // Get existing deltas or initialize empty array
    const existingDeltas = document.deltas || [];
    const deltas = [...existingDeltas, deltaChange];

    // Save the document change if user is authenticated
    if (userId) {
      await this.documentRepository.saveDocumentChange(
        documentId,
        userId,
        delta.ops || []
      );
    }

    // Call the repository method with updated parameter order
    await this.documentRepository.updateDocumentContent(
      documentId,
      content, // Pass content directly - repository will handle the JSONB conversion
      delta,
      userId,
      userName,
      socketId
    );
  }

  public async addUserToDocument(
    documentId: string,
    socketId: string,
    userName: string,
    userId?: string
  ): Promise<void> {
    await this.documentRepository.addUserToDocument(
      documentId,
      socketId,
      userName,
      userId
    );

    // If user is authenticated, add them to document permissions
    if (userId) {
      // Check if user already has permission
      const { data } = await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .select("*")
        .eq("user_id", userId)
        .eq("document_id", documentId);

      // If no permission exists, add as viewer by default
      if (!data || data.length === 0) {
        await this.setDocumentPermission(documentId, userId, "viewer");
      }
    }
  }

  public async setDocumentPermission(
    documentId: string,
    userId: string,
    role: "viewer" | "editor" | "owner"
  ): Promise<void> {
    // Check if permission already exists
    const { data, error } = await supabase
      .from(TABLES.DOCUMENT_PERMISSIONS)
      .select("*")
      .eq("user_id", userId)
      .eq("document_id", documentId);

    if (error) {
      throw new Error(`Failed to check document permission: ${error.message}`);
    }

    if (data && data.length > 0) {
      // Update existing permission
      await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .update({ role })
        .eq("user_id", userId)
        .eq("document_id", documentId);
    } else {
      // Create new permission
      await supabase.from(TABLES.DOCUMENT_PERMISSIONS).insert({
        user_id: userId,
        document_id: documentId,
        role,
      });
    }
  }

  public async deleteDocument(documentId: string): Promise<boolean> {
    return this.documentRepository.deleteDocument(documentId);
  }

  public async removeUserFromDocument(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const document = await this.documentRepository.getDocumentById(documentId);
    if (!document) {
      return false;
    }

    await this.documentRepository.removeUserFromDocument(documentId, userId);
    return true;
  }

  public async getDocumentUsers(
    documentId: string
  ): Promise<Record<string, string>> {
    const users = await this.documentRepository.getDocumentUsers(documentId);
    if (!users || users.length === 0) {
      return {};
    }

    // Transform the array of users into the expected format
    return users.reduce((acc, userDoc) => {
      console.log("User document:", userDoc);
      acc[userDoc.user_id] = userDoc.name;
      return acc;
    }, {} as Record<string, string>);
  }
}
