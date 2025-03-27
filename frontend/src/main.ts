import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import "./assets/darkMode.css";
import { useAuthStore } from "./stores/authStore";
import { useThemeStore } from "./stores/themeStore";
import i18n from "./i18n";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

// Initialize auth store before mounting
const authStore = useAuthStore();
const themeStore = useThemeStore();
console.error("Initializing auth store in main.ts");
authStore.initialize().then(() => {
  // Initialize theme
  themeStore.initialize();
  app.mount("#app");
});
