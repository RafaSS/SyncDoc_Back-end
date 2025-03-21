// documentStore.ts
import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { SocketService } from "../services/socketService.ts";
import type { Document, Delta, CursorPosition } from "../types";

export const useDocumentStore = defineStore("document", () => {
  // State
  const socketService = new SocketService();
  const userId = ref(generateUserId());
  const document = reactive<Document>({
    id: "",
    title: "Untitled Document",
    content: null,
    users: {},
    deltas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const documentHistory = ref<any[]>([]);
  const userColors: Record<string, string> = {};

  // Initialize socket once
  function initializeSocket(url: string) {
    if (!socketService.socket) {
      socketService.connect(url);
      const socket = socketService.socket;
      if (socket) {
        setupSocketHandlers(socket);
      }
    }
  }

  // Socket event handlers
  function setupSocketHandlers(socket: any) {
    socket.on("load-document", (content: any) => {
      document.content = content;
    });

    socket.on("document-title", (title: string) => {
      document.title = title;
    });

    socket.on("user-list", (users: Record<string, string>) => {
      document.users = users;
      updateUserColors(Object.keys(users));
    });

    socket.on("document-history", (history: any[]) => {
      documentHistory.value = history;
    });

    // Set up authentication handler
    socket.on(
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
    if (!socketService.socket) return;
    console.log("Joining document:", documentId, userId.value);
    document.id = documentId;
    const userName = localStorage.getItem("userName") || "Anonymous";
    socketService.socket.emit(
      "join-document",
      documentId,
      userName,
      userId.value
    );
  }

  async function createNewDocument() {
    if (!socketService.socket) return;

    return new Promise((resolve, reject) => {
      socketService.socket!.emit(
        "create-document",
        userId.value,
        (response: string) => {
          if (response.startsWith("Error:")) {
            console.error("Error creating document:", response);
            reject(new Error(response));
          } else {
            console.log("Document created with ID:", response);
            resetDocument();
            document.id = response;
            resolve(response);
          }
        }
      );
    });
  }

  function sendTextChange(delta: Delta, source: string, content: any) {
    if (!socketService.socket || !document.id) return;

    socketService.socket.emit(
      "text-change",
      document.id,
      delta,
      source,
      JSON.stringify(content)
    );
  }

  function updateContent(content: any) {
    if (content) {
      document.content = content;
    }
  }

  function updateUserList(users: Record<string, string>) {
    document.users = users;
    updateUserColors(Object.keys(users));
  }

  function updateDocumentHistory(history: any[]) {
    documentHistory.value = history;
  }

  function updateTitle(title: string) {
    document.title = title;
  }

  function moveCursor(position: CursorPosition) {
    if (!socketService.socket || !document.id) return;
    socketService.socket.emit("cursor-move", document.id, position);
  }

  function leaveDocument() {
    if (!socketService.socket || !document.id) return;
    socketService.socket.emit("leave-document", document.id);
    resetDocument();
  }

  // Helper functions
  function resetDocument() {
    document.id = "";
    document.title = "Untitled Document";
    document.content = null;
    document.users = {};
    documentHistory.value = [];
  }

  function generateUserId(): string {
    const storedId = localStorage.getItem("userId");
    if (storedId) return storedId;

    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("userId", newId);
    return newId;
  }

  function updateUserColors(userIds: string[]) {
    userIds.forEach((id) => {
      if (!userColors[id]) {
        userColors[id] = `#${Math.floor(Math.random() * 16777215).toString(
          16
        )}`;
      }
    });
  }

  // Authentication
  function authenticateUser(token: string) {
    if (!socketService.socket) return;

    return new Promise((resolve, reject) => {
      socketService.socket!.emit(
        "auth",
        token,
        (error: string | null, data?: any) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve(data);
          }
        }
      );
    });
  }

  return {
    userId,
    document,
    documentHistory,
    userColors,
    connected: socketService.connected,
    socket: socketService.socket,
    updateContent,
    initializeSocket,
    joinDocument,
    createNewDocument,
    sendTextChange,
    updateTitle,
    moveCursor,
    leaveDocument,
    updateUserColors,
    updateUserList,
    updateDocumentHistory,
    authenticateUser,
  };
});
