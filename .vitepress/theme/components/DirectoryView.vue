<script setup>
import { ref, onMounted } from 'vue'
import { useData, withBase } from 'vitepress'
const { theme } = useData()

const token = ref('')
const statusMsg = ref('')

// 自动读取你在写作台保存的 Token，用于删除权限验证
onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
})

const deleteNote = async (itemLink) => {
  if (!token.value) {
    alert('⚠️ 请先去【写作台】输入并保存一下 GitHub Token，否则没有删除权限哦！')
    return
  }
  if (!confirm(`确定要彻底删除这篇笔记吗？\n${itemLink}`)) return

  statusMsg.value = `⏳ 正在发送摧毁指令...`
  const owner = 'moodHappy' 
  const repo = 'Notes' 
  
  // 转换路径格式，比如把 /english/test 变成 english/test.md
  const filePath = itemLink.replace(/^\//, '') + '.md'

  try {
    // 步骤 1: 必须先抓取文件的识别码 (sha)
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    
    if (!getRes.ok) {
      statusMsg.value = `❌ 删除失败：找不到文件，可能已经删掉了。`
      return
    }
    const data = await getRes.json()
    const sha = data.sha

    // 步骤 2: 发送核弹打击 (DELETE)
    const delRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `前台一键删除笔记: ${filePath}`,
        sha: sha
      })
    })

    if (delRes.ok) {
      statusMsg.value = '✅ 删除成功！GitHub 正在重组你的网站，约 1 分钟后刷新页面生效。'
    } else {
      const errorData = await delRes.json()
      statusMsg.value = `❌ 删除失败: ${errorData.message}`
    }
  } catch (err) {
    statusMsg.value = `❌ 网络请求出错: ${err.message}`
  }
}
</script>

<template>
  <div class="directory-container">
    <div v-if="statusMsg" class="global-status">{{ statusMsg }}</div>
    
    <!-- 动态遍历你创建的所有文件夹模块 -->
    <div v-for="folder in theme.sidebar" :key="folder.text" class="folder-card">
      <h2 class="folder-title">📂 {{ folder.text }}</h2>
      <ul class="file-list">
        <li v-for="item in folder.items" :key="item.link" class="file-item">
          <a :href="withBase(item.link)" class="file-link">📝 {{ item.text }}</a>
          <button @click="deleteNote(item.link)" class="del-btn" title="删除这篇笔记">🗑️</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.directory-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
.global-status { grid-column: 1 / -1; padding: 14px; background: #d1fae5; color: #065f46; border-radius: 8px; text-align: center; font-weight: bold; }
.folder-card { border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 24px; background-color: var(--vp-c-bg-soft); transition: transform 0.2s; }
.folder-card:hover { transform: translateY(-5px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: var(--vp-c-brand); }
.folder-title { margin-top: 0; margin-bottom: 20px; font-size: 1.3rem; border-bottom: none; }
.file-list { list-style-type: none; padding: 0; margin: 0; }
.file-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 1.05rem; border-bottom: 1px dashed var(--vp-c-divider); padding-bottom: 8px;}
.file-link { text-decoration: none; color: var(--vp-c-brand); font-weight: 500; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-link:hover { text-decoration: underline; }
.del-btn { background: none; border: none; cursor: pointer; padding: 4px; font-size: 1.2rem; filter: grayscale(100%); transition: all 0.2s; }
.del-btn:hover { filter: grayscale(0%); transform: scale(1.1); }
</style>
