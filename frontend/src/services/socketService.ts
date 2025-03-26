import { Socket, io } from "socket.io-client";
import { ref } from "vue";
import type Delta from "quill";
import { AuthService } from "./authService";

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
  private readonly SOCKET_EVENTS = {
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    CONNECT_ERROR: "connect_error",
    RECONNECT_ERROR: "reconnect_error",
    AUTH_STATUS: "auth-status",
    DOCUMENT_CONTENT: "document-content",
    DOCUMENT_TITLE: "document-title",
    USER_LIST: "user-list",
    USER_JOINED: "user-joined",
    USER_LEFT: "user-left",
    TEXT_CHANGE: "text-change",
    CURSOR_CHANGE: "cursor-change",
    DOCUMENT_HISTORY: "document-history",
    ERROR: "error",
  };

  /**
   * Connect to the socket server
   * @param url Socket server URL
   * @returns Socket instance
   */
  connect(url: string): Socket {
    if (this.socket) {
      console.log("Socket already connected");
      return this.socket;
    }

    console.log("Connecting to socket server:", url);

    // Get current session token if available
    const getSessionToken = async () => {
      try {
        const session = await AuthService.getSession();
        return session?.access_token;
      } catch (error) {
        console.error("Error getting session token:", error);
        return null;
      }
    };

    // Initialize socket connection
    this.socket = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: getSessionToken() || undefined,
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
    this.socket.on(this.SOCKET_EVENTS.DOCUMENT_CONTENT, (content: string) => {
      this.triggerEventHandlers(this.SOCKET_EVENTS.DOCUMENT_CONTENT, content);
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
      (delta: any, userId: string) => {
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
    console.log(`Joining document ${documentId} as ${userName} (${userId})`);
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
  sendTextChange(delta: Delta, source: string, content: string): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot send text change");
      return;
    }
    this.socket.emit("text-change", delta, source, content);
  }

  /**
   * Update document title
   */
  updateTitle(title: string): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot update title");
      return;
    }
    this.socket.emit("update-title", title);
  }

  /**
   * Send cursor position update
   */
  sendCursorUpdate(position: any): void {
    if (!this.socket) {
      console.error("Socket not connected, cannot send cursor update");
      return;
    }
    this.socket.emit("cursor-change", position);
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
