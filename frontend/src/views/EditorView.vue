<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
// import { useAuthStore } from "../stores/authStore";
import { socketService } from "../services/socketService";
import { apiService } from "../services/apiService";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import UserList from "../components/UserList.vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import ShareModal from "../components/ShareModal.vue";
import QuillCursors from "quill-cursors";
import { useI18n } from "vue-i18n";

// Types
interface DocumentResponse {
  id: string;
  title: string;
  content: any;
  userCount: number;
}

const route = useRoute();
const documentStore = useDocumentStore();
const { t } = useI18n();
// const authStore = useAuthStore();
const documentId = ref(route.params.id as string);
const editorRef = ref<InstanceType<typeof QuillEditor> | null>(null);
const isShowingShareModal = ref(false);
const isShowingHistoryPanel = ref(false);
const documentTitle = ref(t("editor.untitledDocument"));
const connectionStatus = ref(t("editor.connecting"));
const connectionColor = ref("#f39c12");
const isLoading = ref(true);
const loadError = ref("");
const documentData = ref<DocumentResponse | null>(null);

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
  placeholder: t("editor.placeholder"),
  theme: "snow",
};

onMounted(async () => {
  // Initialize the document store for state management
  await documentStore.initialize();

  // First, load document via API
  await loadDocumentFromApi();

  // Then initialize socket connection for real-time updates
  await initializeSocketConnection();

  // Update title from document store
  watch(
    () => documentStore.document.title,
    (newTitle) => {
      documentTitle.value = newTitle;
    }
  );
});

// Load document content and metadata from API
async function loadDocumentFromApi() {
  isLoading.value = true;
  loadError.value = "";

  try {
    // Fetch document data from API
    const response = await apiService.getDocument(documentId.value);
    documentData.value = response;

    // Update document store with API response
    documentStore.document.id = documentId.value;
    documentStore.updateDocumentTitle(
      documentData.value?.title || t("editor.untitledDocument")
    );
    documentTitle.value = documentData.value?.title || t("editor.untitledDocument");

    // Fetch document history separately
    await loadDocumentHistory();

    console.log("Document loaded from API:", documentData.value);
    isLoading.value = false;
  } catch (error) {
    console.error("Error loading document from API:", error);
    loadError.value = t("editor.error");
    isLoading.value = false;
  }
}

// Load document history from API
async function loadDocumentHistory() {
  try {
    const historyData = await apiService.getDocumentHistory(documentId.value);
    documentStore.updateDocumentHistory(historyData.deltas || []);
    console.log("Document history loaded:", historyData);
  } catch (error) {
    console.error("Error loading document history:", error);
  }
}

// Initialize socket connection for real-time updates
async function initializeSocketConnection() {
  // Initialize socket connection
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

  // Connect to socket server
  await socketService.connect(SOCKET_URL);

  // Setup connection status monitoring
  socketService.on("connect", () => {
    connectionStatus.value = t("editor.connected");
    connectionColor.value = "#27ae60"; // Green for connected
    documentStore.connected = true;

    // Join the document room for real-time updates
    joinDocument();
  });

  socketService.on("disconnect", () => {
    connectionStatus.value = t("editor.disconnected");
    connectionColor.value = "#e74c3c"; // Red for disconnected
    documentStore.connected = false;
  });

  socketService.on("connect_error", () => {
    connectionStatus.value = t("editor.connectionError");
    connectionColor.value = "#e74c3c"; // Red for error
    documentStore.connected = false;
  });

  // Listen for real-time updates only (initial content already loaded via API)

  // Document title updates
  socketService.on("title-change", (title: string) => {
    documentStore.updateDocumentTitle(title);
  });

  // User list updates
  socketService.on("user-list", (users: Record<string, string>) => {
    documentStore.updateUserList(users);
  });

  // Text changes from other users
  socketService.on("text-change", (delta: any, userId: string) => {
    documentStore.handleRemoteTextChange(delta, userId);
  });

  // Cursor updates from other users
  socketService.on("cursor-move", (userId: string, cursorData: any) => {
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
}

onBeforeUnmount(() => {
  // Clean up and leave document
  leaveDocument();
  socketService.disconnect();
});

// Join a document
function joinDocument() {
  console.log("Joining document:", documentId.value, documentStore.userId);
  socketService.joinDocument(
    documentId.value,
    documentStore.userName,
    documentStore.userId
  );
}

// Leave the current document
function leaveDocument() {
  if (!documentId.value) return;
  socketService.leaveDocument(documentId.value);
}

// Text change handler
function onEditorTextChange(delta: any, _oldContents: any, source: string) {
  if (source === "user" && documentStore.connected) {
    // Emit changes to server
    socketService.updateText(delta);
  } else if (source === "api") {
    // Handle remote changes from server
    // These are now handled via the document store and socket events
  }
}

// Selection change handler
function onEditorSelectionChange(range: any, _oldRange: any, source: string) {
  if (
    source === "user" &&
    range &&
    documentStore.connected &&
    editorRef.value
  ) {
    // Send cursor position to server
    socketService.updateCursor(range);
  }
}

// After QuillEditor is ready
function onEditorReady(quill: any) {
  if (!documentData.value?.content) return;

  try {
    // Set editor content
    if (documentData.value.content.ops) {
      quill.setContents(documentData.value.content.ops);
    } else if (typeof documentData.value.content === "string") {
      quill.setText(documentData.value.content);
    }

    // Initialize cursors module
    const cursors = quill.getModule("cursors");
    if (cursors) {
      // Make cursors available to document store
      documentStore.setCursorsModule(cursors);
    }

    // Apply any pending remote cursor updates
    Object.entries(documentStore.remoteCursors).forEach(
      ([userId, cursorData]) => {
        documentStore.updateRemoteCursor(userId, cursorData);
      }
    );
  } catch (error) {
    console.error("Error initializing editor:", error);
  }
}

// Toggle share modal
function showShareModal() {
  isShowingShareModal.value = true;
}

// Toggle history panel
function toggleHistoryPanel() {
  isShowingHistoryPanel.value = !isShowingHistoryPanel.value;
  if (isShowingHistoryPanel.value) {
    // Load document history when panel is opened
    loadDocumentHistory();
  }
}

// Update document title
function updateTitle() {
  documentStore.updateDocumentTitle(documentTitle.value);
  socketService.updateTitle(documentTitle.value);
}
</script>

<template>
  <div class="app-container">
    <header>
      <h1>{{ $t('app.name') }}</h1>
      <div class="document-info">
        <input
          type="text"
          v-model="documentTitle"
          @change="updateTitle"
          :placeholder="$t('editor.untitledDocument')"
        />
        <UserList />
      </div>
    </header>

    <main>
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>{{ $t('editor.loading') }}</p>
      </div>

      <div v-else-if="loadError" class="error-message">
        <p>{{ loadError }}</p>
        <button @click="loadDocumentFromApi">{{ $t('editor.retry') }}</button>
      </div>

      <div v-else class="editor-container">
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

      <!-- <HistoryPanel
        v-if="isShowingHistoryPanel"
        :history="documentStore.document.deltas"
        @close="isShowingHistoryPanel = false"
      /> -->
    </main>

    <footer>
      <div class="status">
        <span :style="{ color: connectionColor }">{{ connectionStatus }}</span>
        <span>{{
          documentStore.document.users[documentStore.userId] || "Anonymous"
        }}</span>
      </div>
      <div class="document-actions">
        <button @click="$router.push('/')">{{ $t('editor.documents') }}</button>
        <button @click="showShareModal">{{ $t('editor.share') }}</button>
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 100;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #e74c3c;
}

.error-message button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
