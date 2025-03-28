<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n();
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
      <select class="ql-header" :title="$t('editor.toolbar.heading')">
        <option value="1">{{ $t("editor.toolbar.h1") }}</option>
        <option value="2">{{ $t("editor.toolbar.h2") }}</option>
        <option value="3">{{ $t("editor.toolbar.h3") }}</option>
        <option value="4">{{ $t("editor.toolbar.h4") }}</option>
        <option value="5">{{ $t("editor.toolbar.h5") }}</option>
        <option value="6">{{ $t("editor.toolbar.h6") }}</option>
        <option selected>{{ $t("editor.toolbar.normal") }}</option>
      </select>
    </span>
    <span class="ql-formats">
      <button class="ql-bold" :title="$t('editor.toolbar.bold')"></button>
      <button class="ql-italic" :title="$t('editor.toolbar.italic')"></button>
      <button
        class="ql-underline"
        :title="$t('editor.toolbar.underline')"
      ></button>
      <button class="ql-strike" :title="$t('editor.toolbar.strike')"></button>
    </span>
    <span class="ql-formats">
      <select class="ql-color" :title="$t('editor.toolbar.textColor')"></select>
      <select
        class="ql-background"
        :title="$t('editor.toolbar.backgroundColor')"
      ></select>
    </span>
    <span class="ql-formats">
      <button
        class="ql-list"
        value="ordered"
        :title="$t('editor.toolbar.orderedList')"
      ></button>
      <button
        class="ql-list"
        value="bullet"
        :title="$t('editor.toolbar.bulletList')"
      ></button>
      <button
        class="ql-indent"
        value="-1"
        :title="$t('editor.toolbar.outdent')"
      ></button>
      <button
        class="ql-indent"
        value="+1"
        :title="$t('editor.toolbar.indent')"
      ></button>
    </span>
    <span class="ql-formats">
      <button
        class="ql-align"
        value=""
        :title="$t('editor.toolbar.alignLeft')"
      ></button>
      <button
        class="ql-align"
        value="center"
        :title="$t('editor.toolbar.alignCenter')"
      ></button>
      <button
        class="ql-align"
        value="right"
        :title="$t('editor.toolbar.alignRight')"
      ></button>
      <button
        class="ql-align"
        value="justify"
        :title="$t('editor.toolbar.alignJustify')"
      ></button>
    </span>
    <span class="ql-formats">
      <button class="ql-link" :title="$t('editor.toolbar.link')"></button>
      <button class="ql-image" :title="$t('editor.toolbar.image')"></button>
    </span>
    <span class="ql-formats">
      <button
        class="history-btn"
        @click="showHistory"
        :title="$t('editor.toolbar.history')"
      >
        <i class="fas fa-history"></i> {{ $t("editor.toolbar.history") }}
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

:deep(.dark-mode .ql-stroke) {
  stroke: var(--text-color);
}

:deep(.dark-mode .ql-fill) {
  fill: var(--text-color);
}

:deep(.dark-mode .ql-picker) {
  color: var(--text-color);
}

:deep(.dark-mode .ql-picker-options) {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

:deep(.dark-mode .ql-picker-item):hover {
  background-color: var(--hover-color);
  color: white;
}

:deep(.dark-mode .ql-toolbar button:hover) {
  background-color: rgba(75, 112, 226, 0.25);
}

:deep(.dark-mode .ql-toolbar button.ql-active) {
  background-color: rgba(75, 112, 226, 0.3);
}

.dark-mode .history-btn {
  color: var(--text-color);
  border-color: var(--border-color);
}

.dark-mode .history-btn:hover {
  background-color: rgba(75, 112, 226, 0.25);
  color: #4b70e2;
  border-color: #4b70e2;
}
</style>
