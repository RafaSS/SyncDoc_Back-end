import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/authStore";
import HomeView from "../views/HomeView.vue";
import EditorView from "../views/EditorView.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/SignupView.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: "/documents/:id",
    name: "editor",
    component: EditorView,
    meta: { requiresAuth: false },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/signup",
    name: "signup",
    component: RegisterView,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Initialize auth state if not already done
  if (!authStore.initialized) {
    console.error("Initializing auth store in router");
    await authStore.initialize();
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next("/login");
  } else {
    next();
  }
});

export default router;
