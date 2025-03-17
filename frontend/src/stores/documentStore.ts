import { defineStore } from "pinia";
import { ref } from "vue";
import { io, Socket } from "socket.io-client";
import type { Delta } from "../types";

interface DocumentState {
  id: string;
  title: string;
  content: any;
  users: Record<string, string>;
}

export const useDocumentStore = defineStore("document", () => {
  // State
  const socket = ref<Socket | null>(null);
  const userId = ref<string>(
    localStorage.getItem("userId") || generateUserId()
  );
  const connected = ref<boolean>(false);
  const document = ref<DocumentState>({
    id: "",
    title: "Untitled Document",
    content: { ops: [] },
    users: {},
  });
  const documentHistory = ref<
    Array<{
      delta: Delta;
      userId: string;
      userName: string;
      timestamp: number;
    }>
  >([]);
  const userColors = ref<Record<string, string>>({});

  // Actions
  function initializeSocket(baseUrl: string) {
    socket.value = io(baseUrl);

    socket.value.on("connect", () => {
      connected.value = true;
    });

    socket.value.on("disconnect", () => {
      connected.value = false;
    });

    socket.value.on("auth", (error: string | null, data?: any) => {
      if (error) {
        console.error("Authentication error:", error);
      }
    });

    socket.value.on("create-document", (documentId: string) => {
      document.value.id = documentId;
      document.value.title = "Untitled Document";
      document.value.content = { ops: [] };
      document.value.users = {};
    });

    socket.value.on("load-document", (content: any) => {
      document.value.content = content;
    });

    socket.value.on("join-document", (documentId: string) => {
      document.value.id = documentId;
      socket.value?.emit("join-document", documentId, userId.value);
      socket.value?.emit("load-document", documentId);
    });

    socket.value.on("title-change", (documentId: string, title: string) => {
      document.value.id = documentId;
      document.value.title = title;
    });

    socket.value.on("text-change", (documentId: string, delta: Delta) => {
      document.value.id = documentId;
      document.value.content = delta;
    });

    socket.value.on("cursor-move", (documentId: string, range: any) => {
      document.value.id = documentId;
      document.value.content = range;
    });

    socket.value.on("user-join", (documentId: string, userName: string) => {
      document.value.id = documentId;
      document.value.users[userName] = userName;
    });

    socket.value.on("user-leave", (documentId: string, userName: string) => {
      document.value.id = documentId;
      delete document.value.users[userName];
    });

    socket.value.on("document-history", (history: any[]) => {
      documentHistory.value = history;
    });
    //on load-document
    socket.value.on("load-document", (content: any) => {
      console.log("Loading document content:", content);
      document.value.content = content;
    });

    // Store userId in localStorage
    localStorage.setItem("userId", userId.value);

    return socket.value;
  }

  function joinDocument(documentId: string) {
    if (!socket.value || !connected.value) return;

    document.value.id = documentId;
    socket.value.emit("join-document", documentId, userId.value);
  }

  function updateTitle(title: string) {
    if (!socket.value || !connected.value) return;

    document.value.title = title;
    socket.value.emit("title-change", document.value.id, title);
  }

  function sendTextChange(delta: Delta, source: string, content: any) {
    if (!socket.value || !connected.value || source !== "user") return;

    socket.value.emit(
      "text-change",
      document.value.id,
      delta,
      source,
      JSON.stringify(content)
    );
  }

  function updateContent(content: any) {
    document.value.content = content;
  }

  function moveCursor(range: any) {
    if (!socket.value || !connected.value) return;

    socket.value.emit("cursor-move", document.value.id, range);
  }

  async function createNewDocument() {
    socket.value?.emit("test");
    console.log("Creating new document...", socket.value, connected.value);
    if (!socket.value || !connected.value) return null;

    const result = socket.value!.emit(
      "create-document",
      (documentId: string) => {
        return documentId;
      }
    );

    console.log("Result:", result);
    return result;
  }

  function updateUserList(users: Record<string, string>) {
    document.value.users = users;

    // Assign colors to users if not already assigned
    Object.keys(users).forEach((id) => {
      if (!userColors.value[id]) {
        userColors.value[id] = getRandomColor();
      }
    });
  }

  function updateDocumentHistory(history: any[]) {
    documentHistory.value = history;
  }

  // Helper functions
  function generateUserId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  function getRandomColor(): string {
    const colors = [
      "#4285F4",
      "#EA4335",
      "#FBBC05",
      "#34A853",
      "#673AB7",
      "#FF5722",
      "#00BCD4",
      "#795548",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  return {
    socket,
    userId,
    connected,
    document,
    documentHistory,
    userColors,
    initializeSocket,
    joinDocument,
    updateTitle,
    sendTextChange,
    updateContent,
    moveCursor,
    createNewDocument,
    updateUserList,
    updateDocumentHistory,
  };
});
