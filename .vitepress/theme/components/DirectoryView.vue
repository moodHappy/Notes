<script setup>
import { useData, withBase } from 'vitepress'
const { theme } = useData()
</script>

<template>
  <div class="directory-container">
    <div v-for="folder in theme.sidebar" :key="folder.text" class="folder-card">
      <h2 class="folder-title">{{ folder.text }}</h2>
      <ul class="file-list">
        <li v-for="item in folder.items" :key="item.link">
          <a :href="withBase(item.link)">📝 {{ item.text }}</a>
        </li>
        <li v-if="folder.items.length === 0" class="empty-tip">暂无笔记，快去写一篇吧！</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.directory-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 30px; }
.folder-card { border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 24px; background-color: var(--vp-c-bg-soft); transition: transform 0.2s; }
.folder-card:hover { transform: translateY(-5px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: var(--vp-c-brand); }
.folder-title { margin-top: 0; margin-bottom: 20px; font-size: 1.3rem; border-bottom: none; }
.file-list { list-style-type: none; padding: 0; margin: 0; }
.file-list li { margin-bottom: 12px; font-size: 1.05rem; }
.file-list a { text-decoration: none; color: var(--vp-c-brand); font-weight: 500; }
.file-list a:hover { text-decoration: underline; }
.empty-tip { color: var(--vp-c-text-3); font-size: 0.9rem; }
</style>
