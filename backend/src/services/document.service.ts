import { Delta, DeltaChange } from "../interfaces/delta.interface";
import { IDocument } from "../interfaces/document.interface";
import { IDocumentService } from "../interfaces/document-service.interface";
import { DocumentRepository } from "../repositories/document.repository";
import { UserRepository } from "../repositories/user.repository";
import { supabase, TABLES } from "../config/supabase";

export class DocumentService implements IDocumentService {
  private documentRepository: DocumentRepository;
  private userRepository: UserRepository;

  constructor(
    documentRepository: DocumentRepository,
    userRepository: UserRepository
  ) {
    this.documentRepository = documentRepository;
    this.userRepository = userRepository;
  }

  public async getAllDocuments(): Promise<
    Array<{ id: string; title: string; userCount: number }>
  > {
    const allDocuments = await Promise.all(
      (
        await this.documentRepository.getUserDocuments("system")
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

    await this.documentRepository.updateDocument(id, { title });
    return true;
  }

  public async updateDocumentContent(
    documentId: string,
    content: string,
    delta: Delta,
    socketId: string,
    userName: string,
    userId: string
  ): Promise<void> {
    return this.documentRepository.updateDocumentContent(
      documentId,
      content,
      delta,
      socketId,
      userName,
      userId
    );
  }

  /**
   * Add a user to a document
   * @param documentId Document ID
   * @param socketId User socket ID
   * @param userName User name
   * @param userId Optional user ID (for authenticated users)
   */
  public async addUserToDocument(
    documentId: string,
    socketId: string,
    userName: string,
    userId: string
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
        .from(TABLES.USER_DOCUMENTS)
        .select("*")
        .eq("user_id", userId)
        .eq("document_id", documentId);

      // If no permission exists, add as viewer by default
      if (!data || data.length === 0) {
        await this.setDocumentPermission(documentId, userId, "viewer");
      }
    }
  }

  /**
   * Set document permission for a user
   * @param documentId Document ID
   * @param userId User ID
   * @param role Permission role (viewer, editor, owner)
   */
  public async setDocumentPermission(
    documentId: string,
    userId: string,
    role: "viewer" | "editor" | "owner"
  ): Promise<void> {
    // Check if permission already exists
    const { data, error } = await supabase
      .from(TABLES.USER_DOCUMENTS)
      .select("*")
      .eq("user_id", userId)
      .eq("document_id", documentId);

    if (error) {
      throw new Error(`Failed to check document permission: ${error.message}`);
    }

    if (data && data.length > 0) {
      // Update existing permission
      await supabase
        .from(TABLES.USER_DOCUMENTS)
        .update({ role })
        .eq("user_id", userId)
        .eq("document_id", documentId);
    } else {
      // Create new permission
      await supabase.from(TABLES.USER_DOCUMENTS).insert({
        user_id: userId,
        document_id: documentId,
        role,
      });
    }
  }

  public async removeUserFromDocument(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const document = await this.documentRepository.getDocumentById(documentId);
    if (!document) {
      return false;
    }

    // Check if the id is a socket id (stored in document.users)
    if (document.users && document.users[userId]) {
      // It's a socket ID, remove from the users object
      const { [userId]: removedUser, ...remainingUsers } = document.users;
      await this.documentRepository.updateDocument(documentId, {
        users: remainingUsers,
      });
      return true;
    }

    // Otherwise treat it as a regular user ID and remove from permissions
    try {
      const { error } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Error removing document access: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error(
        `Failed to remove user ${userId} from document ${documentId}:`,
        error
      );
      return false;
    }
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
      acc[userDoc.user_id] = userDoc.user.name;
      return acc;
    }, {} as Record<string, string>);
  }
}
