<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { DeltaChange } from "../types";
import type { Delta } from "../types";

const props = defineProps<{
  history: DeltaChange[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const sortedHistory = computed(() => {
  return [...props.history].sort((a, b) => b.timestamp - a.timestamp);
});

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function operationDescription(change: DeltaChange): string {
  if (!change || !change.delta || !change.delta.ops) {
    return "Unknown change";
  }

  let insertCount = 0;
  let deleteCount = 0;
  let formatCount = 0;

  change.delta.ops.forEach((op: any) => {
    if (op.insert) insertCount++;
    if (op.delete) deleteCount++;
    if (op.retain && op.attributes) formatCount++;
  });

  const parts = [];
  if (insertCount > 0)
    parts.push(`${insertCount} insertion${insertCount !== 1 ? "s" : ""}`);
  if (deleteCount > 0)
    parts.push(`${deleteCount} deletion${deleteCount !== 1 ? "s" : ""}`);
  if (formatCount > 0)
    parts.push(`${formatCount} format change${formatCount !== 1 ? "s" : ""}`);

  return parts.join(", ") || "Document change";
}

function close() {
  emit("close");
}

onMounted(() => {
  console.log("History panel mounted with history:", props.history);
});
</script>

<template>
  <div class="history-panel">
    <div class="history-header">
      <h3>Document History</h3>
      <button class="close-btn" @click="close">&times;</button>
    </div>

    <div class="history-content">
      <div
        v-if="!props.history || props.history.length === 0"
        class="no-history"
      >
        <p>No history available for this document.</p>
      </div>

      <div v-else class="history-list">
        <div
          v-for="(change, index) in sortedHistory"
          :key="index"
          class="history-item"
        >
          <div class="history-item-header">
            <span class="history-user">{{ change.userName }}</span>
            <span class="history-time">{{
              formatTimestamp(change.timestamp)
            }}</span>
          </div>
          <div class="history-operation">
            {{ operationDescription(change) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 350px;
  height: 100%;
  background-color: white;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
}

.history-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.no-history {
  text-align: center;
  color: #666;
  margin-top: 2rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.history-user {
  font-weight: bold;
  color: #4285f4;
}

.history-time {
  font-size: 0.8rem;
  color: #666;
}

.history-operation {
  font-size: 0.9rem;
  color: #333;
}
</style>
