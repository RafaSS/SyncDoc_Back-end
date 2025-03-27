<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDocumentStore } from "../stores/documentStore";

const documentStore = useDocumentStore();
const isDropdownOpen = ref(false);
const users = ref<Record<string, string>>({});

// Watch for user list changes
watch(
  () => documentStore.document.users,
  (newUsers) => {
    users.value = newUsers;
  },
  { deep: true }
);

const userCount = computed(() => {
  return Object.keys(users.value).length;
});

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function closeDropdown(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const dropdown = document.querySelector(".user-list-dropdown") as HTMLElement;
  const button = document.querySelector("#user-list-button") as HTMLElement;

  if (!dropdown?.contains(target) && !button?.contains(target)) {
    isDropdownOpen.value = false;
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", closeDropdown);
</script>

<template>
  <div class="user-list-container">
    <button id="user-list-button" @click="toggleDropdown">
      Collaborators ({{ userCount }})
    </button>

    <div class="user-list-dropdown" :class="{ active: isDropdownOpen }">
      <div class="user-list-content">
        <ul>
          <li
            v-for="(userName, userId) in users"
            :key="userId"
            :style="{ color: documentStore.userColors[userId] || '#000' }"
          >
            {{ userName }}
            <span v-if="userId === documentStore.userId">(You)</span>
          </li>
        </ul>

        <div v-if="userCount === 0" class="no-users">
          No active collaborators
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-list-container {
  position: relative;
}

#user-list-button {
  background-color: #f1f3f4;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  color: #000;
  cursor: pointer;
  transition: background-color 0.2s;
}

#user-list-button:hover {
  background-color: #e8eaed;
}

.user-list-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  width: 250px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: none;
}

.user-list-dropdown.active {
  display: block;
}

.user-list-content {
  padding: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
  cursor: default;
}

li:last-child {
  border-bottom: none;
}

.no-users {
  color: #666;
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
}
</style>
