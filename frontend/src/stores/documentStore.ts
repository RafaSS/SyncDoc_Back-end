import { defineStore } from "pinia";
import { ref } from "vue";
import { v4 as uuid } from "uuid";
import { useSocketStore } from "./socketStore";
import { AuthService } from "../services/authService";
import type { Document } from "../types";
import QuillCursors from "quill-cursors";

export const useDocumentStore = defineStore("document", () => {
  // State
  const connected = ref(false);
  const userId = ref("");
  const userName = ref("");
  const initialized = ref(false);
  const document = ref<Document>({
    id: "",
    title: "Untitled Document",
    content: "",
    users: {},
    deltas: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const quillInstance = ref<any>(null);
  const remoteCursors = ref<Record<string, any>>({});
  const activeUsers = ref<Record<string, string>>({});
  const userColors = ref<Record<string, string>>({});
  const updateReceived = ref(false);
  const socketStore = useSocketStore();

  /**
   * Initialize the document store
   * This should be called before any other methods
   */
  async function initialize() {
    if (initialized.value) {
      console.log("Document store already initialized");
      return;
    }

    console.log("Initializing document store...");

    // Initialize the socket store if not already done
    if (!socketStore.initialized) {
      socketStore.initialize();
    }

    // Initialize the user ID from auth if available
    await initializeUserId();

    initialized.value = true;
    console.log("Document store initialized successfully");
  }

  /**
   * Initialize socket connection
   */
  function initializeSocket(url: string) {
    if (!initialized.value) {
      console.warn(
        "Document store used before initialization! Initializing now..."
      );
      initialize();
    }

    // Connect to socket server using socketStore
    socketStore.connect(url);

    // Register socket event handlers
    setupSocketHandlers();
  }

  /**
   * Set up all socket event handlers
   */
  function setupSocketHandlers() {
    // Connection events
    socketStore.on("connect", (isConnected) => {
      connected.value = isConnected;
      console.log("Socket connection status:", isConnected);
    });

    socketStore.on("disconnect", () => {
      connected.value = false;
    });

    // Document content
    socketStore.on("document-content", (content: string) => {
      if (!content) {
        console.log("Received empty document content");
        quillInstance.value?.getQuill()?.setText("");
        quillInstance.value?.getQuill()?.enable();
        return;
      }
      document.value.content = content; // Store original content

      // Update Quill if it exists
      if (quillInstance.value) {
        console.log("Updating Quill with document content");
        try {
          const contentObj =
            typeof content === "string" ? JSON.parse(content) : content;
          quillInstance.value.getQuill().setContents(contentObj);
          quillInstance.value.getQuill()?.enable();
        } catch (error) {
          console.error("Error parsing document content:", error);
          quillInstance.value
            .getQuill()
            .setText("Error loading document content");
        }
      }
    });

    // Document title
    socketStore.on("document-title", (title: string) => {
      document.value.title = title;
    });

    // User list
    socketStore.on("user-list", (users: Record<string, string>) => {
      // Handle empty or missing user list
      if (!users) {
        console.log("Received empty user list from server");
        document.value.users = {};
        return;
      }

      // Process the user list
      console.log("Received user list from server:", users);
      document.value.users = users;

      // Track active users for cursor colors
      activeUsers.value = { ...users };

      // Update UI with user colors
      updateUserColors(Object.keys(users));

      // Announce in console when visitors join (users without auth)
      Object.entries(users).forEach(([id, name]) => {
        if (!id.includes("-")) {
          // UUID format check
          console.log(`Visitor ${name} is viewing the document`);
        }
      });
    });

    // Document history
    socketStore.on("document-history", (history: any[]) => {
      console.log("Received document history:", history);
      document.value.deltas = history;
    });

    // Text changes from other users
    socketStore.on("text-change", (delta: any, socketId: string) => {
      if (socketId === userId.value) return; // Ignore own changes

      console.log("Received text change from:", socketId);
      updateReceived.value = true;

      if (quillInstance.value) {
        try {
          quillInstance.value.getQuill().updateContents(delta);
        } catch (error) {
          console.error("Error applying remote text change:", error);
        }
      }

      updateReceived.value = false;
    });

    // Cursor updates from other users
    socketStore.on("cursor-change", (userId: string, cursorData: any) => {
      if (!quillInstance.value) return;

      console.log("Cursor change from:", userId);
      updateRemoteCursor(userId, cursorData);
    });

    // User joined notification
    socketStore.on("user-joined", (socketId: string, userName: string) => {
      console.log(`User ${userName} joined with socket ID ${socketId}`);
    });

    // User left notification
    socketStore.on("user-left", (socketId: string) => {
      console.log(`User with socket ID ${socketId} left`);
      if (remoteCursors.value[socketId]) {
        delete remoteCursors.value[socketId];
      }
    });

    // Authentication status
    socketStore.on(
      "auth-status",
      (result: { authenticated: boolean; userId: string }) => {
        if (result.authenticated && result.userId) {
          userId.value = result.userId;
        }
      }
    );
  }

  // Store the Quill instance for later use
  function setQuillInstance(quillComponentOrInstance: any, documentId: string) {
    quillInstance.value = quillComponentOrInstance;
    document.value.id = documentId;

    // Configure Quill with cursors module
    const quill = quillInstance.value.getQuill();
    if (quill) {
      // Initialize cursor module if needed
      if (!quill.getModule("cursors")) {
        new QuillCursors(quill, {
          hideDelayMs: 5000,
          transformOnTextChange: true,
        });
      }
    }
    joinDocument(document.value.id);
    console.log("Joined document:", document.value.id);
  }

  // Join a document
  function joinDocument(documentId: string) {
    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return;
    }
    console.log("Joining document:", documentId, userId.value);
    document.value.id = documentId;
    socketStore.joinDocument(documentId, userName.value, userId.value);
  }

  // Create a new document
  async function createNewDocument() {
    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return;
    }

    try {
      const newDocumentId = await socketStore.createDocument(userId.value);
      console.log("Created new document with ID:", newDocumentId);
      return newDocumentId;
    } catch (error) {
      console.error("Error creating document:", error);
      throw error;
    }
  }

  // Send text changes to the server
  function sendTextChange(delta: any, source: string, content: string) {
    if (source !== "user" || updateReceived.value) return;

    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return;
    }

    socketStore.sendTextChange(delta, source, content);
  }

  // Update document title
  function updateTitle(title: string) {
    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return;
    }

    document.value.title = title;
    socketStore.updateTitle(title);
  }

  // Send cursor position to server
  function moveCursor(position: any) {
    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return;
    }

    socketStore.sendCursorUpdate(position);
  }

  // Leave the current document
  function leaveDocument() {
    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return;
    }

    socketStore.leaveDocument();
    resetDocument();
  }

  // Get document history
  function getDocumentHistory() {
    if (!socketStore.connected) {
      console.error("Socket is not connected");
      return [{}];
    }

    return socketStore.getDocumentHistory();
  }

  // Helper functions
  function resetDocument() {
    document.value = {
      id: "",
      title: "Untitled Document",
      content: "",
      users: {},
      deltas: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    activeUsers.value = {};
    remoteCursors.value = {};
  }

  // Initialize userId from auth service if available
  async function initializeUserId() {
    try {
      const user = await AuthService.getUser();
      if (user) {
        userId.value = user.id;
        userName.value = user.email?.split("@")[0] || "Anonymous";
        console.log("Using authenticated user ID:", userId.value);
      } else {
        userId.value = generateTemporaryUserId();
        userName.value = localStorage.getItem("userName") || "Anonymous";
        console.log("Using temporary user ID:", userId.value);
      }

      // Store the username in localStorage for persistence
      localStorage.setItem("userName", userName.value);
    } catch (error) {
      console.error("Error getting user data:", error);
      userId.value = generateTemporaryUserId();
      userName.value = localStorage.getItem("userName") || "Anonymous";
      localStorage.setItem("userName", userName.value);
    }
  }

  // Generate a temporary user ID for non-authenticated users
  function generateTemporaryUserId(): string {
    return `${uuid()}`;
  }

  function updateUserColors(userIds: string[]) {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEEAD",
      "#FF6F69",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEEAD",
    ];

    userIds.forEach((id, index) => {
      userColors.value[id] = colors[index % colors.length];
    });
  }

  function updateRemoteCursor(remoteUserId: string, cursorPosition: any) {
    remoteCursors.value[remoteUserId] = cursorPosition;
  }

  function disconnect() {
    socketStore.disconnect();
    connected.value = false;
  }

  // Expose state and methods
  return {
    connected,
    document,
    userId,
    userName,
    userColors,
    remoteCursors,
    quillInstance,
    activeUsers,
    initialized,
    initialize,
    initializeSocket,
    setQuillInstance,
    joinDocument,
    createNewDocument,
    sendTextChange,
    updateTitle,
    moveCursor,
    leaveDocument,
    getDocumentHistory,
    disconnect,
    updateUserColors,
    updateRemoteCursor,
  };
});
