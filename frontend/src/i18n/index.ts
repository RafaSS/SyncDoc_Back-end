// i18n/index.ts
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import pt from "./locales/pt.json";

// Make sure these imports are explicitly processed as JSON modules
const messages = {
  en,
  pt,
};

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("language") || "en",
  fallbackLocale: "en",
  messages,
  // Add global scope to prevent missing message warnings
  globalInjection: true,
  // Add this to ensure correct functioning in production
  silentFallbackWarn: true,
  silentTranslationWarn: true,
});

export default i18n;
