<script setup lang="ts">
defineProps<{
  documents: Array<{
    id: string
    title: string
    userCount: number
  }>
}>()

const emit = defineEmits<{
  (e: 'openDocument', id: string): void
}>()

function openDocument(id: string) {
  emit('openDocument', id)
}
</script>

<template>
  <div class="document-list">
    <h2 v-if="documents.length === 0" class="no-documents">
      No documents found. Create a new one to get started!
    </h2>
    
    <div v-else class="documents-grid">
      <div 
        v-for="doc in documents"
        :key="doc.id"
        class="document-card"
        @click="openDocument(doc.id)"
      >
        <div class="document-info">
          <h3>{{ doc.title }}</h3>
          <p class="document-users">
            <span class="user-count">{{ doc.userCount }}</span>
            <span>{{ doc.userCount === 1 ? 'user' : 'users' }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-list {
  margin-top: 1rem;
}

.no-documents {
  text-align: center;
  color: #666;
  margin: 4rem 0;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.document-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.document-card:hover {
  border-color: #4285F4;
  box-shadow: 0 4px 12px rgba(66,133,244,0.1);
  transform: translateY(-2px);
}

.document-info h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.2rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-users {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.user-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: #4285F4;
  color: white;
  border-radius: 50%;
  font-size: 0.8rem;
}
</style>
