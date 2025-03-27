<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/authStore";
import { useRouter } from "vue-router";
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();

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
      errorMessage.value = authStore.error || t('login.failed');
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
    <h2>{{ $t('navbar.login') }}</h2>
    <p class="form-subtitle">{{ $t('login.welcome') }}</p>

    <div v-if="errorMessage" class="error">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">
          <i class="fas fa-envelope"></i>
          {{ $t('login.email') }}
        </label>
        <div class="input-wrapper">
          <input
            id="email"
            v-model="email"
            type="email"
            required
            :placeholder="$t('login.emailPlaceholder')"
            autocomplete="email"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="password">
          <i class="fas fa-lock"></i>
          {{ $t('login.password') }}
        </label>
        <div class="input-wrapper">
          <input
            id="password"
            v-model="password"
            :type="isPasswordVisible ? 'text' : 'password'"
            required
            :placeholder="$t('login.passwordPlaceholder')"
            autocomplete="current-password"
          />
          <button 
            type="button" 
            class="password-toggle" 
            @click="togglePasswordVisibility"
            tabindex="-1"
          >
            <i :class="isPasswordVisible ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <div class="form-options">
        <label class="remember-me">
          <input type="checkbox" />
          <span>{{ $t('login.rememberMe') }}</span>
        </label>
        <router-link to="/forgot-password" class="forgot-password">
          {{ $t('login.forgotPassword') }}
        </router-link>
      </div>

      <button type="submit" :disabled="authStore.loading" class="login-button">
        <i class="fas fa-sign-in-alt"></i>
        {{ authStore.loading ? $t('login.loggingIn') : $t('navbar.login') }}
      </button>
    </form>

    <div class="social-login">
      <p class="divider">{{ $t('login.orContinueWith') }}</p>
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
  color: #555;
  cursor: pointer;
}

.forgot-password {
  color: #4b70e2;
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
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
  box-shadow: 0 2px 6px rgba(75, 112, 226, 0.3);
}

.login-button:hover {
  background-color: #3a5bbf;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(75, 112, 226, 0.4);
}

.login-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.error {
  color: #e74c3c;
  margin-bottom: 1.5rem;
  padding: 0.85rem;
  border-radius: 6px;
  background-color: rgba(231, 76, 60, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error i {
  color: #e74c3c;
}

.social-login {
  margin-top: 2rem;
}

.divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
  color: #888;
}

.divider::before,
.divider::after {
  content: '';
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
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
}

.social-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.google {
  color: #DB4437;
}

.github {
  color: #333;
}
</style>
