import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import pt from './locales/pt.json';

const i18n = createI18n({
  legacy: false, // You must set `false`, to use Composition API
  locale: 'en', // set locale
  fallbackLocale: 'en', // set fallback locale
  messages: {
    en,
    pt
  }
});

export default i18n;
