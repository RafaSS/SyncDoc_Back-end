import { Socket, io } from "socket.io-client";
import { ref } from "vue";
import type Delta from "quill";
import { AuthService } from "./authService";
import { getCookie } from "../utils/cookie";

// Event handlers type definitions
export type DocumentContentHandler = (content: string) => void;
export type DocumentTitleHandler = (title: string) => void;
export type UserListHandler = (users: Record<string, string>) => void;
export type TextChangeHandler = (delta: any, userId: string) => void;
export type CursorChangeHandler = (userId: string, cursorData: any) => void;
export type DocumentHistoryHandler = (history: any[]) => void;
export type ConnectionStatusHandler = (status: boolean) => void;
export type ErrorHandler = (error: string) => void;

export class SocketService {
  // Socket instance
  public socket: Socket | null = null;
  public connected = ref(false);
  private readonly eventHandlers: Record<
    string,
    Array<(...args: any[]) => void>
  > = {};
  // Socket event constants that match backend events
  private readonly SOCKET_EVENTS = {
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    CONNECT_ERROR: "connect_error",
    RECONNECT_ERROR: "reconnect_error",
    AUTH_STATUS: "auth-status",
    DOCUMENT_CONTENT: "document-content",
    DOCUMENT_TITLE: "title-change", // Changed to match backend
    LOAD_DOCUMENT: "load-document", // Added to match backend
    USER_LIST: "user-list",
    USER_JOINED: "user-joined",
    USER_LEFT: "user-left",
    TEXT_CHANGE: "text-change",
    CURSOR_CHANGE: "cursor-move", // Changed to match backend
    DOCUMENT_HISTORY: "document-history",
    ERROR: "error",
  };

