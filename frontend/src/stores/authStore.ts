import { AuthService } from "../services/authService";
import { defineStore } from "pinia";
import { ref } from "vue";
import { removeCookie } from "../utils/cookie";

/**
 * Auth store using Pinia's defineStore pattern for better state management.
 * This store handles user authentication and session management.
 */
export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<any>(null);
  const error = ref(null);
  const loading = ref(false);
  const isLoggedIn = ref(false);
  const initialized = ref(false);

  /**
   * Initialize the auth store
   * This should be called before any other methods
   */
  async function initialize() {
    // Prevent double initialization
    if (initialized.value) {
      console.log("Auth store already initialized");
      return;
    }

    loading.value = true;
    try {
      console.log("Initializing auth store...");
      const session = await AuthService.getSession();
      // console.log("Auth store initializing with session:", session);

      if (session) {
        // Set the user from session
        user.value = await AuthService.getUser();
        isLoggedIn.value = !!user.value;
      } else {
        // No valid session found
        isLoggedIn.value = false;
        user.value = null;
        // Remove auth cookie
        removeCookie("auth_token");
        return;
      }
      initialized.value = true;
      console.log("Auth store initialized successfully");
    } catch (err: any) {
      console.error("Error initializing auth store:", err);
      error.value = err.message;
      isLoggedIn.value = false;
      user.value = null;
      // Remove auth cookie
      removeCookie("auth_token");
    } finally {
      loading.value = false;
    }
  }

  /**
   * Login with email and password
   * @param email - User email
   * @param password - User password
   */
  async function login(email: string, password: string) {
    if (!initialized.value) {
      console.warn(
        "Auth store used before initialization! Initializing now..."
      );
      await initialize();
    }

    loading.value = true;
    error.value = null;
    try {
      // We get a complete result with user and token
      const result = await AuthService.login(email, password);

      if (result) {
        // Auth service now handles setting the cookie with JWT token
        user.value = result;
        isLoggedIn.value = true;
        return user.value;
      }
    } catch (e: any) {
      console.error("Login error:", e);
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Signup with email and password
   * @param email - User email
   * @param password - User password
   */
  async function signup(email: string, password: string) {
    if (!initialized.value) {
      console.warn(
        "Auth store used before initialization! Initializing now..."
      );
      await initialize();
    }

    loading.value = true;
    error.value = null;
    try {
      const result = await AuthService.signup(email, password);

      if (result) {
        // Auth service now handles setting the cookie with JWT token
        user.value = result;
        isLoggedIn.value = true;
        return user.value;
      }
    } catch (e: any) {
      console.error("Signup error:", e);
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logout the current user
   */
  async function logout() {
    if (!initialized.value) {
      console.warn(
        "Auth store used before initialization! Initializing now..."
      );
      await initialize();
    }

    loading.value = true;
    try {
      await AuthService.logout();
      user.value = null;
      isLoggedIn.value = false;

      // Remove auth cookie
      removeCookie("auth_token");
    } catch (e: any) {
      console.error("Logout error:", e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  // Expose state and methods
  return {
    user,
    error,
    loading,
    isLoggedIn,
    initialized,
    initialize,
    login,
    signup,
    logout,
  };
});
