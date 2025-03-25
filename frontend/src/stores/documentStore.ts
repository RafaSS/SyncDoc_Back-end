import { defineStore } from "pinia";
import { ref } from "vue";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./authStore";
import { v4 as uuid } from "uuid";
import type { Document, Delta, CursorPosition } from "../types";
import { QuillEditor } from "@vueup/vue-quill";
import QuillCursors from "quill-cursors";

export const useDocumentStore = defineStore("document", () => {
  // State
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const userId = ref("");
  const userName = ref("");
  const document = ref<Document>({
    id: "",
    title: "Untitled Document",
    content: "",
    users: {},
    deltas: [],
    created_at: "",
    updated_at: "",
  });

  const documentHistory = ref<any[]>([]);
  const userColors = ref<Record<string, string>>({});
  const remoteCursors = ref<Record<string, any>>({});
  const quillInstance = ref<any>(null);

  const authStore = useAuthStore();

  // Initialize socket once
  function initializeSocket(url: string) {
    if (socket.value) {
      console.log("Socket already initialized");
      return;
    }

    console.log("Initializing socket connection to", url);
    socket.value = io(url, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    connected.value = true;

    // Initialize the user ID from auth if available, otherwise generate one
    initializeUserId();

    // Set up socket event handlers
    setupSocketHandlers();
  }

  // Store the Quill instance for later use
  function setQuillInstance(
    quillComponentOrInstance: InstanceType<typeof QuillEditor>,
    documentId: string
  ) {
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

  // Socket event handlers
  function setupSocketHandlers() {
    if (!socket.value) return;

    // Rejoin document if we were previously connected
    if (document.value.id) {
      joinDocument(document.value.id);
    }

    socket.value.on("load-document", (content: string, deltas: any[]) => {
      documentHistory.value = deltas;
      console.log("Store received document content:", content);
      // Validate content
      if (!content) {
        console.log("Invalid document content received");
        quillInstance.value?.getQuill()?.setText("");
        quillInstance.value?.getQuill()?.enable();
        return;
      }
      document.value.content = content; // Store original content

      // Update Quill if it exists
      if (quillInstance.value) {
        console.log("Updating Quill with document content", content);
        quillInstance.value.getQuill().setContents(JSON.parse(content));
        quillInstance.value.getQuill()?.enable();
      }
    });

    socket.value.on("document-title", (title: string) => {
      document.value.title = title;
    });

    socket.value.on("user-list", (users: Record<string, string>) => {
      document.value.users = users;
      updateUserColors(Object.keys(users));
    });

    socket.value.on("document-history", (history: any[]) => {
      documentHistory.value = history;
    });

    socket.value.on(
      "text-change",
      async (
        docId: string,
        delta: Delta,
        source: string,
        userIdClient: string,
        content: string
      ) => {
        console.log(
          "Text change received:😁😁😁",
          docId,
          delta,
          source,
          userIdClient,
          content
        );
        console.log("Quill instance:", userIdClient, userId.value);
        if (quillInstance.value && userIdClient !== userId.value) {
          console.log("Updating Quill content:", delta.ops);
          await quillInstance.value.getQuill().updateContents(delta.ops);
        }
      }
    );

    socket.value.on("title-change", (title: string) => {
      document.value.title = title;
    });

    socket.value.on("cursor-move", (userId: string, cursorPosition: any) => {
      updateRemoteCursor(userId, cursorPosition);
    });

    socket.value.on("user-joined", (socketId: string, userName: string) => {
      // Show notification or update UI when a user joins
      console.log(`${userName} joined the document`);
      updateUserColors([socketId]);
    });

    socket.value.on("user-left", (socketId: string, userName: string) => {
      // Remove user cursor and update UI when a user leaves
      if (remoteCursors.value[socketId]) {
        delete remoteCursors.value[socketId];
      }
      console.log(`${userName} left the document`);
    });

    // Authentication handler
    socket.value.on(
      "auth-result",
      (result: { authenticated: boolean; userId: string }) => {
        if (result.authenticated && result.userId) {
          userId.value = result.userId;
        }
      }
    );
  }

  // Actions
  function joinDocument(documentId: string) {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }
    console.log("Joining document:", documentId, userId.value);
    document.value.id = documentId;
    socket.value.emit(
      "join-document",
      documentId,
      userName.value,
      userId.value
    );
  }

  async function createNewDocument() {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }

    return new Promise((resolve, reject) => {
      socket.value?.emit(
        "create-document",
        userId.value,
        (response: string) => {
          if (response.startsWith("Error:")) {
            console.error("Error creating document:", response);
            reject(new Error(response));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async function sendTextChange(delta: Delta, source: string, content: string) {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }

    socket.value.emit(
      "text-change",
      document.value.id,
      delta,
      source,
      userId.value,
      content
    );
  }

  function updateTitle(title: string) {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }

    socket.value.emit("title-change", document.value.id, title);
  }

  function moveCursor(position: CursorPosition) {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }

    socket.value.emit("cursor-move", document.value.id, position);
  }

  function leaveDocument() {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }

    socket.value.emit("leave-document", document.value.id);
  }

  function getDocumentHistory() {
    return documentHistory.value;
  }

  // Helper functions
  function resetDocument() {
    document.value.id = "";
    document.value.title = "Untitled Document";
    document.value.content = "";
    document.value.users = {};
    document.value.deltas = [];
    document.value.created_at = "";
    document.value.updated_at = "";

    // Clear remote cursors
    remoteCursors.value = {};
  }

  // Initialize userId from auth store if available, otherwise generate a temporary ID
  async function initializeUserId() {
    if (authStore.isLoggedIn && authStore.user?.id) {
      userId.value = authStore.user.id;
      userName.value = authStore.user.email?.split("@")[0] || "Anonymous";
      console.log("Using authenticated user ID:", userId.value);
    } else {
      userId.value = generateTemporaryUserId();
      userName.value = localStorage.getItem("userName") || "Anonymous";
      console.log("Using temporary user ID:", userId.value);
    }

    // Store the username in localStorage for persistence
    localStorage.setItem("userName", userName.value);
  }

  // Only used as a fallback when auth is not available
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

    userIds.forEach((userId, index) => {
      userColors.value[userId] = colors[index % colors.length];
    });
  }

  function updateRemoteCursor(remoteUserId: string, cursorPosition: any) {
    if (!quillInstance.value) return;

    const quill = quillInstance.value.getQuill();
    if (!quill) return;

    const cursor = quill.getModule("cursors").getCursor(remoteUserId);
    if (!cursor) return;

    cursor.update(cursorPosition);
  }

  return {
    socket,
    connected,
    userId,
    document,
    documentHistory,
    userColors,
    remoteCursors,
    quillInstance,
    initializeSocket,
    setQuillInstance,
    joinDocument,
    createNewDocument,
    sendTextChange,
    updateTitle,
    moveCursor,
    leaveDocument,
    getDocumentHistory,
    resetDocument,
  };
});
