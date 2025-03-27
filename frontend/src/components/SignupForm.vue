<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const username = ref("");
const confirmPassword = ref("");
const errorMessage = ref("");

onMounted(async () => {
  if (!authStore.initialized) {
    console.error("Initializing auth store in SignupForm.vue");
    await authStore.initialize();
  }
});

async function handleSignup() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match";
    return;
  }

  try {
    await authStore.signup(email.value, password.value);
    if (authStore.isLoggedIn) {
      router.push("/");
    } else {
      errorMessage.value = authStore.error || "Signup failed";
    }
  } catch (error: any) {
    errorMessage.value = error.message;
  }
}
</script>

<template>
  <div class="signup-form">
    <h2>Create Account</h2>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

    <form @submit.prevent="handleSignup">
      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="username"
          type="text"
          required
          placeholder="Choose a username"
        />
      </div>

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
          placeholder="Choose a password"
        />
      </div>

      <div class="form-group">
        <label for="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          required
          placeholder="Confirm your password"
        />
      </div>

      <button type="submit" :disabled="authStore.loading">
        {{ authStore.loading ? "Creating account..." : "Sign up" }}
      </button>
    </form>

    <div class="auth-links">
      <router-link to="/login">Already have an account? Login</router-link>
    </div>
  </div>
</template>

<style scoped>
.signup-form {
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
  text-align: center;
}

.auth-links a {
  color: #4285f4;
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}
</style>
