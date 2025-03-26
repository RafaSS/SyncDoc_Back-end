import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import { useAuthStore } from "./stores/authStore";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize auth store before mounting
const authStore = useAuthStore();
console.error("Initializing auth store in main.ts");
await authStore.initialize();

app.mount("#app");
