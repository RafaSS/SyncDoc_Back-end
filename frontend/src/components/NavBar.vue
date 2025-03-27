<template>
  <nav class="navbar">
    <div class="logo">
      <router-link to="/">{{ $t('app.name') }}</router-link>
    </div>
    <div class="nav-right">
      <ThemeSettings />
      <div class="nav-links">
        <template v-if="authStore.isLoggedIn">
          <router-link to="/" class="nav-link">
            <i class="fas fa-file-alt"></i> {{ $t('navbar.documents') }}
          </router-link>
          <button @click="handleLogout" class="logout-btn">
            <i class="fas fa-sign-out-alt"></i> {{ $t('navbar.logout') }}
          </button>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-link">
            <i class="fas fa-sign-in-alt"></i> {{ $t('navbar.login') }}
          </router-link>
          <router-link to="/signup" class="signup-btn">
            <i class="fas fa-user-plus"></i> {{ $t('navbar.signup') }}
          </router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";
import { onMounted } from "vue";
import ThemeSettings from "./ThemeSettings.vue";

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
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo a {
  font-size: 1.6rem;
  font-weight: 700;
  color: #4b70e2;
  text-decoration: none;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.logo a:hover {
  color: #3a5bbf;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.nav-link:hover {
  color: #4b70e2;
  border-bottom: 2px solid #4b70e2;
}

.logout-btn {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background-color: rgba(231, 76, 60, 0.1);
}

.signup-btn {
  background-color: #4b70e2;
  color: white;
  text-decoration: none;
  padding: 0.5rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 6px rgba(75, 112, 226, 0.3);
  transition: all 0.3s ease;
}

.signup-btn:hover {
  background-color: #3a5bbf;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(75, 112, 226, 0.4);
}
</style>
