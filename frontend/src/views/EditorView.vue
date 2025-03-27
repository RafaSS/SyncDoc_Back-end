<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import { socketService } from "../services/socketService";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import UserList from "../components/UserList.vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import ShareModal from "../components/ShareModal.vue";
import HistoryPanel from "../components/HistoryPanel.vue";
import QuillCursors from "quill-cursors";

const route = useRoute();
const documentStore = useDocumentStore();
const documentId = ref(route.params.id as string);
const editorRef = ref<InstanceType<typeof QuillEditor> | null>(null);
const isShowingShareModal = ref(false);
const isShowingHistoryPanel = ref(false);
const documentTitle = ref("Untitled Document");
const connectionStatus = ref("Connecting...");
const connectionColor = ref("#f39c12");

// Editor configuration
const editorOptions = {
  modules: {
    toolbar: "#toolbar",
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true,
    },
    cursors: {
      name: "cursors",
      module: QuillCursors,
      options: {
        hideDelayMs: 5000,
        transformOnTextChange: true,
      },
    },
    selection: {
      transformOnTextChange: true,
    },
  },
  placeholder: "Enter your text here...",
  theme: "snow",
};

onMounted(async () => {
  // Initialize the document store for state management
  await documentStore.initialize();

  // Initialize socket connection
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

  // Connect to socket server directly
  await socketService.connect(SOCKET_URL);

  // Setup connection status monitoring
  socketService.on("connect", () => {
    connectionStatus.value = "Connected";
    connectionColor.value = "#27ae60"; // Green for connected
    documentStore.connected = true;
  });

  socketService.on("disconnect", () => {
    connectionStatus.value = "Disconnected";
    connectionColor.value = "#e74c3c"; // Red for disconnected
    documentStore.connected = false;
  });

  socketService.on("connect_error", () => {
    connectionStatus.value = "Connection Error";
    connectionColor.value = "#e74c3c"; // Red for error
    documentStore.connected = false;
  });

  // Document content
  socketService.on("document-content", (content: string) => {
    documentStore.updateDocumentContent(content);
  });

  // Document title - update event name to match backend
  socketService.on("title-change", (title: string) => {
    documentStore.updateDocumentTitle(title);
  });

  // User list
  socketService.on("user-list", (users: Record<string, string>) => {
    documentStore.updateUserList(users);
  });

  // Document history
  socketService.on("document-history", (history: any[]) => {
    documentStore.updateDocumentHistory(history);
  });

  // Text changes from other users
  socketService.on("text-change", (delta: any, userId: string) => {
    documentStore.handleRemoteTextChange(delta, userId);
  });

  // Cursor updates from other users
  socketService.on("cursor-change", (userId: string, cursorData: any) => {
    if (!editorRef.value) return;
    documentStore.updateRemoteCursor(userId, cursorData);
  });

  // User joined notification
  socketService.on("user-joined", (socketId: string, userName: string) => {
    console.log(`User ${userName} joined with socket ID ${socketId}`);
  });

  // User left notification
  socketService.on("user-left", (socketId: string) => {
    console.log(`User with socket ID ${socketId} left`);
    const remoteCursors = documentStore.remoteCursors;
    if (remoteCursors[socketId]) {
      delete remoteCursors[socketId];
    }
  });

  // Set Quill instance
  if (editorRef.value) {
    documentStore.setQuillInstance(editorRef.value, documentId.value);
  }

  // Join document
  joinDocument();

  // Update title from document store
  watch(
    () => documentStore.document.title,
    (newTitle) => {
      documentTitle.value = newTitle;
    }
  );

  // Request document history
  getDocumentHistory();
});

onBeforeUnmount(() => {
  // Clean up and leave document
  leaveDocument();
  socketService.disconnect();
});

// Join a document
function joinDocument() {
  console.log("Joining document:", documentId.value, documentStore.userId);
  documentStore.document.id = documentId.value;
  socketService.joinDocument(
    documentId.value,
    documentStore.userName,
    documentStore.userId
  );
}

