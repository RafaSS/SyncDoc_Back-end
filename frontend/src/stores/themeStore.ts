import { defineStore } from "pinia";
import { ref } from "vue";
import i18n from "../i18n";

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
    // Set the language from storage
    if (i18n.global.locale) {
      i18n.global.locale.value = language.value as "en" | "pt";
    }
  }

  return {
    darkMode,
    language,
    toggleDarkMode,
    setLanguage,
    initialize,
  };
});
