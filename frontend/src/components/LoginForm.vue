<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const errorMessage = ref("");

onMounted(async () => {
  if (!authStore.initialized) {
    console.error("Initializing auth store in LoginForm.vue");
    await authStore.initialize();
  }
});

async function handleLogin() {
  try {
    await authStore.login(email.value, password.value);
    if (authStore.isLoggedIn) {
      router.push("/");
    } else {
      errorMessage.value = authStore.error || "Login failed";
    }
  } catch (error: any) {
    errorMessage.value = error.message;
  }
}
</script>

<template>
  <div class="login-form">
    <h2>Login</h2>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          placeholder="Your email address"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          placeholder="Your password"
        />
      </div>

      <button type="submit" :disabled="authStore.loading">
        {{ authStore.loading ? "Logging in..." : "Login" }}
      </button>
    </form>

    <div class="auth-links">
      <router-link to="/signup">Create an account</router-link>
      <router-link to="/forgot-password">Forgot password?</router-link>
    </div>
  </div>
</template>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #3367d6;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #f8d7da;
}

.auth-links {
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
}

.auth-links a {
  color: #4285f4;
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}
</style>