  /**
   * Connect to the socket server
   * @param url Socket server URL
   * @returns Socket instance
   */
  async connect(url: string): Promise<Socket> {
    if (this.socket) {
      console.log("Socket already connected");
      return Promise.resolve(this.socket);
    }

    console.log("Connecting to socket server:", url);

    // Get current auth token from cookie
    const authToken = getCookie("auth_token");
    console.info("Auth token for socket:", authToken ? "Present" : "Not present");

    // Initialize socket connection
    this.socket = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: authToken || undefined,
      },
    });

    console.log("Socket connection established");
    this.setupSocketEvents();
    return this.socket;
  }

  /**
   * Setup default socket event handlers
   */
  private setupSocketEvents() {
    if (!this.socket) return;

    // Connection status events
    this.socket.on(this.SOCKET_EVENTS.CONNECT, () => {
      console.log("Connected to socket server");
      this.connected.value = true;
      this.triggerEventHandlers(this.SOCKET_EVENTS.CONNECT, true);
    });

    this.socket.on(this.SOCKET_EVENTS.DISCONNECT, () => {
      console.log("Disconnected from socket server");
      this.connected.value = false;
      this.triggerEventHandlers(this.SOCKET_EVENTS.DISCONNECT, false);
    });

    this.socket.on(this.SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error("Socket connection error:", error);
      this.connected.value = false;
      this.triggerEventHandlers(this.SOCKET_EVENTS.CONNECT_ERROR, error);
    });

    this.socket.on(this.SOCKET_EVENTS.RECONNECT_ERROR, (error) => {
      console.error("Socket reconnect error:", error);
      this.connected.value = false;
      this.triggerEventHandlers(this.SOCKET_EVENTS.RECONNECT_ERROR, error);
    });

    // Document-related events
    // Listen for both document-content and load-document events
    this.socket.on(this.SOCKET_EVENTS.DOCUMENT_CONTENT, (content: string) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.DOCUMENT_CONTENT, content);
    });

    // Handle load-document event from backend
    this.socket.on(this.SOCKET_EVENTS.LOAD_DOCUMENT, (content: string, deltas: any[]) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.DOCUMENT_CONTENT, content);
      if (deltas) {
        this.triggerEventHandlers(this.SOCKET_EVENTS.DOCUMENT_HISTORY, deltas);
      }
    });

    this.socket.on(this.SOCKET_EVENTS.DOCUMENT_TITLE, (title: string) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.DOCUMENT_TITLE, title);
    });

    this.socket.on(
      this.SOCKET_EVENTS.USER_LIST,
      (users: Record<string, string>) => {
        this.triggerEventHandlers(this.SOCKET_EVENTS.USER_LIST, users);
      }
    );

    this.socket.on(
      this.SOCKET_EVENTS.USER_JOINED,
      (socketId: string, userName: string) => {
        this.triggerEventHandlers(
          this.SOCKET_EVENTS.USER_JOINED,
          socketId,
          userName
        );
      }
    );

    this.socket.on(this.SOCKET_EVENTS.USER_LEFT, (socketId: string) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.USER_LEFT, socketId);
    });

    this.socket.on(
      this.SOCKET_EVENTS.TEXT_CHANGE, 
      (documentId: string, delta: any, source: string, userId: string) => {
        this.triggerEventHandlers(
          this.SOCKET_EVENTS.TEXT_CHANGE,
          delta,
          userId
        );
      }
    );

    this.socket.on(
      this.SOCKET_EVENTS.CURSOR_CHANGE,
      (userId: string, cursorData: any) => {
        this.triggerEventHandlers(
          this.SOCKET_EVENTS.CURSOR_CHANGE,
          userId,
          cursorData
        );
      }
    );

    this.socket.on(this.SOCKET_EVENTS.DOCUMENT_HISTORY, (history: any[]) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.DOCUMENT_HISTORY, history);
    });

    this.socket.on(this.SOCKET_EVENTS.ERROR, (error: string) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.ERROR, error);
    });

    this.socket.on(
      this.SOCKET_EVENTS.AUTH_STATUS,
      (result: { authenticated: boolean; userId: string }) => {
        this.triggerEventHandlers(this.SOCKET_EVENTS.AUTH_STATUS, result);
      }
    );
  }

  /**
   * Register event handlers
   */
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Remove event handler
   */
  off(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers[event]) return;
    const index = this.eventHandlers[event].indexOf(handler);
    if (index !== -1) {
      this.eventHandlers[event].splice(index, 1);
    }
  }

  /**
   * Trigger all registered handlers for an event
   */
  private triggerEventHandlers(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach((handler) => handler(...args));
  }

  /**
   * Join a document room
   */
  joinDocument(documentId: string, userName: string, userId: string): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot join document");
      return;
    }
    console.error(`Joining document ${documentId} as ${userName} (${userId})`);
    this.socket.emit("join-document", documentId, userName, userId);
  }

  /**
   * Create a new document
   */
  createDocument(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected, cannot create document"));
        return;
      }

      this.socket.emit("create-document", userId, (response: string) => {
        if (response.startsWith("Error:")) {
          reject(new Error(response));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send a text change to the server
   */
  sendTextChange(
    documentId: string,
    delta: Delta,
    source: string,
    userId: string,
    content: Delta
  ): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot send text change");
      return;
    }
    console.warn(
      "Sending text change to server",
      documentId,
      delta,
      source,
      userId,
      content
    );
    // Ensure parameters match backend's expected order
    this.socket.emit("text-change", documentId, delta, source, userId, content);
  }

  /**
   * Update document title
   */
  updateTitle(title: string): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot update title");
      return;
    }
    
    // Get current document ID from active document
    const documentId = this.getCurrentDocumentId();
    if (!documentId) {
      console.error("No active document, cannot update title");
      return;
    }
    
    // Updated to match backend's expected parameters
    this.socket.emit("title-change", documentId, title);
  }

  /**
   * Send cursor position update
   */
  sendCursorUpdate(position: any): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot send cursor update");
      return;
    }
    
    // Get current document ID and user ID
    const documentId = this.getCurrentDocumentId();
    const userId = position.userId;
    
    if (!documentId) {
      console.error("No active document, cannot send cursor update");
      return;
    }
    
    // Updated to match backend's expected event and parameters
    this.socket.emit("cursor-move", documentId, position, userId);
  }

  /**
   * Helper function to get the current document ID
   */
  private getCurrentDocumentId(): string | null {
    // Try to get the document ID from the URL
    const path = window.location.pathname;
    const matches = path.match(/\/documents\/([a-zA-Z0-9-]+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
    
    // If not found in URL, return null
    return null;
  }

  /**
   * Request document history
   */
  getDocumentHistory(): Promise<any[]> {
    if (!this.socket) {
      console.error("Socket not connected, cannot get document history");
      return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
      this.socket?.emit("get-document-history", (history: any[]) => {
        if (history) {
          resolve(history);
        } else {
          reject(new Error("Failed to retrieve document history"));
        }
      });
    });
  }

  /**
   * Get users for a document
   */
  getUsers(documentId: string): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot get users");
      return;
    }
    this.socket.emit("get-users", documentId);
  }

  /**
   * Leave a document
   */
  leaveDocument(): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot leave document");
      return;
    }
    this.socket.emit("leave-document");
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      // Send user id before disconnecting
      if (this.socket.connected) {
        const userId = localStorage.getItem("userId");
        if (userId) {
          this.socket.emit("user-disconnect", userId);
        }
      }
      this.socket.disconnect();
      this.socket = null;
      this.connected.value = false;

      // Clear all event handlers
      Object.keys(this.eventHandlers).forEach((event) => {
        this.eventHandlers[event] = [];
      });
    }
  }

  /**
   * Update authentication token
   */
  updateAuthToken(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      // Reconnect to apply the new token
      this.socket.disconnect().connect();
    }
  }
}

// Create a singleton instance
export const socketService = new SocketService();
