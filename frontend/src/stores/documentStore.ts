import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { io } from "socket.io-client";
import { v4 as uuid } from "uuid";
import type { Document, Delta, CursorPosition } from "../types";
import { QuillEditor } from "@vueup/vue-quill";
import QuillCursors from "quill-cursors";

export const useDocumentStore = defineStore("document", () => {
  // State
  const socket = ref<any>(null);
  const connected = ref(false);
  const userId = ref(generateUserId());
  const document = reactive<Document>({
    id: "",
    title: "Untitled Document",
    content: [],
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
        query: { userId: userId },
      });

      // Connection status
      socket.value.on("connect", () => {
        connected.value = true;
        console.log("Socket connected");
      });

      setupSocketHandlers();
    }
  }

  // Store the Quill instance for later use
  function setQuillInstance(
    quillComponentOrInstance: InstanceType<typeof QuillEditor>,
    documentId: string
  ) {
    quillInstance.value = quillComponentOrInstance;
    document.id = documentId;

    // Configure Quill with cursors module
    const quill = quillInstance.value.getQuill();
    if (quill) {
      // Initialize cursor module if needed
      if (!quill.getModule("cursors")) {
        const cursorsModule = new QuillCursors(quill, {
          hideDelayMs: 5000,
          transformOnTextChange: true,
        });
        quill.addModule("cursors", cursorsModule);
      }
    }
    joinDocument(document.id);
    console.log("Joined document:", document.id);
  }

  // Socket event handlers
  function setupSocketHandlers() {
    if (!socket.value) return;

    // Rejoin document if we were previously connected
    if (document.id) {
      joinDocument(document.id);
    }

    socket.value.on(
      "load-document",
      (content: [], deltas: [], documentContent: any) => {
        documentHistory.value = deltas;
        console.log(
          "Store received document content:",
          JSON.stringify(content.length)
        );
        // Validate content
        if (!Array.isArray(content) || content.length === 0) {
          console.log("Invalid document content received");
          quillInstance.value?.getQuill()?.setText("");
          quillInstance.value?.getQuill()?.enable();
          return;
        }
        document.content = content; // Store original content

        // Update Quill if it exists
        if (quillInstance.value) {
          console.log("Updating Quill with document content", documentContent);
          quillInstance.value
            .getQuill()
            .setContents(JSON.parse(documentContent));
          quillInstance.value.getQuill()?.enable();
        }
      }
    );

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
      document.title = title;
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
    document.id = documentId;
    const userName = localStorage.getItem("userName") || "Anonymous";
    socket.value.emit("join-document", documentId, userName, userId.value);
  }

  async function createNewDocument() {
    if (!socket.value) {
      console.error("Socket is not initialized");
      return;
    }

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

  async function sendTextChange(delta: Delta, source: string, content: any) {
    if (!socket.value || !document.id) {
      console.log("No socket or document id");
      return;
    }
    const safeDeltaToSend = delta && delta.ops ? delta : { ops: [] };

    console.log("Sending text change:", safeDeltaToSend);
    await socket.value.emit(
      "text-change",
      document.id,
      safeDeltaToSend,
      source,
      userId.value,
      content
    );
  }

  function updateTitle(title: string) {
    if (!socket.value || !document.id) {
      console.error("Socket or document id is not initialized");
      return;
    }
    document.title = title;
    socket.value.emit("title-change", document.id, title);
  }

  function moveCursor(position: CursorPosition) {
    console.log("Moving cursor to:", position);

    if (!socket.value || !document.id) {
      console.error("Socket or document id is not initialized");
      return;
    }
    socket.value.emit("cursor-move", document.id, position, userId.value);
  }

  function leaveDocument() {
    if (!socket.value || !document.id) {
      console.error("Socket or document id is not initialized");
      return;
    }
    socket.value.emit("leave-document", document.id);
    resetDocument();
  }

  function getDocumentHistory() {
    if (!socket.value || !document.id) {
      console.error("Socket or document id is not initialized");
      return;
    }
    socket.value.emit("get-document-history", document.id);
  }

  // Helper functions
  function resetDocument() {
    document.id = "";
    document.title = "Untitled Document";
    document.content = [];
    document.users = {};
    documentHistory.value = [];
  }

  function generateUserId(): string {
    const storedId = localStorage.getItem("userId");
    if (storedId) return storedId;

    const newId = uuid();
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
  function updateRemoteCursor(remoteUserId: string, cursorPosition: any) {
    if (
      remoteUserId === userId.value ||
      !quillInstance.value ||
      !cursorPosition
    ) {
      console.log("Remote cursor update skipped");
      return;
    }

    // Emit an event that the view can listen to
    // This allows the view to handle the actual DOM manipulation
    const cursorData = {
      userId: remoteUserId,
      range: cursorPosition,
      color: userColors[remoteUserId] || "#f44336",
      name: document.users[remoteUserId] || "Anonymous",
    };

    remoteCursors.value[remoteUserId] = cursorData;
    console.log(
      "Remote cursor updated:",
      remoteCursors.value[remoteUserId].range
    );
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
