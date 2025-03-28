<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-branding">
        <h1>SyncDoc</h1>
        <p>Collaborative Document Editing</p>
        <div class="illustration">
          <i class="fas fa-file-alt main-icon"></i>
          <i class="fas fa-users secondary-icon"></i>
          <i class="fas fa-edit secondary-icon"></i>
        </div>
      </div>
      <div class="login-card">
        <LoginForm />
        <div class="signup-link">
          Don't have an account? <router-link to="/signup">Sign Up</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue';
</script>

<style scoped>
.login-container {
  min-height: calc(100vh - 70px);
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem;
}

.login-content {
  display: flex;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
  max-width: 1000px;
  min-height: 600px;
}

.login-branding {
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

.login-branding h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
}

.login-branding p {
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

.login-card {
  flex: 1;
  padding: 3rem;
  display: flex;
  flex-direction: column;
}

.signup-link {
  margin-top: 2rem;
  text-align: center;
  color: #666;
}

.signup-link a {
  color: #4b70e2;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.signup-link a:hover {
  color: #3a5bbf;
  text-decoration: underline;
}

/* Dark mode styles */
.dark-mode .login-container {
  background: linear-gradient(135deg, var(--background-color) 0%, #1a1a1a 100%);
}

.dark-mode .login-content {
  background-color: var(--card-bg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.dark-mode .login-branding {
  background: linear-gradient(135deg, var(--accent-color) 0%, #3a5bbf 100%);
}

.dark-mode .login-card {
  background-color: var(--card-bg);
  color: var(--text-color);
}

.dark-mode .signup-link {
  color: var(--muted-color);
}

.dark-mode .signup-link a {
  color: var(--accent-color);
}

.dark-mode .signup-link a:hover {
  color: var(--hover-color);
}

@media (max-width: 768px) {
  .login-content {
    flex-direction: column;
  }
  
  .login-branding {
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
