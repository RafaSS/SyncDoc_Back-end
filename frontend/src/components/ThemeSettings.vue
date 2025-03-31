<template>
  <div class="theme-settings">
    <!-- <div class="setting-group">
      <select
        class="language-select dark-mode-select"
        id="language-select"
        v-model="currentLanguage"
        @change="changeLanguage"
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
      </select>
    </div> -->
    <div class="setting-group">
      <label for="theme-toggle">Dark Mode</label>
      <div class="toggle-switch">
        <input
          type="checkbox"
          id="theme-toggle"
          v-model="isDarkMode"
          @change="themeStore.toggleDarkMode()"
        />
        <label for="theme-toggle" class="toggle-label">
          <span>{{ isDarkMode ? "On" : "Off" }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from "../stores/themeStore";
import { computed } from "vue";

const themeStore = useThemeStore();

// const currentLanguage = computed({
//   get: () => themeStore.language,
//   set: (value) => {
//     themeStore.setLanguage(value);
//   },
// });

const isDarkMode = computed(() => themeStore.darkMode);

// function changeLanguage() {
//   themeStore.setLanguage(currentLanguage.value);
// }
</script>

<style scoped>
.theme-settings {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin: 1rem;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

label {
  font-size: 0.9rem;
}

select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: white;
  color: #333;
  font-size: 0.9rem;
}

.dark-mode select {
  background-color: var(--input-bg);
  color: var(--text-color);
  border-color: var(--border-color);
}

.toggle-switch {
  position: relative;
  display: inline-block;
}

input[type="checkbox"] {
  height: 0;
  width: 0;
  visibility: hidden;
  position: absolute;
}

.toggle-label {
  cursor: pointer;
  width: 50px;
  height: 24px;
  background: #bbb;
  display: block;
  border-radius: 12px;
  position: relative;
  transition: background-color 0.3s;
}

.toggle-label::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
}

input:checked + .toggle-label {
  background: #4b70e2;
}

input:checked + .toggle-label::after {
  transform: translateX(26px);
}

.toggle-label span {
  position: absolute;
  right: -30px;
  font-size: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
}
</style>
