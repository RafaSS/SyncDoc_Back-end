import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import { io } from "socket.io-client";
import type { Document, Delta, CursorPosition } from "../types";

export const useDocumentStore = defineStore("document", () => {
  // State
  const socket = ref<any>(null);
  const connected = ref(false);
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
  const userColors = reactive<Record<string, string>>({});
  const remoteCursors = ref<Record<string, any>>({});
  const quillInstance = ref<any>(null);

  // Initialize socket once
  function initializeSocket(url: string) {
    if (!socket.value) {
      socket.value = io(url, {
        withCredentials: true,
        query: { userId: userId.value },
      });

      // Connection status
      socket.value.on("connect", () => {
        connected.value = true;
        console.log("Socket connected");
      });

      socket.value.on("disconnect", () => {
        connected.value = false;
        console.log("Socket disconnected");
      });

      setupSocketHandlers();
    }
  }

  // Store the Quill instance for later use
  function setQuillInstance(quill: any) {
    quillInstance.value = quill;
  }

  // Socket event handlers
  function setupSocketHandlers() {
    if (!socket.value) return;

    socket.value.on("connect", () => {
      connected.value = true;
      console.log("Socket connected");

      // Rejoin document if we were previously connected
      if (document.id) {
        joinDocument(document.id);
      }
    });

    socket.value.on("disconnect", () => {
      connected.value = false;
      console.log("Socket disconnected");
    });

    socket.value.on("load-document", (content: any) => {
      console.log("Store received document content:", content);
      document.deltas.push(content);

      // Update Quill if it exists
      if (quillInstance.value) {
        quillInstance.value.setContents(
          content ? JSON.parse(content) : { ops: [] }
        );
        quillInstance.value.enable();
      }
    });

    socket.value.on("document-title", (title: string) => {
      document.title = title;
    });

    socket.value.on("user-list", (users: Record<string, string>) => {
      document.users = users;
      updateUserColors(Object.keys(users));
    });

    socket.value.on("document-history", (history: any[]) => {
      documentHistory.value = history;
    });

    socket.value.on("text-change", (delta: Delta) => {
      if (quillInstance.value) {
        quillInstance.value.updateContents(delta);
      }
    });

    socket.value.on("title-change", (title: string) => {
      document.title = title;
    });

    socket.value.on("cursor-move", (socketId: string, cursorPosition: any) => {
      updateRemoteCursor(socketId, cursorPosition);
    });

    socket.value.on("user-joined", (socketId: string, userName: string) => {
      // Show notification or update UI when a user joins
      console.log(`${userName} joined the document`);
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
    if (!socket.value) return;
    console.log("Joining document:", documentId, userId.value);
    document.id = documentId;
    const userName = localStorage.getItem("userName") || "Anonymous";
    socket.value.emit("join-document", documentId, userName, userId.value);
  }

  async function createNewDocument() {
    if (!socket.value) return;

    return new Promise((resolve, reject) => {
      socket.value.emit("create-document", userId.value, (response: string) => {
        if (response.startsWith("Error:")) {
          console.error("Error creating document:", response);
          reject(new Error(response));
        } else {
          console.log("Document created with ID:", response);
          resetDocument();
          document.id = response;
          resolve(response);
        }
      });
    });
  }

  function sendTextChange(delta: Delta, source: string, content: any) {
    if (!socket.value || !document.id) return;

    socket.value.emit(
      "text-change",
      document.id,
      delta,
      source,
      JSON.stringify(content)
    );
  }

  function updateTitle(title: string) {
    if (!socket.value || !document.id) return;
    document.title = title;
    socket.value.emit("title-change", document.id, title);
  }

  function moveCursor(position: CursorPosition) {
    if (!socket.value || !document.id) return;
    socket.value.emit("cursor-move", document.id, position);
  }

  function leaveDocument() {
    if (!socket.value || !document.id) return;
    socket.value.emit("leave-document", document.id);
    resetDocument();
  }

  function getDocumentHistory() {
    if (!socket.value || !document.id) return;
    socket.value.emit("get-document-history", document.id);
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

  // Update remote cursor positions
  function updateRemoteCursor(remoteUserId: string, range: any) {
    if (remoteUserId === userId.value || !quillInstance.value || !range) return;

    // Emit an event that the view can listen to
    // This allows the view to handle the actual DOM manipulation
    const cursorData = {
      userId: remoteUserId,
      range: range,
      color: userColors[remoteUserId] || "#f44336",
      name: document.users[remoteUserId] || "Anonymous",
    };

    remoteCursors.value[remoteUserId] = cursorData;
  }

  return {
    socket,
    connected,
    userId,
    document,
    documentHistory,
    userColors,
    remoteCursors,

    // Methods
    initializeSocket,
    setQuillInstance,
    joinDocument,
    createNewDocument,
    sendTextChange,
    updateTitle,
    moveCursor,
    leaveDocument,
    getDocumentHistory,
  };
});

function generateUserId(): string {
  const storedId = localStorage.getItem("userId");
  if (storedId) return storedId;

  const newId = Math.random().toString(36).substring(2, 15);
  localStorage.setItem("userId", newId);
  return newId;
}
