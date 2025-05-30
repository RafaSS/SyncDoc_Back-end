<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useDocumentStore } from "../stores/documentStore";

const documentStore = useDocumentStore();
const isDropdownOpen = ref(false);
const users = ref<Record<string, string>>({});

// Initialize users from document store on mount
onMounted(() => {
  users.value = { ...documentStore.document.users };
  console.log("UserList mounted with users:", users.value);
});

// Watch for user list changes
watch(
  () => documentStore.document.users,
  (newUsers) => {
    if (!newUsers) {
      users.value = {};
      return;
    }
    users.value = { ...newUsers };
    console.log("User list updated:", users.value);
  },
  { deep: true, immediate: true }
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
const handleClickOutside = (event: MouseEvent) => closeDropdown(event);
document.addEventListener("click", handleClickOutside);

// Clean up event listener on unmount
onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="user-list-container">
    <button id="user-list-button" @click="toggleDropdown">
      Collaborators ({{ userCount }})
    </button>

    <div class="user-list-dropdown" :class="{ active: isDropdownOpen }">
      <div class="user-list-content">
        <ul v-if="userCount > 0">
          <li
            v-for="(userName, userId) in users"
            :key="userId"
            :style="{ color: documentStore.userColors[userId] || '#000' }"
            class="user-list-item"
          >
            <span class="user-name">{{ userName }}</span>
            <span v-if="userId === documentStore.userId" class="current-user">(You)</span>
          </li>
        </ul>

        <div v-else class="no-users">
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
  padding: 1rem;
}

.user-list-content ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.user-list-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-list-item:last-child {
  border-bottom: none;
}

.user-name {
  font-weight: 500;
}

.current-user {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

.no-users {
  text-align: center;
  color: #666;
  padding: 1rem 0;
}
</style>
