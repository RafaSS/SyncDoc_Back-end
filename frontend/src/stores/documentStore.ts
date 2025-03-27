import { defineStore } from "pinia";
import { ref } from "vue";
import { v4 as uuid } from "uuid";
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

    // Initialize the user ID from auth if available
    await initializeUserId();

    initialized.value = true;
    console.log("Document store initialized successfully");
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

  // Handle document content updates from socket
  function updateDocumentContent(content: string) {
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
  }

  // Handle document title updates
  function updateDocumentTitle(title: string) {
    document.value.title = title;
  }

  // Handle user list updates
  function updateUserList(users: Record<string, string>) {
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
  }

  // Handle text changes from other users
  function handleRemoteTextChange(delta: any, socketId: string) {
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
  }

  // Handle document history
  function updateDocumentHistory(history: any[]) {
    console.log("Received document history:", history);
    document.value.deltas = history;
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
    setQuillInstance,
    resetDocument,
    updateUserColors,
    updateRemoteCursor,
    updateDocumentContent,
    updateDocumentTitle,
    updateUserList,
    handleRemoteTextChange,
    updateDocumentHistory
  };
});
