import { defineStore } from "pinia";
import { Socket, io } from "socket.io-client";
import { ref } from "vue";
import type Delta from "quill";
import { AuthService } from "../services/authService";

// Event handlers type definitions
export type DocumentContentHandler = (content: string) => void;
export type DocumentTitleHandler = (title: string) => void;
export type UserListHandler = (users: Record<string, string>) => void;
export type TextChangeHandler = (delta: any, userId: string) => void;
export type CursorChangeHandler = (userId: string, cursorData: any) => void;
export type DocumentHistoryHandler = (history: any[]) => void;
export type ConnectionStatusHandler = (status: boolean) => void;
export type ErrorHandler = (error: string) => void;

/**
 * Pinia store for socket operations
 * Ensures socket is initialized only once and properly managed
 */
export const useSocketStore = defineStore("socket", () => {
  // State
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const initialized = ref(false);
  const eventHandlers = ref<Record<string, Array<(...args: any[]) => void>>>(
    {}
  );

  // Socket event constants
  const SOCKET_EVENTS = {
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
   * Initialize the socket store
   * This only needs to be called once
   */
  function initialize() {
    if (initialized.value) {
      console.log("Socket store already initialized");
      return;
    }

    console.log("Initializing socket store...");
    initialized.value = true;
    console.log("Socket store initialized successfully");
  }

  /**
   * Connect to the socket server
   * @param url Socket server URL
   * @returns Socket instance
   */
  async function connect(url: string): Promise<Socket | null> {
    if (socket.value) {
      console.log("Socket already connected");
      return socket.value;
    }

    if (!initialized.value) {
      console.warn(
        "Socket store used before initialization! Initializing now..."
      );
      initialize();
    }

    console.log("Connecting to socket server:", url);

    // Get current session token if available
    const getSessionToken = async () => {
      try {
        const session = await AuthService.getSession();
        console.error("Session token:", session);
        return session?.user?.id;
      } catch (error) {
        console.error("Error getting session token:", error);
        return null;
      }
    };
    console.table({ url, token: await getSessionToken() });
    // Initialize socket connection
    socket.value = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: (await getSessionToken()) || undefined,
      },
    });

    console.log("Socket connection established");
    setupSocketEvents();
    return socket.value;
  }

  /**
   * Setup default socket event handlers
   */
  function setupSocketEvents() {
    if (!socket.value) return;

    // Connection status events
    socket.value.on(SOCKET_EVENTS.CONNECT, () => {
      console.log("Connected to socket server");
      connected.value = true;
      triggerEventHandlers(SOCKET_EVENTS.CONNECT, true);
    });

    socket.value.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log("Disconnected from socket server");
      connected.value = false;
      triggerEventHandlers(SOCKET_EVENTS.DISCONNECT, false);
    });

    socket.value.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error("Socket connection error:", error);
      connected.value = false;
      triggerEventHandlers(SOCKET_EVENTS.CONNECT_ERROR, error);
    });

    socket.value.on(SOCKET_EVENTS.RECONNECT_ERROR, (error) => {
      console.error("Socket reconnect error:", error);
      connected.value = false;
      triggerEventHandlers(SOCKET_EVENTS.RECONNECT_ERROR, error);
    });

    // Document-related events
    socket.value.on(SOCKET_EVENTS.DOCUMENT_CONTENT, (content: string) => {
      triggerEventHandlers(SOCKET_EVENTS.DOCUMENT_CONTENT, content);
    });

    socket.value.on(SOCKET_EVENTS.DOCUMENT_TITLE, (title: string) => {
      triggerEventHandlers(SOCKET_EVENTS.DOCUMENT_TITLE, title);
    });

    socket.value.on(
      SOCKET_EVENTS.USER_LIST,
      (users: Record<string, string>) => {
        triggerEventHandlers(SOCKET_EVENTS.USER_LIST, users);
      }
    );

    socket.value.on(
      SOCKET_EVENTS.USER_JOINED,
      (socketId: string, userName: string) => {
        triggerEventHandlers(SOCKET_EVENTS.USER_JOINED, socketId, userName);
      }
    );

    socket.value.on(SOCKET_EVENTS.USER_LEFT, (socketId: string) => {
      triggerEventHandlers(SOCKET_EVENTS.USER_LEFT, socketId);
    });

    socket.value.on(SOCKET_EVENTS.TEXT_CHANGE, (delta: any, userId: string) => {
      triggerEventHandlers(SOCKET_EVENTS.TEXT_CHANGE, delta, userId);
    });

    socket.value.on(
      SOCKET_EVENTS.CURSOR_CHANGE,
      (userId: string, cursorData: any) => {
        triggerEventHandlers(SOCKET_EVENTS.CURSOR_CHANGE, userId, cursorData);
      }
    );

    socket.value.on(SOCKET_EVENTS.DOCUMENT_HISTORY, (history: any[]) => {
      triggerEventHandlers(SOCKET_EVENTS.DOCUMENT_HISTORY, history);
    });

    socket.value.on(SOCKET_EVENTS.ERROR, (error: string) => {
      triggerEventHandlers(SOCKET_EVENTS.ERROR, error);
    });

    socket.value.on(
      SOCKET_EVENTS.AUTH_STATUS,
      (result: { authenticated: boolean; userId: string }) => {
        triggerEventHandlers(SOCKET_EVENTS.AUTH_STATUS, result);
      }
    );
  }

  /**
   * Register event handlers
   */
  function on(event: string, handler: (...args: any[]) => void): void {
    if (!eventHandlers.value[event]) {
      eventHandlers.value[event] = [];
    }
    eventHandlers.value[event].push(handler);
  }

  /**
   * Remove event handler
   */
  function off(event: string, handler: (...args: any[]) => void): void {
    if (!eventHandlers.value[event]) return;
    const index = eventHandlers.value[event].indexOf(handler);
    if (index !== -1) {
      eventHandlers.value[event].splice(index, 1);
    }
  }

  /**
   * Trigger all registered handlers for an event
   */
  function triggerEventHandlers(event: string, ...args: any[]): void {
    const handlers = eventHandlers.value[event] || [];
    handlers.forEach((handler) => handler(...args));
  }

  /**
   * Join a document room
   */
  function joinDocument(
    documentId: string,
    userName: string,
    userId: string
  ): void {
    if (!socket.value) {
      console.error("Socket not connected, cannot join document");
      return;
    }
    console.log(`Joining document ${documentId} as ${userName} (${userId})`);
    socket.value.emit("join-document", documentId, userName, userId);
  }

  /**
   * Create a new document
   */
  function createDocument(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!socket.value) {
        reject(new Error("Socket not connected, cannot create document"));
        return;
      }

      socket.value.emit("create-document", userId, (response: string) => {
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
  function sendTextChange(delta: Delta, source: string, content: string): void {
    if (!socket.value) {
      console.error("Socket not connected, cannot send text change");
      return;
    }
    socket.value.emit("text-change", delta, source, content);
  }

  /**
   * Update document title
   */
  function updateTitle(title: string): void {
    if (!socket.value) {
      console.error("Socket not connected, cannot update title");
      return;
    }
    socket.value.emit("update-title", title);
  }

  /**
   * Send cursor position update
   */
  function sendCursorUpdate(position: any): void {
    if (!socket.value) {
      console.error("Socket not connected, cannot send cursor update");
      return;
    }
    socket.value.emit("cursor-change", position);
  }

  /**
   * Request document history
   */
  function getDocumentHistory(): Promise<any[]> {
    if (!socket.value) {
      console.error("Socket not connected, cannot get document history");
      return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
      socket.value?.emit("get-document-history", (history: any[]) => {
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
  function getUsers(documentId: string): void {
    if (!socket.value) {
      console.error("Socket not connected, cannot get users");
      return;
    }
    socket.value.emit("get-users", documentId);
  }

  /**
   * Leave a document
   */
  function leaveDocument(): void {
    if (!socket.value) {
      console.error("Socket not connected, cannot leave document");
      return;
    }
    socket.value.emit("leave-document");
  }

  /**
   * Disconnect from the socket server
   */
  function disconnect(): void {
    if (socket.value) {
      // Send user id before disconnecting
      if (socket.value.connected) {
        const userId = localStorage.getItem("userId");
        if (userId) {
          socket.value.emit("user-disconnect", userId);
        }
      }
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;

      // Clear all event handlers
      Object.keys(eventHandlers.value).forEach((event) => {
        eventHandlers.value[event] = [];
      });
    }
  }

  /**
   * Update authentication token
   */
  function updateAuthToken(token: string): void {
    if (socket.value) {
      socket.value.auth = { token };
      // Reconnect to apply the new token
      socket.value.disconnect().connect();
    }
  }

  // Expose state and methods
  return {
    socket,
    connected,
    initialized,
    initialize,
    connect,
    on,
    off,
    joinDocument,
    createDocument,
    sendTextChange,
    updateTitle,
    sendCursorUpdate,
    getDocumentHistory,
    getUsers,
    leaveDocument,
    disconnect,
    updateAuthToken,
    SOCKET_EVENTS,
  };
});
