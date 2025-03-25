import { AuthService } from "../services/authService";
import { ref, computed } from "vue";
import { setCookie, removeCookie } from "../utils/cookie";

export function useAuthStore() {
  const user = ref<any>(null);
  const error = ref(null);
  const loading = ref(false);
  const isLoggedIn = ref(false);

  async function initialize() {
    loading.value = true;
    try {
      const session = await AuthService.getSession();
      console.log("Auth store initializing with session:", session);
      
      if (session) {
        // Set the user from session
        user.value = await AuthService.getUser();
        isLoggedIn.value = !!user.value;
      } else {
        // No valid session found
        isLoggedIn.value = false;
        user.value = null;
      }
    } catch (err: any) {
      console.error("Error initializing auth store:", err);
      error.value = err.message;
      isLoggedIn.value = false;
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
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
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function signup(email: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      user.value = await AuthService.signup(email, password);
      setCookie("auth_token", user.value.id, {
        days: 7,
        secure: window.location.protocol === "https:",
        sameSite: "lax",
      });
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    await AuthService.logout();
    user.value = null;
    removeCookie("auth_token");
  }

  function getSession() {
    return AuthService.getSession();
  }

  const isAuthenticated = computed(() => isLoggedIn.value);

  return {
    user,
    error,
    loading,
    isAuthenticated,
    initialize,
    login,
    signup,
    logout,
    getSession,
  };
}
