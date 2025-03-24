import { supabase, TABLES } from "../config/supabase";
import { IDocument } from "../interfaces/document.interface";
import {
  Delta,
  DeltaChange,
  DeltaOperation,
} from "../interfaces/delta.interface";

/**
 * Repository class for document operations using Supabase
 */
export class DocumentRepository {
  /**
   * Create a new document in the database
   * @param title Document title
   * @param userId Creator user ID
   * @returns The created document
   */
  async createDocument(
    title: string = "Untitled Document",
    userId?: string
  ): Promise<IDocument> {
    try {
      // Insert document
      console.log("Creating document with user ID:😊", userId);

      const { data: document, error: docError } = await supabase
        .from(TABLES.DOCUMENTS)
        .insert({
          title,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (docError) {
        throw new Error(`Error creating document: ${docError.message}`);
      }

      // Associate document with user
      const { error: userDocError } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .insert({
          user_id: userId,
          document_id: document.id,
          role: "owner",
          created_at: new Date().toISOString(),
        });

      console.log(
        "User document association created:",
        userDocError ? userDocError.message : "success"
      );

      // if (userDocError) {
      //   // Attempt to clean up the document if user association fails
      //   await supabase.from(TABLES.DOCUMENTS).delete().eq("id", document.id);
      //   throw new Error(
      //     `Error associating document with user: ${userDocError.message}`
      //   );
      // }

      return document;
    } catch (error) {
      console.error("Failed to create document:", error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   * @param documentId Document ID
   * @returns The document or null if not found
   */
  async getDocumentById(documentId: string): Promise<IDocument | null> {
    try {
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
    } catch (error) {
      console.error("Failed to get document by ID:", error);
      throw error;
    }
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
    try {
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

      console.log("Document updated:", documentId);
      if (error) {
        throw new Error(`Error updating document: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to update document:", error);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param documentId Document ID
   * @returns True if document was deleted
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
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

      if (error) {
        throw new Error(`Error deleting document: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error;
    }
  }

  /**
   * Get all documents accessible by a user
   * @param userId User ID
   * @param options Query options for pagination
   * @returns List of documents
   */
  async getUserDocuments(
    // userId: string,
    options = { page: 1, limit: 10 }
  ): Promise<IDocument[]> {
    try {
      const { data, error } = await supabase.from(TABLES.USER_DOCUMENTS).select(
        `
          document_id,
          role,
          ${TABLES.DOCUMENTS}:document_id (*)
        `
      );
      // .eq("user_id", userId)
      // .range(
      //   (options.page - 1) * options.limit,
      //   options.page * options.limit - 1
      // );

      if (error) {
        throw new Error(`Error fetching user documents: ${error.message}`);
      }

      // Map the nested structure to a flat list of documents with role
      return data.map((item: Record<string, any>) => ({
        ...item[TABLES.DOCUMENTS],
        userRole: item.role,
      }));
    } catch (error) {
      console.error("Failed to get user documents:", error);
      throw error;
    }
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
    delta: DeltaOperation[]
  ): Promise<any> {
    try {
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

      if (error) {
        console.error(
          "Failed to save document change:",
          "user_id",
          userId,
          "document_id",
          documentId,
          "delta",
          delta,
          "error",
          error
        );
        throw new Error(`Error saving document change: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to save document change:", error);
      throw error;
    }
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
    try {
      const { data, error } = await supabase
        .from(TABLES.DOCUMENT_CHANGES)
        .select("*, user:user_id (name, email)")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .range(
          (options.page - 1) * options.limit,
          options.page * options.limit - 1
        );

      if (error) {
        throw new Error(`Error fetching document history: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to get document history:", error);
      throw error;
    }
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
    try {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from(TABLES.USERS)
        .select("*")
        .eq("id", userId)
        .single();

      //create if not exists
      if (!user) {
        const { data: newUser, error: newUserError } = await supabase
          .from(TABLES.USERS)
          .insert({
            id: userId,
            name: "Unknown",
            email: "Unknown",
          })
          .select("*")
          .single();

        if (newUserError) {
          throw new Error(`Error creating user: ${newUserError.message}`);
        }
      }

      // if (!user) {
      //   throw new Error(`User ${userId} not found`, { cause: userError });
      // }

      // Try to create new relationship first
      const { data: newData, error: insertError } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .insert({
          document_id: documentId,
          user_id: userId,
          role,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      // If the relationship already exists (constraint violation), update it
      if (insertError && insertError.code === "23505") {
        // Unique constraint violation
        const { data: updated, error: updateError } = await supabase
          .from(TABLES.USER_DOCUMENTS)
          .update({ role })
          .eq("document_id", documentId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (updateError) {
          throw new Error(
            `Error updating document sharing: ${updateError.message}`
          );
        }

        return updated;
      } else if (insertError) {
        throw new Error(`Error sharing document: ${insertError.message}`, {
          cause: insertError,
        });
      }

      return newData;
    } catch (error) {
      console.error("Failed to share document:", error);
      throw error;
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
    try {
      const { error } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Error removing document access: ${error.message}`, {
          cause: error,
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to remove document access:", error);
      throw error;
    }
  }

  /**
   * Get users with access to a document
   * @param documentId Document ID
   * @returns List of users with their access roles
   */
  async getDocumentUsers(documentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_DOCUMENTS)
        .select("*, user:user_id (*)")
        .eq("document_id", documentId);

      if (error) {
        throw new Error(`Error fetching document users: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to get document users:", error);
      throw error;
    }
  }

  /**
   * Add a user to a document
   * @param documentId The document ID
   * @param userId The user's ID
   * @returns void
   */
  public async addUserToDocument(
    documentId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if document exists
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} does not exist`);
      }

      // Add to active users in memory via socket ID
      // Note: This is now handled in the service layer with the activeUsers object

      // For backwards compatibility with older code, we'll still store the user-document relationship
      await this.shareDocument(documentId, userId, "editor");
    } catch (error) {
      console.error("Failed to add user to document:", error);
      throw error;
    }
  }

  /**
   * Update document content and save change history
   * @param documentId Document ID
   * @param content New content
   * @param delta Delta change
   * @param userId User ID
   * @returns void
   */
  public async updateDocumentContent(
    documentId: string,
    content: DeltaOperation[],
    delta: DeltaOperation[],
    userId: string
  ): Promise<void> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} does not exist`);
      }

      // Save the document change
      await this.saveDocumentChange(documentId, userId, {
        delta,
        userId,
        userName: "",
        timestamp: Date.now(),
      });

      // Update the document content
      await this.updateDocument(documentId, { content });
    } catch (error) {
      console.error("Failed to update document content:", error);
      throw error;
    }
  }
}
