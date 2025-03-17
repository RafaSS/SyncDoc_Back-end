<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
@import url('https://cdn.quilljs.com/1.3.6/quill.snow.css');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  color: #333;
  background-color: #f8f9fa;
  line-height: 1.6;
}

.ql-toolbar {
  background-color: #f8f9fa;
  border-color: #ddd;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.ql-container {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  height: auto;
  border-color: #ddd;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.ql-editor {
  min-height: calc(100vh - 150px);
  padding: 20px;
}

/* Style for remote cursors */
.cursor {
  position: absolute;
  height: 20px;
  width: 2px;
  z-index: 2;
}

.cursor-flag {
  position: absolute;
  top: -18px;
  left: 0;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}
</style>
