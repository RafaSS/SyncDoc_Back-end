<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import { apiService } from "../services/apiService";
import DocumentList from "../components/DocumentList.vue";
import { useI18n } from 'vue-i18n'

const router = useRouter();
const documentStore = useDocumentStore();
const isLoading = ref(true);
const error = ref("");
const documents = ref<Array<{ id: string; title: string; userCount: number }>>(
  []
);
const { t } = useI18n()

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
    error.value = t('home.error');
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
    error.value = t('home.error');
  }
}

function openDocument(id: string) {
  router.push({ name: "editor", params: { id } });
}
</script>

<template>
  <div class="home-container">
    <header>
      <h1>{{ $t('app.name') }}</h1>
      <p>{{ $t('app.tagline') }}</p>
    </header>

    <main>
      <div class="actions">
        <button @click="createNewDocument" class="create-btn">
          <i class="fas fa-plus"></i> {{ $t('home.newDocument') }}
        </button>
      </div>

      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>{{ $t('home.loading') }}</p>
      </div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="fetchDocuments" class="retry-btn">{{ $t('home.retry') }}</button>
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
  min-height: calc(100vh - 70px);
  display: flex;
  flex-direction: column;
}

header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 3rem 1rem;
  position: relative;
  overflow: hidden;
}

header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(135deg, rgba(75, 112, 226, 0.1), rgba(66, 133, 244, 0.05));
  transform: skewY(-2deg) translateY(-30%);
  z-index: -1;
  border-radius: 0 0 50% 50% / 20%;
}

header h1 {
  font-size: 3.5rem;
  margin-bottom: 0.8rem;
  color: #4b70e2;
  letter-spacing: -1px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(75, 112, 226, 0.2);
}

header p {
  font-size: 1.4rem;
  color: #555;
  max-width: 600px;
  margin: 0 auto;
  font-weight: 300;
}

main {
  flex: 1;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2.5rem;
}

.create-btn {
  background-color: #4b70e2;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.85rem 1.8rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(75, 112, 226, 0.25);
}

.create-btn:hover {
  background-color: #3a5bbf;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(75, 112, 226, 0.35);
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(75, 112, 226, 0.1);
  border-top: 4px solid #4b70e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

.error {
  text-align: center;
  padding: 3rem;
  color: #e74c3c;
  background-color: rgba(231, 76, 60, 0.05);
  border-radius: 8px;
  margin: 2rem 0;
}

.retry-btn {
  margin-top: 1.5rem;
  background-color: #4b70e2;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(75, 112, 226, 0.2);
}

.retry-btn:hover {
  background-color: #3a5bbf;
  transform: translateY(-2px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
