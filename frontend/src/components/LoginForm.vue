<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isPasswordVisible = ref(false);

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
      errorMessage.value = authStore.error || "Login failed. Please try again.";
    }
  } catch (error: any) {
    errorMessage.value = error.message;
  }
}

function togglePasswordVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value;
}
</script>

<template>
  <div class="login-form">
    <h2>Log In</h2>
    <p class="form-subtitle">Welcome back!</p>

    <div v-if="errorMessage" class="error">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">
          <i class="fas fa-envelope"></i>
          Email
        </label>
        <div class="input-wrapper">
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="Enter your email"
            autocomplete="email"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="password">
          <i class="fas fa-lock"></i>
          Password
        </label>
        <div class="input-wrapper">
          <input
            id="password"
            v-model="password"
            :type="isPasswordVisible ? 'text' : 'password'"
            required
            placeholder="Enter your password"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="password-toggle"
            @click="togglePasswordVisibility"
            tabindex="-1"
          >
            <i
              :class="isPasswordVisible ? 'fas fa-eye-slash' : 'fas fa-eye'"
            ></i>
          </button>
        </div>
      </div>

      <div class="form-options">
        <label class="remember-me">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>
        <router-link to="/forgot-password" class="forgot-password">
          Forgot Password?
        </router-link>
      </div>

      <button type="submit" :disabled="authStore.loading" class="login-button">
        <i class="fas fa-sign-in-alt"></i>
        {{ authStore.loading ? "Logging in..." : "Log In" }}
      </button>
    </form>

    <div class="social-login">
      <p class="divider">Or continue with</p>
      <div class="social-buttons">
        <button class="social-button google">
          <i class="fab fa-google"></i>
        </button>
        <button class="social-button github">
          <i class="fab fa-github"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-form {
  width: 100%;
}

h2 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.form-subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

label i {
  color: #4b70e2;
}

.input-wrapper {
  position: relative;
}

input {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.3s;
  background-color: #f9fafb;
  color: #333;
}

input:focus {
  border-color: #4b70e2;
  box-shadow: 0 0 0 3px rgba(75, 112, 226, 0.2);
  outline: none;
  background-color: #fff;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #777;
  cursor: pointer;
  padding: 5px;
}

.password-toggle:hover {
  color: #4b70e2;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.remember-me input {
  width: auto;
}

.forgot-password {
  color: #4b70e2;
  text-decoration: none;
  font-weight: 500;
}

.forgot-password:hover {
  text-decoration: underline;
}

.error {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-button {
  width: 100%;
  padding: 0.85rem;
  background-color: #4b70e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(75, 112, 226, 0.3);
}

.login-button:hover {
  background-color: #3a5bbf;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(75, 112, 226, 0.4);
}

.login-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.social-login {
  margin-top: 2.5rem;
}

.divider {
  text-align: center;
  position: relative;
  color: #888;
  margin-bottom: 1.5rem;
}

.divider::before,
.divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background-color: #ddd;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.social-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.social-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.social-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.social-button i {
  font-size: 1.2rem;
}

.social-button.google i {
  color: #db4437;
}

.social-button.github i {
  color: #24292e;
}

/* Dark mode styles */
.dark-mode h2 {
  color: var(--text-color);
}

.dark-mode .form-subtitle {
  color: var(--muted-color);
}

.dark-mode label {
  color: var(--text-color);
}

.dark-mode label i {
  color: var(--accent-color);
}

.dark-mode input {
  background-color: var(--input-bg);
  border-color: var(--border-color);
  color: var(--text-color);
}

.dark-mode input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(75, 112, 226, 0.3);
  background-color: rgba(51, 51, 51, 0.8);
}

.dark-mode .password-toggle {
  color: var(--muted-color);
}

.dark-mode .password-toggle:hover {
  color: var(--accent-color);
}

.dark-mode .remember-me span {
  color: var(--text-color);
}

.dark-mode .forgot-password {
  color: var(--accent-color);
}

.dark-mode .forgot-password:hover {
  color: var(--hover-color);
}

.dark-mode .error {
  background-color: rgba(231, 76, 60, 0.2);
  color: var(--error-color);
}

.dark-mode .login-button {
  background-color: var(--accent-color);
}

.dark-mode .login-button:hover {
  background-color: var(--hover-color);
}

.dark-mode .login-button:disabled {
  background-color: #444;
}

.dark-mode .divider {
  color: var(--muted-color);
}

.dark-mode .divider::before,
.dark-mode .divider::after {
  background-color: var(--border-color);
}

.dark-mode .social-button {
  background-color: var(--input-bg);
  border-color: var(--border-color);
}

.dark-mode .social-button:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.dark-mode .social-button.google i {
  color: #ff6b6b;
}

.dark-mode .social-button.github i {
  color: #e0e0e0;
}
</style>
