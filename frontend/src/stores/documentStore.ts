// documentStore.ts
import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { SocketService } from "../services/socketService.ts";
import type { Document, Delta, CursorPosition } from "../types";
import type { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

export const useDocumentStore = defineStore("document", () => {
  // State
  const socketService = new SocketService();
  const userId = ref<string>(
    localStorage.getItem("userId") || generateUserId()
  );
  const document = reactive<Document>({
    id: "",
    title: "Untitled Document",
    content: null,
    users: {},
    deltas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: null,
  });
  const documentHistory = ref<any[]>([]);
  const userColors = reactive<Record<string, string>>({});

  // Initialize socket once
  function initializeSocket(url: string) {
    const socket = socketService.connect(url);
    setupSocketHandlers(socket);
    return socket;
  }

  // Socket event handlers
  function setupSocketHandlers(socket: Socket) {
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
  }

  // Actions
  function joinDocument(documentId: string) {
    if (!socketService.socket) return;

    document.id = documentId;
    const userName = localStorage.getItem("userName") || "Anonymous";
    socketService.socket.emit("join-document", documentId, userName);
  }

  async function createNewDocument() {
    if (!socketService.socket) return null;

    return new Promise<string>((resolve, reject) => {
      console.log("Creating new document for:", userId.value);
      socketService.socket?.emit(
        "create-document",
        userId.value,
        (documentId: string) => {
          if (typeof documentId === "string" && documentId.includes("Error")) {
            console.error("Error creating document:", documentId);
            reject(documentId);
            return;
          }
          console.log("Document created with ID:", documentId);
          resolve(documentId);
        }
      );
    });
  }

  function sendTextChange(delta: Delta, source: string, content: any) {
    if (!socketService.socket) return;

    socketService.socket.emit(
      "text-change",
      document.id,
      delta,
      source,
      JSON.stringify(content)
    );
  }
  function updateContent(content: any) {
    if (!socketService.socket) return;

    document.content = content;
    socketService.socket.emit("content-change", document.id, content);
  }

  function updateUserList(users: Record<string, string>) {
    if (!socketService.socket) return;

    document.users = users;
    socketService.socket.emit("user-list", document.id, users);
  }

  function updateDocumentHistory(history: any[]) {
    if (!socketService.socket) return;

    documentHistory.value = history;
    socketService.socket.emit("document-history", document.id, history);
  }

  function updateTitle(title: string) {
    if (!socketService.socket) return;

    document.title = title;
    socketService.socket.emit("title-change", document.id, title);
  }

  function moveCursor(position: CursorPosition) {
    if (!socketService.socket) return;

    socketService.socket.emit("cursor-move", document.id, position);
  }

  function leaveDocument() {
    if (!socketService.socket) return;

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
    //use uuid to generate a random id
    const id = uuidv4();
    localStorage.setItem("userId", id);
    return id;
  }

  function updateUserColors(userIds: string[]) {
    const colors = [
      "#f44336",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5",
      "#2196f3",
      "#03a9f4",
    ];

    userIds.forEach((id, index) => {
      if (!userColors[id]) {
        userColors[id] = colors[index % colors.length];
      }
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
  };
});
