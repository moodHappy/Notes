<script>
import { reactive } from 'vue'
const folderState = reactive(JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem('vp_folder_state') || '{}' : '{}'))
</script>

<script setup>
import { withBase } from 'vitepress'
const props = defineProps({
  node: Object,
  isManageMode: Boolean
})
const emit = defineEmits(['edit', 'delete'])

const onToggle = (e) => {
  if (props.node.items) {
    const id = props.node.id || props.node.text
    folderState[id] = e.target.open
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vp_folder_state', JSON.stringify(folderState))
    }
  }
}
</script>

<template>
  <div class="tree-node">
    <details 
      v-if="node.items" 
      class="folder-details" 
      :open="folderState[node.id || node.text]" 
      @toggle="onToggle"
    >
      <summary class="folder-summary">
        <span class="folder-icon">📂</span> 
        <span class="folder-name">{{ node.text }}</span>
        <span class="count-badge">{{ node.items.length }}</span>
      </summary>
      
      <div class="folder-content">
        <FolderNode 
          v-for="child in node.items" 
          :key="child.link || child.text" 
          :node="child" 
          :isManageMode="isManageMode"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </details>

    <div v-else class="note-row">
      <!-- 终极优雅解法：用 target="_top" 触发原生跳转，不挂载任何冗余历史记录，完美唤醒插件 -->
      <a :href="withBase(node.link)" target="_top" class="note-link">
        <span class="note-icon">📄</span>
        <span class="note-name">{{ node.text }}</span>
        <span class="note-date">{{ node.date }}</span>
      </a>
      
      <div v-if="isManageMode" class="action-buttons">
        <button @click="$emit('edit', node.link)" class="btn-action edit" title="修改">✏️</button>
        <button @click="$emit('delete', node)" class="btn-action delete" title="彻底删除">🗑️</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-node { margin: 4px 0; }
.folder-details { border-radius: 8px; }
.folder-summary {
  display: flex; align-items: center; padding: 10px 12px; cursor: pointer;
  background: var(--vp-c-bg-soft); border-radius: 8px; font-weight: 600;
  font-size: 1.05rem; user-select: none; transition: background 0.2s;
}
.folder-summary:hover { background: var(--vp-c-bg-mute); }
.folder-name { margin-left: 6px; flex-grow: 1; }
.count-badge { background: var(--vp-c-divider); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; color: var(--vp-c-text-2); }
.folder-content {
  padding-left: 20px; margin-top: 4px; border-left: 1px dashed var(--vp-c-divider); margin-left: 16px;
}
.note-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 6px; transition: background 0.2s;
}
.note-row:hover { background: var(--vp-c-bg-soft); }
.note-link { flex: 1; display: flex; align-items: center; text-decoration: none !important; overflow: hidden; }
.note-icon { font-size: 0.9rem; margin-right: 8px; filter: grayscale(100%); opacity: 0.7; }
.note-name { font-size: 1rem; color: var(--vp-c-brand); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 12px; }
.note-link:hover .note-name { text-decoration: underline; }
.note-date { font-size: 0.8rem; color: var(--vp-c-text-3); font-family: monospace; white-space: nowrap; margin-left: auto; }

.action-buttons { display: flex; gap: 6px; margin-left: 12px; }
.btn-action { background: transparent; border: none; font-size: 1rem; cursor: pointer; padding: 4px; border-radius: 4px; transition: transform 0.2s; filter: grayscale(100%); }
.btn-action:hover { transform: scale(1.15); filter: grayscale(0%); }
.btn-action.edit:hover { background-color: #dbeafe; }
.btn-action.delete:hover { background-color: #fee2e2; }
</style>
