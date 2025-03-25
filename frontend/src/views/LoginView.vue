<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Welcome to SyncDoc</h1>
      <LoginForm />
      <div class="signup-link">
        Don't have an account? <router-link to="/signup">Sign up</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue';
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-card {
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.signup-link {
  margin-top: 1rem;
  text-align: center;
}
</style>
