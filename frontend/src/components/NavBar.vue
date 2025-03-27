<template>
  <nav class="navbar">
    <div class="logo">
      <router-link to="/">SyncDoc</router-link>
    </div>
    <div class="nav-links">
      <template v-if="authStore.isLoggedIn">
        <router-link to="/" class="nav-link">Documents</router-link>
        <button @click="handleLogout" class="logout-btn">Logout</button>
      </template>
      <template v-else>
        <router-link to="/login" class="nav-link">Login</router-link>
        <router-link to="/signup" class="signup-btn">Sign Up</router-link>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";
import { onMounted } from "vue";

const authStore = useAuthStore();
// Initialize auth state if not already done
onMounted(async () => {
  if (!authStore.initialized) {
    console.error("Initializing auth store in NavBar.vue");
    await authStore.initialize();
  }
});
const router = useRouter();

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo a {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: #333;
  text-decoration: none;
}

.logout-btn {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.signup-btn {
  background-color: #4b70e2;
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}
</style>
