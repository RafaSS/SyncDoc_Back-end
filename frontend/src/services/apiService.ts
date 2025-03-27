import { getCookie } from "../utils/cookie";

// Types
interface DocumentResponse {
  id: string;
  title: string;
  content: any;
  userCount: number;
}

interface DocumentListItem {
  id: string;
  title: string;
  userCount: number;
}

interface DocumentHistoryResponse {
  deltas: any[];
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  }

  /**
   * Get auth headers for authenticated requests
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get auth token from cookie directly as that's how the system is designed
    const token = getCookie("auth_token");

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Fetch all documents for current user
   */
  async getDocuments(): Promise<DocumentListItem[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async createDocument(userId: string): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Error creating document:", error);
      throw error;
    }
  }

  /**
   * Fetch document by ID
   */
  async getDocument(documentId: string): Promise<DocumentResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching document:", error);
      throw error;
    }
  }

  /**
   * Fetch document history
   */
  async getDocumentHistory(
    documentId: string
  ): Promise<DocumentHistoryResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseUrl}/documents/${documentId}/history`,
        {
          method: "GET",
          headers,
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch document history: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching document history:", error);
      throw error;
    }
  }
}

// Create a singleton instance
export const apiService = new ApiService();
