<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  documentId: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const shareLink = ref("");
const copyButtonText = ref("Copy");

onMounted(() => {
  // Generate the shareable link
  const baseUrl = window.location.origin;
  shareLink.value = `${baseUrl}/doc/${props.documentId}`;
});
function selectText(event: Event) {
  const input = event.target as HTMLInputElement;
  input.select();
}
function copyLink() {
  navigator.clipboard.writeText(shareLink.value);
  copyButtonText.value = "Copied!";
  setTimeout(() => {
    copyButtonText.value = "Copy";
  }, 2000);
}

function close() {
  emit("close");
}
</script>

<template>
  <div class="modal-backdrop" @click="close">
    <div class="modal-content" @click.stop>
      <span class="close-btn" @click="close">&times;</span>
      <h2>Share Document</h2>
      <p>Share this link with others to collaborate:</p>
      <div class="share-link-container">
        <input
          type="text"
          :value="shareLink"
          readonly
          @click="selectText($event)"
        />
        <button @click="copyLink">{{ copyButtonText }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

h2 {
  margin-top: 0;
  color: #333;
}

.share-link-container {
  display: flex;
  margin-top: 1rem;
}

.share-link-container input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
}

.share-link-container button {
  padding: 0.75rem 1.5rem;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.share-link-container button:hover {
  background-color: #3367d6;
}
</style>
