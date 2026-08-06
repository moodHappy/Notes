<script setup>
import { ref, computed, onMounted } from 'vue'
import { useData, withBase } from 'vitepress'

const { theme } = useData()
const token = ref('')
const statusMsg = ref('')
const searchQuery = ref('')
const isManageMode = ref(false)

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
})

// 核心优化：递归拍平无限嵌套的文件夹树，转为一维卡片列表展示
const getFlatFolders = (tree, prefix = '') => {
   let result = []
   tree.forEach(node => {
      if (node.items) { // 说明是文件夹
         const folderName = prefix ? `${prefix}/${node.text}` : node.text
         const filesOnly = node.items.filter(n => !n.items)
         if (filesOnly.length > 0) {
             result.push({ text: folderName, items: filesOnly })
         }
         // 继续往深处挖
         result = result.concat(getFlatFolders(node.items, folderName))
      }
   })
   return result
}

const filteredFolders = computed(() => {
  const flatFolders = getFlatFolders(theme.value.sidebar || [])
  if (!searchQuery.value) return flatFolders

  const query = searchQuery.value.toLowerCase()
  return flatFolders.map(folder => {
    const filteredItems = folder.items.filter(item => 
      item.text.toLowerCase().includes(query) || folder.text.toLowerCase().includes(query)
    )
    return { ...folder, items: filteredItems }
  }).filter(folder => folder.items.length > 0)
})

// 核心优化：跳转到编辑页
const editNote = (itemLink) => {
   window.location.href = withBase(`/write?path=${itemLink}`)
}

const deleteNote = async (item) => {
  if (!token.value) {
    alert('⚠️ 缺少权限：请先保存 GitHub Token。')
    return
  }
  if (!confirm(`【危险操作】\n你确定要永久销毁《${item.text}》吗？`)) return

  statusMsg.value = `⏳ 正在销毁: ${item.text}...`
  const owner = 'moodHappy' 
  const repo = 'Notes' 
  const filePath = item.link.replace(/^\//, '') + '.md'

  try {
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    
    if (!getRes.ok) throw new Error('找不到该文件，可能已被删除')
    const { sha } = await getRes.json()

    const delRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: `🗑️ 移除笔记: ${item.text}`, sha })
    })

    if (delRes.ok) {
      statusMsg.value = '✅ 笔记已销毁！约1分钟后刷新页面生效。'
    } else {
      const err = await delRes.json()
      throw new Error(err.message)
    }
  } catch (err) {
    statusMsg.value = `❌ 删除失败: ${err.message}`
  }
}
</script>

<template>
  <div class="modern-directory">
    <div class="control-panel">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="检索任何笔记..." />
      </div>
      <button class="mode-toggle" :class="{ 'is-manage': isManageMode }" @click="isManageMode = !isManageMode">
        {{ isManageMode ? '✅ 完成整理' : '⚙️ 整理' }}
      </button>
    </div>

    <div v-if="statusMsg" class="status-bar">{{ statusMsg }}</div>
    <div v-if="filteredFolders.length === 0" class="empty-state">没有找到相关笔记...</div>

    <div class="folder-list">
      <!-- 拍平后的文件夹名称，比如 english/BBC 都会显示为独立的卡片 -->
      <details v-for="folder in filteredFolders" :key="folder.text" class="folder-group" open>
        <summary class="folder-header">
          <div class="folder-title">
            <span class="emoji">📁</span> {{ folder.text }}
          </div>
          <span class="count-badge">{{ folder.items.length }} 篇</span>
        </summary>
        
        <div class="note-items">
          <div v-for="item in folder.items" :key="item.link" class="note-row">
            <a :href="withBase(item.link)" class="note-main">
              <span class="note-name">{{ item.text }}</span>
              <span class="note-meta">{{ item.date }}</span>
            </a>
            
            <!-- 整理模式下：同时显示【编辑】和【删除】 -->
            <div v-if="isManageMode" class="action-buttons">
              <button @click="editNote(item.link)" class="btn-edit" title="修改笔记">✏️</button>
              <button @click="deleteNote(item)" class="btn-delete" title="删除笔记">🗑️</button>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.modern-directory { max-width: 800px; margin: 0 auto; padding-top: 10px; }
.control-panel { display: flex; gap: 12px; margin-bottom: 24px; align-items: center; }
.search-box { flex: 1; display: flex; align-items: center; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 8px 16px; }
.search-box:focus-within { border-color: var(--vp-c-brand); }
.search-box input { width: 100%; border: none; background: transparent; padding: 4px 8px; font-size: 1rem; color: var(--vp-c-text-1); outline: none; }
.mode-toggle { padding: 10px 18px; border-radius: 12px; background-color: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); font-weight: bold; color: var(--vp-c-text-2); cursor: pointer; }
.mode-toggle.is-manage { background-color: #fef2f2; border-color: #fca5a5; color: #dc2626; }
.status-bar { margin-bottom: 20px; padding: 12px; background: #f0fdf4; color: #166534; border-radius: 8px; font-size: 0.95rem; font-weight: 500; }
.empty-state { text-align: center; padding: 40px; color: var(--vp-c-text-3); }

.folder-group { background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
.folder-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; user-select: none; background: var(--vp-c-bg-mute); }
.folder-header:hover { background: var(--vp-c-bg-soft); }
.folder-header::-webkit-details-marker { display: none; }
.folder-title { font-size: 1.15rem; font-weight: 600; color: var(--vp-c-text-1); }
.count-badge { background: var(--vp-c-divider); padding: 2px 10px; border-radius: 20px; font-size: 0.85rem; color: var(--vp-c-text-2); }

.note-items { padding: 8px 20px 20px 20px; }
.note-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed var(--vp-c-divider); }
.note-row:last-child { border-bottom: none; }
.note-main { flex: 1; display: flex; flex-direction: column; text-decoration: none !important; overflow: hidden; }
.note-name { font-size: 1.05rem; color: var(--vp-c-brand); font-weight: 500; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.note-main:hover .note-name { text-decoration: underline; }
.note-meta { font-size: 0.85rem; color: var(--vp-c-text-3); font-family: monospace; }

.action-buttons { display: flex; gap: 8px; margin-left: 12px; }
.btn-edit, .btn-delete { border: none; padding: 6px 10px; border-radius: 6px; font-size: 1rem; cursor: pointer; transition: all 0.2s; filter: grayscale(100%); background: transparent; }
.btn-edit:hover { filter: grayscale(0%); transform: scale(1.1); background-color: #dbeafe; }
.btn-delete:hover { filter: grayscale(0%); transform: scale(1.1); background-color: #fee2e2; }
</style>
