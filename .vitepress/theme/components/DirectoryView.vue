<script setup>
import { ref, computed, onMounted } from 'vue'
import { useData, withBase } from 'vitepress'
import FolderNode from './FolderNode.vue' // 引入我们刚才写的灵魂递归组件

const { theme } = useData()
const token = ref('')
const statusMsg = ref('')
const searchQuery = ref('')
const isManageMode = ref(false)

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
})

// 核心优化 2：无限层级递归搜索算法。只要子文件夹里有匹配的笔记，整条树状链路都会为你保留展开！
function filterTree(nodes, query) {
  return nodes.map(node => {
    if (node.items) {
      const filteredChildren = filterTree(node.items, query);
      // 如果文件夹名字匹配，或者它下面有任何子节点匹配，就保留这个文件夹
      if (node.text.toLowerCase().includes(query) || filteredChildren.length > 0) {
        return { ...node, items: filteredChildren };
      }
      return null;
    } else {
      // 如果是文件，直接匹配名字
      if (node.text.toLowerCase().includes(query)) return node;
      return null;
    }
  }).filter(Boolean);
}

const filteredTree = computed(() => {
  if (!searchQuery.value) return theme.value.sidebar || []
  return filterTree(theme.value.sidebar || [], searchQuery.value.toLowerCase())
})

const editNote = (itemLink) => {
   window.location.href = withBase(`/write?path=${itemLink}`)
}

const deleteNote = async (item) => {
  if (!token.value) {
    alert('⚠️ 缺少权限：请先保存 GitHub Token。')
    return
  }
  if (!confirm(`【危险操作】\n确定要永久销毁《${item.text}》吗？`)) return

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
      statusMsg.value = '✅ 笔记已彻底销毁！等待 GitHub Actions 重新打包后生效。'
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
    
    <!-- 顶部控制面板 -->
    <div class="control-panel">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="检索无限层级下的笔记..." />
      </div>
      <button class="mode-toggle" :class="{ 'is-manage': isManageMode }" @click="isManageMode = !isManageMode">
        {{ isManageMode ? '✅ 结束整理' : '⚙️ 整理' }}
      </button>
    </div>

    <div v-if="statusMsg" class="status-bar">{{ statusMsg }}</div>
    <div v-if="filteredTree.length === 0" class="empty-state">没有找到匹配的笔记...</div>

    <!-- 递归树渲染区：摒弃所有卡片，呈现最纯粹的折叠面板 -->
    <div class="tree-container">
      <FolderNode 
        v-for="node in filteredTree" 
        :key="node.text || node.link" 
        :node="node" 
        :isManageMode="isManageMode"
        @edit="editNote"
        @delete="deleteNote"
      />
    </div>
    
  </div>
</template>

<style scoped>
.modern-directory { max-width: 800px; margin: 0 auto; padding-top: 10px; }
.control-panel { display: flex; gap: 12px; margin-bottom: 24px; align-items: center; }
.search-box { flex: 1; display: flex; align-items: center; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 8px 16px; transition: border-color 0.2s; }
.search-box:focus-within { border-color: var(--vp-c-brand); }
.search-box input { width: 100%; border: none; background: transparent; padding: 4px 8px; font-size: 1rem; color: var(--vp-c-text-1); outline: none; }
.mode-toggle { padding: 10px 18px; border-radius: 12px; background-color: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); font-weight: bold; color: var(--vp-c-text-2); cursor: pointer; transition: all 0.2s;}
.mode-toggle.is-manage { background-color: #fef2f2; border-color: #fca5a5; color: #dc2626; }
.status-bar { margin-bottom: 20px; padding: 12px; background: #f0fdf4; color: #166534; border-radius: 8px; font-size: 0.95rem; font-weight: 500; }
.empty-state { text-align: center; padding: 40px; color: var(--vp-c-text-3); }
.tree-container { margin-top: 10px; }
</style>
