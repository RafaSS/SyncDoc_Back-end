<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, onBeforeMount } from "vue";
import { useRoute } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import QuillCursors from "quill-cursors";
import UserList from "../components/UserList.vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import ShareModal from "../components/ShareModal.vue";
import HistoryPanel from "../components/HistoryPanel.vue";

const route = useRoute();
const documentStore = useDocumentStore();
const documentId = ref(route.params.id as string);
const editorRef = ref<InstanceType<typeof QuillEditor> | null>(null);
const isShowingShareModal = ref(false);
const isShowingHistoryPanel = ref(false);
const documentTitle = ref("Untitled Document");
const connectionStatus = ref("Connecting...");
const connectionColor = ref("#f39c12");

// Cursors module
const cursorsModule = {
  name: "cursors",
  module: QuillCursors,
  options: {
    hideDelayMs: 5000,
    transformOnTextChange: true,
  },
};

// Editor configuration
const editorOptions = {
  modules: {
    toolbar: "#toolbar",
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true,
    },
    cursors: cursorsModule,
    selection: {
      transformOnTextChange: true,
    },
  },
  placeholder: "Enter your text here...",
  theme: "snow",
};

onBeforeMount(() => {
  // Leave the document when component is unmounted
  documentStore.leaveDocument();
});

onMounted(async () => {
  // Set Quill instance
  if (editorRef.value) {
    documentStore.setQuillInstance(editorRef.value, documentId.value);
  }

  // Initialize socket connection
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
  documentStore.initializeSocket(SOCKET_URL);

  // Watch for connection status changes
  watch(
    () => documentStore.connected,
    (newStatus) => {
      connectionStatus.value = newStatus ? "Connected" : "Disconnected";
      connectionColor.value = newStatus ? "#27ae60" : "#e74c3c";
    }
  );

  // Watch for document title changes
  watch(
    () => documentStore.document.title,
    (newTitle) => {
      if (newTitle) {
        documentTitle.value = newTitle;
      }
    }
  );

  // Watch for remote cursor updates
  watch(
    () => documentStore.remoteCursors,
    (cursors) => {
      for (const userId in cursors) {
        if (userId !== documentStore.userId) {
          const cursorData = cursors[userId];
          updateRemoteCursorElement(userId, cursorData);
        }
      }
    },
    { deep: true }
  );
});

onBeforeUnmount(() => {
  // Leave the document when component is unmounted
  documentStore.leaveDocument();
});

// Text change handler
function onEditorTextChange(event: any) {
  console.log("Text change detected:", event.delta);
  console.log("Source:", editorRef.value.getContents());
  const { delta, source } = event;

  if (source === "user" && editorRef.value) {
    const content = editorRef.value.getContents();
    documentStore.sendTextChange(delta, source, content);
  }
}

// Selection change handler
function onEditorSelectionChange(event: any) {
  const { range, source } = event;
  console.log("Selection change detected:", range);

  if (range && range.index !== undefined && range.length !== undefined) {
    if (source === "user") {
      documentStore.moveCursor(range);
    }
  }
}

// After QuillEditor is ready
function onEditorReady(quill: any) {
  // Initialize cursors module if needed
  if (quill.getModule("cursors")) {
    const cursorsInstance = quill.getModule("cursors");

    // Set up existing cursors from document
    if (documentStore.document.users) {
      Object.entries(documentStore.document.users).forEach(
        ([userId, userData]: [string, any]) => {
          if (userId !== documentStore.userId) {
            cursorsInstance.createCursor(
              userId,
              userData.name || "Anonymous",
              documentStore.userColors[userId] || "#f39c12"
            );
          }
        }
      );
    }
  }
}

function showShareModal() {
  isShowingShareModal.value = true;
}

function toggleHistoryPanel() {
  isShowingHistoryPanel.value = !isShowingHistoryPanel.value;

  // Fetch document history if showing the panel
  if (isShowingHistoryPanel.value) {
    documentStore.getDocumentHistory();
  }
}

function updateTitle() {
  documentStore.updateTitle(documentTitle.value);
}

function updateRemoteCursorElement(userId: string, cursorData: any) {
  if (!editorRef.value?.getQuill() || !cursorData || !cursorData.range) return;

  // Validate the cursor range to prevent IndexSizeError
  if (
    cursorData.range.index === undefined ||
    cursorData.range.index === null ||
    cursorData.range.index < 0 ||
    cursorData.range.index >= 4294967295
  ) {
    return;
  }

  const quill = editorRef.value.getQuill();
  const cursorsModule = quill.getModule("cursors");

  if (cursorsModule) {
    try {
      // Update cursor through the module
      cursorsModule.createCursor(
        userId,
        cursorData.name || "Anonymous",
        cursorData.color || "#f39c12"
      );
      cursorsModule.moveCursor(userId, cursorData.range);
      cursorsModule.toggleFlag(userId, true);
    } catch (error) {
      console.error("Error updating cursor:", error);
    }
  }
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
          :modules="[cursorsModule]"
          toolbar="#toolbar"
          @text-change="onEditorTextChange"
          @selection-change="onEditorSelectionChange"
          @ready="onEditorReady"
        />
      </div>

      <HistoryPanel
        v-if="isShowingHistoryPanel"
        :history="documentStore.documentHistory"
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
