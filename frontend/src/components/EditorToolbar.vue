<script setup lang="ts">
const emit = defineEmits<{
  (e: 'showHistory'): void
}>()

function showHistory() {
  emit('showHistory')
}
</script>

<template>
  <div id="toolbar">
    <span class="ql-formats">
      <select class="ql-header">
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
        <option selected>Normal</option>
      </select>
    </span>
    <span class="ql-formats">
      <button class="ql-bold"></button>
      <button class="ql-italic"></button>
      <button class="ql-underline"></button>
    </span>
    <span class="ql-formats">
      <select class="ql-color"></select>
      <select class="ql-background"></select>
    </span>
    <span class="ql-formats">
      <button class="ql-list" value="ordered"></button>
      <button class="ql-list" value="bullet"></button>
    </span>
    <span class="ql-formats">
      <button class="ql-link"></button>
    </span>
    <span class="ql-formats">
      <button class="history-btn" @click="showHistory">
        <i class="fas fa-history"></i> History
      </button>
    </span>
  </div>
</template>

<style scoped>
#toolbar {
  border: 1px solid #ccc;
  border-radius: 4px 4px 0 0;
  background: #f8f8f8;
}

.history-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 5px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #444;
}

.history-btn:hover {
  color: #1a73e8;
}

/* Load Font Awesome for the history icon */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
</style>
