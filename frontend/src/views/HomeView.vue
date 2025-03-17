<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import DocumentList from "../components/DocumentList.vue";

const router = useRouter();
const documentStore = useDocumentStore();
const isLoading = ref(true);
const documents = ref<Array<{ id: string; title: string; userCount: number }>>(
  []
);

onMounted(async () => {
  // Initialize the socket connection
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
  documentStore.initializeSocket(SOCKET_URL);

  try {
    // Fetch documents from API
    const response = await fetch(
      `${
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
      }/documents`
    );
    documents.value = await response.json();
  } catch (error) {
    console.error("Failed to fetch documents:", error);
  } finally {
    isLoading.value = false;
  }
});

async function createNewDocument() {
  try {
    const documentId = await documentStore.createNewDocument();
    if (documentId) {
      router.push({ name: "editor", params: { id: documentId as string } });
    }
  } catch (error) {
    console.error("Failed to create new document:", error);
  }
}

function openDocument(id: string) {
  router.push({ name: "editor", params: { id } });
}
</script>

<template>
  <div class="home-container">
    <header>
      <h1>SyncDoc</h1>
      <p>Collaborative Document Editor</p>
    </header>

    <main>
      <div class="actions">
        <button @click="createNewDocument" class="create-btn">
          <i class="fas fa-plus"></i> New Document
        </button>
      </div>

      <div v-if="isLoading" class="loading">
        <p>Loading documents...</p>
      </div>

      <DocumentList
        v-else
        :documents="documents"
        @open-document="openDocument"
      />
    </main>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 3rem;
}

header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: #4285f4;
}

header p {
  font-size: 1.2rem;
  color: #666;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2rem;
}

.create-btn {
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background-color: #3367d6;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style>