// Leave the current document
function leaveDocument() {
  socketService.leaveDocument();
  documentStore.resetDocument();
}

// Get document history
function getDocumentHistory() {
  socketService
    .getDocumentHistory()
    .then((history) => {
      documentStore.updateDocumentHistory(history);
    })
    .catch((error) => {
      console.error("Error getting document history:", error);
    });
}

// Text change handler
function onEditorTextChange(delta: any, _oldContents: any, source: string) {
  if (source !== "user" || !editorRef.value) return;

  const quill = editorRef.value.getQuill();
  const content = quill.getContents();
  console.log("Delta:", delta);
  console.log("Content:", content);
  // Send delta to server through socket service directly
  socketService.sendTextChange(
    documentId.value,
    delta,
    source,
    documentStore.userId,
    content
  );
}

// Selection change handler
function onEditorSelectionChange(range: any, _oldRange: any, source: string) {
  if (source !== "user" || !range || !editorRef.value) return;

  // Send cursor update to server
  socketService.sendCursorUpdate({
    range,
    userId: documentStore.userId,
    username: documentStore.userName,
  });
}

// After QuillEditor is ready
function onEditorReady(quill: any) {
  console.log("Quill editor is ready");

  // Register cursor event handlers
  quill.on("selection-change", (range: any, oldRange: any, source: string) => {
    onEditorSelectionChange(range, oldRange, source);
  });

  quill.on("text-change", (delta: any, oldContents: any, source: string) => {
    console.log("Text change:", delta, oldContents, source);
    onEditorTextChange(delta, oldContents, source);
  });

  // Enable editor after initialization
  quill.enable();

  // Request document history
  getDocumentHistory();
}

// Toggle share modal
function showShareModal() {
  isShowingShareModal.value = true;
}

// Toggle history panel
function toggleHistoryPanel() {
  isShowingHistoryPanel.value = !isShowingHistoryPanel.value;
  if (isShowingHistoryPanel.value) {
    getDocumentHistory();
  }
}

// Update document title
function updateTitle() {
  socketService.updateTitle(documentTitle.value);
  documentStore.updateDocumentTitle(documentTitle.value);
}
</script>

<template>
  <div class="app-container">
    <header>
      <h1>SyncDoc</h1>
      <div class="document-info">
        <input
          type="text"
          v-model="documentTitle"
          @change="updateTitle"
          placeholder="Untitled Document"
        />
        <UserList />
      </div>
    </header>

    <main>
      <div class="editor-container">
        <EditorToolbar @show-history="toggleHistoryPanel" />
        <QuillEditor
          ref="editorRef"
          :options="editorOptions"
          toolbar="#toolbar"
          @text-change="onEditorTextChange"
          @selection-change="onEditorSelectionChange"
          @ready="onEditorReady"
        />
      </div>

      <HistoryPanel
        v-if="isShowingHistoryPanel"
        :history="documentStore.document.deltas"
        @close="isShowingHistoryPanel = false"
      />
    </main>

    <footer>
      <div class="status">
        <span :style="{ color: connectionColor }">{{ connectionStatus }}</span>
        <span>{{
          documentStore.document.users[documentStore.userId] || "Anonymous"
        }}</span>
      </div>
      <div class="document-actions">
        <button @click="$router.push('/')">Documents</button>
        <button @click="showShareModal">Share</button>
      </div>
    </footer>

    <ShareModal
      v-if="isShowingShareModal"
      :document-id="documentId"
      @close="isShowingShareModal = false"
    />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

header h1 {
  font-size: 1.5rem;
  margin: 0;
  margin-right: 2rem;
  color: #4285f4;
}

.document-info {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 1rem;
}

.document-info input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 300px;
}

main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

#editor {
  flex: 1;
  overflow-y: auto;
}

footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
}

.status {
  display: flex;
  gap: 1rem;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
}

.document-actions button {
  padding: 0.5rem 1rem;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.document-actions button:hover {
  background-color: #3367d6;
}
</style>
