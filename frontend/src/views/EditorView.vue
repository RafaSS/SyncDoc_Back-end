<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import Quill from "quill";
import UserList from "../components/UserList.vue";
import EditorToolbar from "../components/EditorToolbar.vue";
import ShareModal from "../components/ShareModal.vue";
import HistoryPanel from "../components/HistoryPanel.vue";

const route = useRoute();
const documentStore = useDocumentStore();
const documentId = ref(route.params.id as string);
const quill = ref<Quill | null>(null);
const editor = ref<HTMLElement | null>(null);
const isShowingShareModal = ref(false);
const isShowingHistoryPanel = ref(false);
const documentTitle = ref("Untitled Document");
const connectionStatus = ref("Connecting...");
const connectionColor = ref("#f39c12");
const remoteCursors = ref<Record<string, any>>({});

// Set up Quill and Socket.IO connections
onMounted(() => {
  // Initialize socket connection if not already initialized
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
  documentStore.initializeSocket(SOCKET_URL);

  // Initialize Quill editor
  if (editor.value) {
    quill.value = new Quill(editor.value, {
      theme: "snow",
      modules: {
        toolbar: "#toolbar",
      },
      placeholder: "Start typing...",
    });

    // Setup Quill event handlers
    setupQuillHandlers();

    // Store the Quill instance in the store
    documentStore.setQuillInstance(quill.value);

    // Join the document
    documentStore.joinDocument(documentId.value);
    console.log("Joined document:", documentId.value);
  }

  // Watch for document title changes
  watch(
    () => documentStore.document.title,
    (newTitle) => {
      document.title = `${newTitle} - SyncDoc`;
      documentTitle.value = newTitle;
    }
  );

  // Watch for connection status changes
  watch(
    () => documentStore.connected,
    (isConnected) => {
      connectionStatus.value = isConnected ? "Connected" : "Disconnected";
      connectionColor.value = isConnected ? "#4CAF50" : "#f44336";
    }
  );

  // Watch for remote cursor updates
  watch(
    () => documentStore.remoteCursors,
    (cursors) => {
      Object.entries(cursors).forEach(([userId, cursorData]) => {
        updateRemoteCursorElement(userId, cursorData);
      });
    },
    { deep: true }
  );
});

onBeforeUnmount(() => {
  // Leave the document when component is unmounted
  documentStore.leaveDocument();

  // Remove all cursor elements
  Object.values(remoteCursors.value).forEach((cursor) => {
    if (cursor && cursor.element) {
      cursor.element.remove();
    }
  });
});

function setupQuillHandlers() {
  if (!quill.value) return;

  // Text change handler
  quill.value.on(
    "text-change",
    (delta: { ops: any[] }, _oldDelta: { ops: any[] }, source: string) => {
      if (source === "user") {
        const content = quill.value!.getContents();
        documentStore.sendTextChange(delta, source, content);
      }
    }
  );

  // Selection change handler for cursor movement
  quill.value.on(
    "selection-change",
    (
      range: { index: number; length: number } | null,
      _oldRange: { index: number; length: number } | null,
      source: string
    ) => {
      if (source === "user" && range) {
        documentStore.moveCursor(range);
      }
    }
  );
}

// Handle the share button click
function showShareModal() {
  isShowingShareModal.value = true;
}

// Handle the history button click
function toggleHistoryPanel() {
  isShowingHistoryPanel.value = !isShowingHistoryPanel.value;

  // Fetch document history if showing the panel
  if (isShowingHistoryPanel.value) {
    documentStore.getDocumentHistory();
  }
}

// Update title on input change
function updateTitle() {
  documentStore.updateTitle(documentTitle.value);
}

// Update remote cursor positions in the DOM
function updateRemoteCursorElement(userId: string, cursorData: any) {
  if (!quill.value || !cursorData.range) return;

  // Get or create the cursor element
  let cursor = remoteCursors.value[userId];

  if (!cursor) {
    const cursorElement = document.createElement("div");
    cursorElement.className = "cursor";
    cursorElement.style.position = "absolute";
    cursorElement.style.height = "20px";
    cursorElement.style.width = "2px";
    cursorElement.style.backgroundColor = cursorData.color;
    cursorElement.style.transition = "transform 0.1s";

    const nameFlag = document.createElement("div");
    nameFlag.className = "cursor-flag";
    nameFlag.style.position = "absolute";
    nameFlag.style.top = "-18px";
    nameFlag.style.left = "0";
    nameFlag.style.backgroundColor = cursorData.color;
    nameFlag.style.color = "white";
    nameFlag.style.padding = "2px 4px";
    nameFlag.style.borderRadius = "3px";
    nameFlag.style.fontSize = "10px";
    nameFlag.style.whiteSpace = "nowrap";
    nameFlag.textContent = cursorData.name;

    cursorElement.appendChild(nameFlag);
    document.querySelector(".ql-editor")?.appendChild(cursorElement);

    cursor = {
      element: cursorElement,
      nameFlag,
    };

    remoteCursors.value[userId] = cursor;
  }

  // Update the cursor position
  const position = quill.value.getBounds(cursorData.range.index);
  cursor.element.style.transform = `translate(${position.left}px, ${position.top}px)`;
  cursor.nameFlag.textContent = cursorData.name;
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
        <div ref="editor" id="editor"></div>
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
