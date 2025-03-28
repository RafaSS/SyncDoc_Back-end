import { defineStore } from "pinia";
import { ref } from "vue";

export const useThemeStore = defineStore("theme", () => {
  // State
  const darkMode = ref(localStorage.getItem("darkMode") === "true");
  const language = ref(localStorage.getItem("language") || "en");

  // Actions
  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    localStorage.setItem("darkMode", darkMode.value.toString());
    applyTheme();
  }

  function setLanguage(lang: string) {
    language.value = lang;
    localStorage.setItem("language", lang);
  }

  function applyTheme() {
    if (darkMode.value) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }

  // Initialize theme
  function initialize() {
    applyTheme();
  }

  return {
    darkMode,
    language,
    toggleDarkMode,
    setLanguage,
    initialize,
  };
});
