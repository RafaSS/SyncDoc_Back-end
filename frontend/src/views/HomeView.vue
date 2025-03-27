<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import { apiService } from "../services/apiService";
import DocumentList from "../components/DocumentList.vue";

const router = useRouter();
const documentStore = useDocumentStore();
const isLoading = ref(true);
const error = ref("");
const documents = ref<Array<{ id: string; title: string; userCount: number }>>(
  []
);

onMounted(async () => {
  // Initialize the document store for user ID only, not sockets
  await documentStore.initialize();
  await fetchDocuments();
});

async function fetchDocuments() {
  isLoading.value = true;
  error.value = "";
  
  try {
    // Fetch documents from API
    const response = await apiService.getDocuments();
    documents.value = response;
    console.log("Documents loaded:", documents.value);
  } catch (err) {
    console.error("Failed to fetch documents:", err);
    error.value = "Failed to load documents. Please try again.";
  } finally {
    isLoading.value = false;
  }
}

async function createNewDocument() {
  try {
    const documentId = await apiService.createDocument(documentStore.userId);
    if (documentId) {
      router.push({ name: "editor", params: { id: documentId } });
    }
  } catch (err) {
    console.error("Error creating new document:", err);
    error.value = "Failed to create document. Please try again.";
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
        <div class="loading-spinner"></div>
        <p>Loading documents...</p>
      </div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="fetchDocuments" class="retry-btn">Retry</button>
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.error {
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
}

.retry-btn {
  margin-top: 1rem;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
