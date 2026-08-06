<script setup>
import { ref, computed, onMounted } from 'vue'
import { useData, withBase } from 'vitepress'

const { theme } = useData()
const token = ref('')
const statusMsg = ref('')
const searchQuery = ref('')
const isManageMode = ref(false) // 默认为安全的阅读模式

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
})

// 核心优化：高亮检索过滤引擎
const filteredFolders = computed(() => {
  if (!searchQuery.value) return theme.value.sidebar

  const query = searchQuery.value.toLowerCase()
  return theme.value.sidebar.map(folder => {
    const filteredItems = folder.items.filter(item => 
      item.text.toLowerCase().includes(query) || folder.text.toLowerCase().includes(query)
    )
    return { ...folder, items: filteredItems }
  }).filter(folder => folder.items.length > 0)
})

const deleteNote = async (item) => {
  if (!token.value) {
    alert('⚠️ 缺少权限：请先去【写作台】输入并保存 GitHub Token。')
    return
  }
  // 双重保险：不仅需要管理模式，点击后还要防呆弹窗
  if (!confirm(`【危险操作】\n你确定要永久销毁《${item.text}》吗？\n此操作不可逆！`)) return

  statusMsg.value = `⏳ 正在发送摧毁指令: ${item.text}...`
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
      statusMsg.value = '✅ 笔记已销毁！系统正在云端重组，约1分钟后刷新页面生效。'
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
    
    <!-- 顶部控制台 -->
    <div class="control-panel">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="检索笔记名称..." />
      </div>
      <button 
        class="mode-toggle" 
        :class="{ 'is-manage': isManageMode }" 
        @click="isManageMode = !isManageMode"
      >
        {{ isManageMode ? '✅ 完成管理' : '⚙️ 整理' }}
      </button>
    </div>

    <div v-if="statusMsg" class="status-bar">{{ statusMsg }}</div>
    <div v-if="filteredFolders.length === 0" class="empty-state">没有找到相关笔记...</div>

    <!-- 动态折叠卡片列表 -->
    <div class="folder-list">
      <!-- 默认全部 open 展开，数据量大时可考虑去掉 open 属性默认折叠 -->
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
            
            <!-- 安全锁：只有在管理模式下才渲染删除按钮 -->
            <button 
              v-if="isManageMode" 
              @click="deleteNote(item)" 
              class="btn-delete" 
              title="删除此笔记"
            >
              删除
            </button>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.modern-directory {
  max-width: 800px;
  margin: 0 auto;
  padding-top: 10px;
}
/* 顶部控制台：搜索与模式切换 */
.control-panel {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 8px 16px;
  transition: border-color 0.2s;
}
.search-box:focus-within {
  border-color: var(--vp-c-brand);
}
.search-box input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 4px 8px;
  font-size: 1rem;
  color: var(--vp-c-text-1);
  outline: none;
}
.mode-toggle {
  padding: 10px 18px;
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  font-weight: bold;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}
.mode-toggle.is-manage {
  background-color: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}
.status-bar {
  margin-bottom: 20px; padding: 12px; background: #f0fdf4; color: #166534; border-radius: 8px; font-size: 0.95rem; font-weight: 500;
}
.empty-state {
  text-align: center; padding: 40px; color: var(--vp-c-text-3);
}

/* 折叠文件夹结构 */
.folder-group {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
}
.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  background: var(--vp-c-bg-mute);
  transition: background 0.2s;
}
.folder-header:hover {
  background: var(--vp-c-bg-soft);
}
.folder-header::-webkit-details-marker {
  display: none; /* 隐藏默认箭头 */
}
.folder-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.count-badge {
  background: var(--vp-c-divider);
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

/* 内部笔记行列表 */
.note-items {
  padding: 8px 20px 20px 20px;
}
.note-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.note-row:last-child {
  border-bottom: none;
}
.note-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  text-decoration: none !important;
  overflow: hidden;
}
.note-name {
  font-size: 1.05rem;
  color: var(--vp-c-brand);
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.note-main:hover .note-name {
  text-decoration: underline;
}
.note-meta {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  font-family: monospace;
}
.btn-delete {
  margin-left: 16px;
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-delete:hover {
  background-color: #f87171;
  color: white;
}
</style>
