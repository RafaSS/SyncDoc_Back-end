<script setup lang="ts">
const emit = defineEmits<{
  (e: "showHistory"): void;
}>();

function showHistory() {
  emit("showHistory");
}
</script>

<template>
  <div id="toolbar" class="editor-toolbar">
    <span class="ql-formats">
      <select class="ql-header" title="Heading">
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
      <button class="ql-bold" title="Bold"></button>
      <button class="ql-italic" title="Italic"></button>
      <button
        class="ql-underline"
        title="Underline"
      ></button>
      <button class="ql-strike" title="Strikethrough"></button>
    </span>
    <span class="ql-formats">
      <select class="ql-color" title="Text Color"></select>
      <select
        class="ql-background"
        title="Background Color"
      ></select>
    </span>
    <span class="ql-formats">
      <button
        class="ql-list"
        value="ordered"
        title="Ordered List"
      ></button>
      <button
        class="ql-list"
        value="bullet"
        title="Bullet List"
      ></button>
      <button
        class="ql-indent"
        value="-1"
        title="Outdent"
      ></button>
      <button
        class="ql-indent"
        value="+1"
        title="Indent"
      ></button>
    </span>
    <span class="ql-formats">
      <button
        class="ql-align"
        value=""
        title="Align Left"
      ></button>
      <button
        class="ql-align"
        value="center"
        title="Align Center"
      ></button>
      <button
        class="ql-align"
        value="right"
        title="Align Right"
      ></button>
      <button
        class="ql-align"
        value="justify"
        title="Align Justify"
      ></button>
    </span>
    <span class="ql-formats">
      <button class="ql-link" title="Link"></button>
      <button class="ql-image" title="Image"></button>
    </span>
    <span class="ql-formats">
      <button
        class="history-btn"
        @click="showHistory"
        title="View History"
      >
        <i class="fas fa-history"></i> History
      </button>
    </span>
  </div>
</template>

<style scoped>
.editor-toolbar {
  border: 1px solid #ddd;
  border-radius: 6px 6px 0 0;
  background: #f8f9fa;
  padding: 8px 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

:deep(.ql-picker) {
  font-size: 0.9rem;
}

:deep(.ql-picker-label) {
  padding: 4px 8px;
  border-radius: 4px;
}

:deep(.ql-picker-options) {
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 5px 0;
}

:deep(.ql-picker-item) {
  padding: 5px 10px;
}

:deep(.ql-picker-item):hover {
  background-color: #f1f5f9;
}

:deep(.ql-formats) {
  margin-right: 10px;
}

:deep(.ql-stroke) {
  stroke: #555;
}

:deep(.ql-fill) {
  fill: #555;
}

:deep(.ql-toolbar button) {
  width: 32px;
  height: 32px;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

:deep(.ql-toolbar button:hover) {
  background-color: rgba(75, 112, 226, 0.1);
}

:deep(.ql-toolbar button.ql-active) {
  background-color: rgba(75, 112, 226, 0.15);
}

:deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: #4b70e2;
}

:deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: #4b70e2;
}

.history-btn {
  background-color: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 5px 10px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #555;
  transition: all 0.2s ease;
  height: 32px;
}

.history-btn:hover {
  background-color: rgba(75, 112, 226, 0.1);
  border-color: #4b70e2;
  color: #4b70e2;
}

/* Dark mode styles */
:deep(.dark-mode .editor-toolbar) {
  background-color: var(--editor-toolbar-bg);
  border-color: var(--border-color);
}

:deep(.dark-mode .ql-picker-label) {
  color: var(--text-color);
}

:deep(.dark-mode .ql-picker-options) {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

:deep(.dark-mode .ql-picker-item) {
  color: var(--text-color);
}

:deep(.dark-mode .ql-stroke) {
  stroke: var(--text-color);
}

:deep(.dark-mode .ql-fill) {
  fill: var(--text-color);
}

:deep(.dark-mode .ql-picker-item):hover {
  background-color: var(--hover-color);
  color: white;
}

:deep(.dark-mode .ql-toolbar button:hover) {
  background-color: rgba(75, 112, 226, 0.2);
}

:deep(.dark-mode .ql-toolbar button.ql-active) {
  background-color: rgba(75, 112, 226, 0.3);
}

:deep(.dark-mode .history-btn) {
  color: var(--text-color);
  border-color: var(--border-color);
}

:deep(.dark-mode .history-btn:hover) {
  background-color: rgba(75, 112, 226, 0.2);
  border-color: var(--accent-color);
  color: var(--accent-color);
}
</style>
