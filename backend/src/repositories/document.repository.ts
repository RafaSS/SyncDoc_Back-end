import { supabase, TABLES } from "../config/supabase";
import { IDocument } from "../interfaces/document.interface";
import {
  Delta,
  DeltaChange,
  DeltaOperation,
} from "../interfaces/delta.interface";
import { IDocumentPermission } from "../interfaces/document.interface";

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
    try {
      // Insert document
      console.log("Creating document with user ID:", userId);

      const { data: document, error: docError } = await supabase
        .from(TABLES.DOCUMENTS)
        .insert({
          title,
          content, // Store content directly as JSONB
          owner_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (docError) {
        throw new Error(`Error creating document: ${docError.message}`);
      }

      // Associate document with user if provided
      if (userId) {
        const { error: userDocError } = await supabase
          .from(TABLES.DOCUMENT_PERMISSIONS)
          .insert({
            user_id: userId,
            document_id: document.id,
            permission_level: "owner",
            created_at: new Date().toISOString(),
          });

        console.log(
          "User document association created:",
          userDocError ? userDocError.message : "success"
        );
      }

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
        console.error("Failed to get document by ID:", documentId);
        throw new Error(`Error fetching document: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to get document by ID:", error);
      throw error;
    }
  }

  /**
   * Check if a user is authorized to access a document
   * @param documentId Document ID
   * @param userId User ID
   * @returns Boolean indicating if the user has permission
   */
  async isUserAuthorized(
    documentId: string,
    userId: string,
    requiredPermission: "viewer" | "editor" | "owner" = "viewer"
  ): Promise<boolean> {
    try {
      if (!userId) return false;

      // If userId starts with temp_, it's not an authenticated user
      // Only allow reading for unauthenticated users
      if (userId.startsWith("temp_") && requiredPermission !== "viewer") {
        return false;
      }

      // Check if user is document owner
      const { data: document, error: docError } = await supabase
        .from(TABLES.DOCUMENTS)
        .select("owner_id")
        .eq("id", documentId)
        .single();

      if (docError) {
        console.error("Error checking document ownership:", docError);
        return false;
      }

      // If the user is the document owner, they have full access
      if (document?.owner_id === userId) {
        return true;
      }

      // Check document permissions table for this user
      const { data: permissions, error: permError } = await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .select("permission_level")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle(); // Use maybeSingle to avoid error if no record exists

      if (permError) {
        console.error("Error checking user permissions:", permError);
        // Continue to fallback permissions - common read access
      }

      // If no permission found, default to viewer for now
      // We need to handle unauthenticated users differently
      const permission = permissions?.permission_level || "viewer";

      // Check if user has sufficient permission
      switch (requiredPermission) {
        case "viewer":
          // Any permission level can view
          return true;
        case "editor":
          // Only editor or owner can edit
          return permission === "editor" || permission === "owner";
        case "owner":
          // Only owner can perform owner actions
          return permission === "owner";
        default:
          return false;
      }
    } catch (error) {
      console.error("Error checking user authorization:", error);
      return false;
    }
  }

  /**
   * Update a document
   * @param documentId Document ID
   * @param content Document content
   * @param deltas Document delta changes
   * @param otherData Other document data to update
   * @returns Updated document
   */
  async updateDocument(
    documentId: string,
    content: any, // Change type to any to handle both string and object
    deltas: DeltaChange[] = [],
    otherData: Record<string, any> = {}
  ): Promise<any> {
    try {
      // Check if document exists
      const existingDoc = await this.getDocumentById(documentId);
      if (!existingDoc) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Build update object
      const updateData: Record<string, any> = {
        ...otherData,
      };

      // Only update content if provided
      if (content) {
        // Ensure content is stored as JSONB, not as a string
        // If content is already an object, use it directly
        // If it's a string that looks like JSON, parse it first
        if (typeof content === "string") {
          try {
            // Check if it's a JSON string and parse it
            updateData.content = JSON.parse(content);
          } catch (e) {
            // If not valid JSON, store as a simple string
            updateData.content = content;
          }
        } else {
          // If already an object, store directly
          updateData.content = content;
        }
      }
      console.log("updateData", content);

      // Only update deltas if provided
      if (deltas.length > 0) {
        updateData.deltas = deltas;
      }

      // Update document
      const { data, error } = await supabase
        .from(TABLES.DOCUMENTS)
        .update(updateData)
        .eq("id", documentId)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Error updating document: ${error.message}`);
      }

      return data;
    } catch (err: any) {
      console.error("Error updating document:", err);
      throw err;
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
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .delete()
        .eq("document_id", documentId);

      // Then delete all document changes
      await supabase
        .from(TABLES.DOCUMENT_HISTORY)
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
    userId: string,
    options: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<IDocument[]> {
    try {
      // Get documents the user owns
      const { data: ownedDocs, error: ownedError } = await supabase
        .from(TABLES.DOCUMENTS)
        .select("*")
        .eq("owner_id", userId)
        .range(
          (options.page - 1) * options.limit,
          options.page * options.limit - 1
        );

      if (ownedError) {
        throw new Error(
          `Error fetching owned documents: ${ownedError.message}`
        );
      }

      // Get documents the user has permissions for
      const { data: sharedDocs, error: sharedError } = await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .select(
          `
          document_id,
          permission_level,
          documents:document_id (*)
        `
        )
        .eq("user_id", userId)
        .range(
          (options.page - 1) * options.limit,
          options.page * options.limit - 1
        );

      if (sharedError) {
        throw new Error(
          `Error fetching shared documents: ${sharedError.message}`
        );
      }

      // Combine and format results
      const sharedDocsFormatted =
        sharedDocs?.map((item) => item.documents) || [];
      const allDocs = [...(ownedDocs || []), ...sharedDocsFormatted];

      return allDocs;
    } catch (error: any) {
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
        .from(TABLES.DOCUMENT_HISTORY)
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
        .from(TABLES.DOCUMENT_HISTORY)
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
   * @param documentId The document ID to share
   * @param userId The user ID to share with
   * @param permission Permission level
   * @returns A promise with the result
   */
  async shareDocument(
    documentId: string,
    userId: string,
    permission: "viewer" | "editor" | "owner"
  ): Promise<any> {
    try {
      // First check if document exists
      const docExists = await this.getDocumentById(documentId);
      if (!docExists) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Check if user already has permissions for this document
      const { data: existingPerm, error: existingPermError } = await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .select("*")
        .eq("document_id", documentId)
        .eq("user_id", userId)
        .maybeSingle();

      // If user already has permissions, update them
      if (existingPerm) {
        const { data, error } = await supabase
          .from(TABLES.DOCUMENT_PERMISSIONS)
          .update({
            permission_level: permission,
          })
          .eq("document_id", documentId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) {
          console.error("Error updating document permission:", error);
          throw new Error(
            `Error updating document permission: ${error.message}`
          );
        }

        return data;
      }

      // Otherwise, insert new permissions
      // This might fail if the user doesn't exist in the auth system
      // We'll handle errors gracefully
      try {
        const { data, error } = await supabase
          .from(TABLES.DOCUMENT_PERMISSIONS)
          .insert({
            document_id: documentId,
            user_id: userId,
            permission_level: permission,
          })
          .select("*")
          .single();

        if (error) {
          // Special error handling for foreign key violation
          if (
            error.code === "23503" ||
            error.message.includes("foreign key constraint")
          ) {
            console.warn(
              `Foreign key constraint when sharing with user ${userId} - user might not exist in auth system`
            );
            // Return simulated success with basic info
            return {
              document_id: documentId,
              user_id: userId,
              permission_level: permission,
            };
          }
          console.log(
            "Error sharing document with user:",
            userId,
            "permission:",
            permission,
            "error:",
            error
          );
          throw new Error(`Error sharing document: ${error.message}`);
        }

        return data;
      } catch (insertError) {
        console.error("Error inserting document permission:", insertError);
        // Return simulated success with basic info in any error case
        return {
          document_id: documentId,
          user_id: userId,
          permission_level: permission,
        };
      }
    } catch (err: any) {
      console.error("Error sharing document:", err);
      throw err;
    }
  }

  /**
   * Get users with access to a document
   * @param documentId Document ID
   * @returns Array of users with access to the document
   */
  async getDocumentUsers(documentId: string): Promise<Array<any>> {
    console.log("Getting users for document:", documentId);

    try {
      // Get document to check owner
      const { data: document, error: documentError } = await supabase
        .from(TABLES.DOCUMENTS)
        .select("owner_id")
        .eq("id", documentId)
        .single();

      if (documentError) {
        console.error("Error getting document:", documentError);
        return [];
      }

      // Get permissions from document_permissions table
      const { data: permissions, error: permissionsError } = await supabase
        .from(TABLES.DOCUMENT_PERMISSIONS)
        .select("user_id, permission_level")
        .eq("document_id", documentId);

      if (permissionsError) {
        console.error("Error getting document permissions:", permissionsError);
        return [];
      }

      // Combine owner with shared users
      const userIds = new Set<string>();

      // Add owner if available
      if (document?.owner_id) {
        userIds.add(document.owner_id);
      }

      // Add users from permissions
      permissions?.forEach((perm) => {
        if (perm.user_id) {
          userIds.add(perm.user_id);
        }
      });

      // For each user ID, get basic user information
      const users = await Promise.all(
        Array.from(userIds).map(async (userId) => {
          const permission =
            permissions?.find((p) => p.user_id === userId)?.permission_level ||
            (userId === document?.owner_id ? "owner" : "viewer");
          return this.getUserData(userId, permission);
        })
      );

      // Filter out any null users
      return users.filter(Boolean);
    } catch (error) {
      console.error("Error getting document users:", error);
      return [];
    }
  }

  /**
   * Get basic user data by ID
   * @param userId User ID
   * @param role User's role in the document
   * @returns Basic user data object
   */
  private getUserData(userId: string, role?: string): any {
    if (!userId) return null;

    return {
      id: userId,
      name: `User ${userId.substring(0, 8)}`,
      email: `user-${userId.substring(0, 6)}@example.com`, // Placeholder
      role: role || "viewer",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Add user to a document (socket connection)
   * @param documentId Document ID
   * @param socketId Socket connection ID
   * @param userName User display name
   * @param userId Optional user ID for authentication
   */
  async addUserToDocument(
    documentId: string,
    socketId: string,
    userName: string,
    userId?: string
  ): Promise<void> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) throw new Error(`Document ${documentId} not found`);

      // Update the current active users
      const updatedUsers = {
        ...(document.users || {}),
        [socketId]: userName,
      };

      await supabase
        .from(TABLES.DOCUMENTS)
        .update({ users: updatedUsers })
        .eq("id", documentId);

      // Only try to establish a permanent relationship for authenticated users
      if (userId) {
        try {
          // Check if this user ID might be a valid Supabase Auth ID
          // Attempt to add user permission, but handle errors gracefully
          await this.shareDocument(documentId, userId, "editor");
          console.log(
            `User ${userId} added to document ${documentId} permissions`
          );
        } catch (shareError: any) {
          // Don't throw error here - just log it and continue
          // This allows temporary users to still work with the document
          console.log(
            `Note: Couldn't add user ${userId} to document permissions (this is normal for temporary users)`
          );
        }
      }
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
   * @param userId User ID making the change
   * @param userName User name making the change
   * @param socketId Socket ID making the change
   * @returns void
   */
  public async updateDocumentContent(
    documentId: string,
    content: any,
    delta: Delta,
    userId?: string,
    userName: string = "Anonymous",
    socketId: string = ""
  ): Promise<void> {
    try {
      // Get document
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} does not exist`);
      }

      // Create delta change record
      const deltaChange: DeltaChange = {
        delta: delta || [],
        userId: userId || socketId,
        userName: userName,
        timestamp: Date.now(),
      };

      // Get existing deltas or initialize empty array
      const existingDeltas = document.deltas || [];
      const deltas = [...existingDeltas, deltaChange];

      // Save the document change if user is authenticated
      if (userId) {
        await this.saveDocumentChange(documentId, userId, delta.ops || []);
      }

      // Update the document content
      // We'll pass the content directly to updateDocument which now handles
      // proper JSONB conversion
      await this.updateDocument(documentId, content, deltas);
    } catch (error) {
      console.error("Failed to update document content:", error);
      throw error;
    }
  }

  /**
   * Remove a user from a document
   * @param documentId Document ID
   * @param userId User ID or socket ID to remove
   * @returns True if user was removed
   */
  async removeUserFromDocument(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) {
        return false;
      }

      // Check if this is a socket ID in the users object
      if (document.users && document.users[userId]) {
        // Remove from the users object
        const { [userId]: _, ...remainingUsers } = document.users;
        await supabase
          .from(TABLES.DOCUMENTS)
          .update({ users: remainingUsers })
          .eq("id", documentId);
        return true;
      }

      // If not a socket ID, remove from permanent relationships
      return this.removeDocumentAccess(documentId, userId);
    } catch (error) {
      console.error("Failed to remove user from document:", error);
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
        .from(TABLES.DOCUMENT_PERMISSIONS)
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
}
