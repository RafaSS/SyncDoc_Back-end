import { supabase, TABLES } from "../config/supabase";
import { IDocument } from "../interfaces/document.interface";
import { Delta, DeltaChange } from "../interfaces/delta.interface";

/**
 * Repository class for document operations using Supabase
 */
export class DocumentRepository {
  /**
   * Create a new document in the database
   * @param title Document title
   * @param content Initial document content
   * @param userId Creator user ID
   * @returns The created document
   */
  async createDocument(
    title: string = "Untitled Document",
    content: Delta = { ops: [] },
    userId?: string
  ): Promise<IDocument> {
    // Insert document

    console.log("Creating document with user ID:😊", userId);

    const { data: document, error: docError } = await supabase
      .from(TABLES.DOCUMENTS)
      .insert({
        title,
        content,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (docError)
      throw new Error(`Error creating document: ${docError.message}`);

    // Associate document with user
    const { error: userDocError } = await supabase
      .from(TABLES.USER_DOCUMENTS)
      .insert({
        user_id: userId,
        document_id: document.id,
        role: "owner",
        created_at: new Date().toISOString(),
      });
    console.log("User document association created:", userDocError);

    // if (userDocError) {
    //   // Attempt to clean up the document if user association fails
    //   await supabase.from(TABLES.DOCUMENTS).delete().eq("id", document.id);
    //   throw new Error(
    //     `Error associating document with user: ${userDocError.message}`
    //   );
    // }

    return document;
  }

  /**
   * Get a document by ID
   * @param documentId Document ID
   * @returns The document or null if not found
   */
  async getDocumentById(documentId: string): Promise<IDocument | null> {
    const { data, error } = await supabase
      .from(TABLES.DOCUMENTS)
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Error fetching document: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a document
   * @param documentId Document ID
   * @param updates Object containing the fields to update
   * @returns The updated document
   */
  async updateDocument(
    documentId: string,
    updates: Partial<IDocument>
  ): Promise<IDocument> {
    // Always update the updated_at timestamp
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLES.DOCUMENTS)
      .update(updatedData)
      .eq("id", documentId)
      .select("*")
      .single();

    if (error) throw new Error(`Error updating document: ${error.message}`);
    return data;
  }

  /**
   * Delete a document
   * @param documentId Document ID
   * @returns True if document was deleted
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    // First delete all user associations
    await supabase
      .from(TABLES.USER_DOCUMENTS)
      .delete()
      .eq("document_id", documentId);

    // Then delete all document changes
    await supabase
      .from(TABLES.DOCUMENT_CHANGES)
      .delete()
      .eq("document_id", documentId);

    // Finally delete the document
    const { error } = await supabase
      .from(TABLES.DOCUMENTS)
      .delete()
      .eq("id", documentId);

    if (error) throw new Error(`Error deleting document: ${error.message}`);
    return true;
  }

  /**
   * Get all documents accessible by a user
   * @param userId User ID
   * @param options Query options for pagination
   * @returns List of documents
   */
  async getUserDocuments(
    userId: string,
    options = { page: 1, limit: 10 }
  ): Promise<IDocument[]> {
    const { data, error } = await supabase
      .from(TABLES.USER_DOCUMENTS)
      .select(
        `
        document_id,
        role,
        ${TABLES.DOCUMENTS}:document_id (*)
      `
      )
      .eq("user_id", userId)
      .range(
        (options.page - 1) * options.limit,
        options.page * options.limit - 1
      );

    if (error)
      throw new Error(`Error fetching user documents: ${error.message}`);

    // Map the nested structure to a flat list of documents with role
    return data.map((item: Record<string, any>) => ({
      ...item[TABLES.DOCUMENTS],
      userRole: item.role,
    }));
  }

  /**
   * Save a document change
   * @param documentId Document ID
   * @param userId User who made the change
   * @param delta The change delta
   * @returns The saved change
   */
  async saveDocumentChange(
    documentId: string,
    userId: string,
    delta: DeltaChange
  ): Promise<any> {
    const { data, error } = await supabase
      .from(TABLES.DOCUMENT_CHANGES)
      .insert({
        document_id: documentId,
        user_id: userId,
        delta,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error)
      throw new Error(`Error saving document change: ${error.message}`);
    return data;
  }

  /**
   * Get document change history
   * @param documentId Document ID
   * @param options Query options for pagination
   * @returns List of changes
   */
  async getDocumentHistory(
    documentId: string,
    options = { page: 1, limit: 10 }
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from(TABLES.DOCUMENT_CHANGES)
      .select("*, user:user_id (name, email)")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .range(
        (options.page - 1) * options.limit,
        options.page * options.limit - 1
      );

    if (error)
      throw new Error(`Error fetching document history: ${error.message}`);
    return data;
  }

  /**
   * Share a document with a user
   * @param documentId Document ID
   * @param userId User ID to share with
   * @param role Access role (viewer, editor, owner)
   * @returns The created user-document relationship
   */
  async shareDocument(
    documentId: string,
    userId: string,
    role: string
  ): Promise<any> {
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from(TABLES.USER_DOCUMENTS)
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Update existing relationship if it exists
      const { data, error } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .update({ role })
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error)
        throw new Error(`Error updating document sharing: ${error.message}`);
      return data;
    } else {
      // Create new relationship
      const { data, error } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .insert({
          document_id: documentId,
          user_id: userId,
          role,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw new Error(`Error sharing document: ${error.message}`);
      return data;
    }
  }

  /**
   * Remove a user's access to a document
   * @param documentId Document ID
   * @param userId User ID to remove
   * @returns True if access was removed
   */
  async removeDocumentAccess(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.USER_DOCUMENTS)
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userId);

    if (error)
      throw new Error(`Error removing document access: ${error.message}`);
    return true;
  }

  /**
   * Get users with access to a document
   * @param documentId Document ID
   * @returns List of users with their access roles
   */
  async getDocumentUsers(documentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from(TABLES.USER_DOCUMENTS)
      .select("*, user:user_id (*)")
      .eq("document_id", documentId);

    if (error)
      throw new Error(`Error fetching document users: ${error.message}`);
    return data;
  }

  /**
   * Add a user to a document
   * @param documentId The document ID
   * @param socketId The user's socket ID
   * @param userName The user's name
   * @returns void
   */
  public async addUserToDocument(
    documentId: string,
    socketId: string,
    userName: string
  ): Promise<void> {
    // Check if document exists
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} does not exist`);
    }

    // Add to active users in memory via socket ID
    // Note: This is now handled in the service layer with the activeUsers object

    // For backwards compatibility with older code, we'll still store the user-document relationship
    await this.shareDocument(documentId, socketId, "editor");
  }

  /**
   * Update document content and save change history
   * @param documentId Document ID
   * @param content New content
   * @param delta Delta change
   * @param socketId User socket ID
   * @param userName User name
   * @returns void
   */
  public async updateDocumentContent(
    documentId: string,
    content: string,
    delta: Delta,
    socketId: string,
    userName: string
  ): Promise<void> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} does not exist`);
    }

    // Save the document change
    await this.saveDocumentChange(documentId, socketId, {
      delta,
      userId: socketId,
      userName,
      timestamp: Date.now(),
    });

    // Update the document content
    await this.updateDocument(documentId, { content });
  }
}
