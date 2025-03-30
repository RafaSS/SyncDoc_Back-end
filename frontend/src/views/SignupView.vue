<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/authStore";

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const loading = ref(false);
const isPasswordVisible = ref(false);
const router = useRouter();
const authStore = useAuthStore();

// Initialize auth state if not already done
onMounted(async () => {
  if (!authStore.initialized) {
    console.error("Initializing auth store in SignupView.vue");
    await authStore.initialize();
  }
});

async function handleSignup() {
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await authStore.signup(email.value, password.value);
    router.push("/");
  } catch (err: any) {
    error.value = err.message || "Failed to create account";
  } finally {
    loading.value = false;
  }
}

function togglePasswordVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value;
}
</script>

<template>
  <div class="signup-container">
    <div class="signup-content">
      <div class="signup-branding">
        <h1>SyncDoc</h1>
        <p>Collaborative Document Editing</p>
        <div class="illustration">
          <i class="fas fa-file-alt main-icon"></i>
          <i class="fas fa-users secondary-icon"></i>
          <i class="fas fa-edit secondary-icon"></i>
        </div>
      </div>
      <div class="signup-card">
        <h2>Sign Up</h2>
        <p class="form-subtitle">Create a new account</p>

        <form @submit.prevent="handleSignup">
          <div v-if="error" class="error-message">
            <i class="fas fa-exclamation-circle"></i> {{ error }}
          </div>

          <div class="form-group">
            <label for="email"> <i class="fas fa-envelope"></i> Email </label>
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
            <label for="password"> <i class="fas fa-lock"></i> Password </label>
            <div class="input-wrapper">
              <input
                id="password"
                v-model="password"
                :type="isPasswordVisible ? 'text' : 'password'"
                required
                placeholder="Enter your password"
                autocomplete="new-password"
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

          <div class="form-group">
            <label for="confirm-password">
              <i class="fas fa-lock"></i> Confirm Password
            </label>
            <div class="input-wrapper">
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="isPasswordVisible ? 'text' : 'password'"
                required
                placeholder="Confirm your password"
                autocomplete="new-password"
              />
            </div>
          </div>

          <!-- <div class="terms">
            <label class="checkbox-label">
              <input type="checkbox" required />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
          </div> -->

          <button type="submit" class="btn-primary" :disabled="loading">
            <i class="fas fa-user-plus"></i>
            {{ loading ? "Creating Account..." : "Sign Up" }}
          </button>
        </form>

        <div class="login-link">
          Already have an account? <router-link to="/login">Log In</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signup-container {
  min-height: calc(100vh - 70px);
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem;
}

.signup-content {
  display: flex;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
  max-width: 1000px;
  min-height: 600px;
}

.signup-branding {
  flex: 1;
  background: linear-gradient(135deg, #4b70e2 0%, #3a5bbf 100%);
  color: white;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
}

.signup-branding h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
}

.signup-branding p {
  font-size: 1.2rem;
  opacity: 0.9;
  max-width: 300px;
  margin: 0 auto 2rem;
}

.illustration {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-icon {
  font-size: 7rem;
  color: rgba(255, 255, 255, 0.9);
  filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.2));
}

.secondary-icon {
  position: absolute;
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.7);
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.2));
}

.secondary-icon:nth-of-type(2) {
  top: 20px;
  right: 20px;
}

.secondary-icon:nth-of-type(3) {
  bottom: 20px;
  left: 20px;
}

.signup-card {
  flex: 1;
  padding: 3rem;
  display: flex;
  flex-direction: column;
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

input[type="email"],
input[type="password"],
input[type="text"] {
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

.terms {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
}

.btn-primary {
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

.btn-primary:hover {
  background-color: #3a5bbf;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(75, 112, 226, 0.4);
}

.btn-primary:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.error-message {
  color: #e74c3c;
  margin-bottom: 1.5rem;
  padding: 0.85rem;
  border-radius: 6px;
  background-color: rgba(231, 76, 60, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-link {
  margin-top: 2rem;
  text-align: center;
  color: #666;
}

.login-link a {
  color: #4b70e2;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.login-link a:hover {
  color: #3a5bbf;
  text-decoration: underline;
}

/* Dark mode styles */
.dark-mode .signup-container {
  background: linear-gradient(135deg, var(--background-color) 0%, #1a1a1a 100%);
}

.dark-mode .signup-content {
  background-color: var(--card-bg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.dark-mode .signup-branding {
  background: linear-gradient(135deg, var(--accent-color) 0%, #3a5bbf 100%);
}

.dark-mode .signup-card {
  background-color: var(--card-bg);
  color: var(--text-color);
}

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

.dark-mode input[type="email"],
.dark-mode input[type="password"],
.dark-mode input[type="text"] {
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

.dark-mode .checkbox-label {
  color: var(--text-color);
}

.dark-mode .btn-primary {
  background-color: var(--accent-color);
}

.dark-mode .btn-primary:hover {
  background-color: var(--hover-color);
}

.dark-mode .btn-primary:disabled {
  background-color: #444;
}

.dark-mode .error-message {
  background-color: rgba(231, 76, 60, 0.2);
  color: var(--error-color);
}

.dark-mode .login-link {
  color: var(--muted-color);
}

.dark-mode .login-link a {
  color: var(--accent-color);
}

.dark-mode .login-link a:hover {
  color: var(--hover-color);
}

@media (max-width: 768px) {
  .signup-content {
    flex-direction: column;
  }

  .signup-branding {
    padding: 2rem;
  }

  .illustration {
    width: 150px;
    height: 150px;
  }

  .main-icon {
    font-size: 5rem;
  }

  .secondary-icon {
    font-size: 2rem;
  }
}
</style>
