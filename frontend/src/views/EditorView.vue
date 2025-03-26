<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import { useSocketStore } from "../stores/socketStore";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import UserList from "../components/UserList.vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import ShareModal from "../components/ShareModal.vue";
import HistoryPanel from "../components/HistoryPanel.vue";
import QuillCursors from "quill-cursors";

const route = useRoute();
const documentStore = useDocumentStore();
const socketStore = useSocketStore();
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
  // Initialize the auth and document store
  await documentStore.initialize();

  // Initialize socket store if needed
  if (!socketStore.initialized) {
    socketStore.initialize();
  }

  // Initialize socket connection
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

  // Setup connection status monitoring
  socketStore.on("connect", () => {
    connectionStatus.value = "Connected";
    connectionColor.value = "#27ae60"; // Green for connected
  });

  socketStore.on("disconnect", () => {
    connectionStatus.value = "Disconnected";
    connectionColor.value = "#e74c3c"; // Red for disconnected
  });

  socketStore.on("connect_error", () => {
    connectionStatus.value = "Connection Error";
    connectionColor.value = "#e74c3c"; // Red for error
  });

  // Then initialize the document store with socket
  documentStore.initializeSocket(SOCKET_URL);

  // Set Quill instance
  if (editorRef.value) {
    documentStore.setQuillInstance(editorRef.value, documentId.value);
  }

  // Update title from document store
  watch(
    () => documentStore.document.title,
    (newTitle) => {
      documentTitle.value = newTitle;
    }
  );
});

onBeforeUnmount(() => {
  // Clean up and leave document
  documentStore.leaveDocument();
  documentStore.disconnect();
});

// Text change handler
function onEditorTextChange(delta: any, _oldContents: any, source: string) {
  if (source !== "user" || !editorRef.value) return;

  const quill = editorRef.value.getQuill();
  const content = JSON.stringify(quill.getContents());

  // Send delta to server through document store
  documentStore.sendTextChange(delta, source, content);
}

// Selection change handler
function onEditorSelectionChange(range: any, _oldRange: any, source: string) {
  if (source !== "user" || !range || !editorRef.value) return;

  // Send cursor update to server
  documentStore.moveCursor({
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

  // Enable editor after initialization
  quill.enable();

  // Request document history
  documentStore.getDocumentHistory();
}

// Toggle share modal
function showShareModal() {
  isShowingShareModal.value = true;
}

// Toggle history panel
function toggleHistoryPanel() {
  isShowingHistoryPanel.value = !isShowingHistoryPanel.value;
  if (isShowingHistoryPanel.value) {
    documentStore.getDocumentHistory();
  }
}

// Update document title
function updateTitle() {
  documentStore.updateTitle(documentTitle.value);
}

// function updateRemoteCursorElement(userId: string, cursorData: any) {
//   if (!editorRef.value?.getQuill() || !cursorData) return;

//   const quill = editorRef.value.getQuill();
//   const cursorsModule = quill.getModule("cursors");

//   if (cursorsModule) {
//     try {
//       // Update cursor through the module
//       cursorsModule.createCursor(
//         userId,
//         cursorData.name || "Anonymous",
//         cursorData.color || "#f39c12"
//       );
//       cursorsModule.moveCursor(userId, cursorData.range);
//       cursorsModule.toggleFlag(userId, true);
//     } catch (error) {
//       console.error("Error updating cursor:", error);
//     }
//   }
// }
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
