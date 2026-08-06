<script setup>
import { ref, onMounted } from 'vue'

const token = ref('')
const filePath = ref('english/new-note.md')
const content = ref('')
const statusMsg = ref('')

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
  
  // 核心优化：侦测 URL 参数。如果是从目录页点击“编辑”跳转过来的，自动提取路径并拉取内容
  const urlParams = new URLSearchParams(window.location.search)
  const pathParam = urlParams.get('path')
  if (pathParam) {
     filePath.value = pathParam.replace(/^\//, '') + '.md'
     loadExistingNote()
  }
})

const saveToken = () => {
  localStorage.setItem('gh_api_token', token.value)
  statusMsg.value = '🔑 Token 已保存'
}

// 解决中文乱码的 Base64 编解码器
const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)))
const base64ToUtf8 = (str) => decodeURIComponent(escape(atob(str.replace(/\s/g, ''))))

// 核心优化：拉取已有笔记的 API
const loadExistingNote = async () => {
  if (!token.value) {
    statusMsg.value = '⚠️ 请先输入 Token 才能拉取原笔记内容'
    return
  }
  statusMsg.value = '⏳ 正在从云端拉取笔记内容...'
  
  try {
    const res = await fetch(`https://api.github.com/repos/moodHappy/Notes/contents/${filePath.value}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    if (res.ok) {
       const data = await res.json()
       content.value = base64ToUtf8(data.content)
       statusMsg.value = '✅ 笔记加载成功，可直接修改正文！'
    } else {
       statusMsg.value = '🆕 这是一个全新的笔记路径。'
    }
  } catch (e) {
     statusMsg.value = `❌ 读取失败: ${e.message}`
  }
}

const publishNote = async () => {
  if (!token.value || !content.value) {
    statusMsg.value = '❌ 错误：Token 或内容不能为空'
    return
  }

  statusMsg.value = '⏳ 正在提交至 GitHub...'
  const owner = 'moodHappy' 
  const repo = 'Notes'      
  
  try {
    let sha = null
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath.value}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    if (getRes.ok) {
      const data = await getRes.json()
      sha = data.sha
    }

    const body = {
      message: `前台更新笔记: ${filePath.value}`,
      content: utf8ToBase64(content.value),
    }
    if (sha) body.sha = sha 

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath.value}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (putRes.ok) {
      statusMsg.value = '✅ 发布成功！约 1 分钟后网页自动更新。'
    } else {
      const errorData = await putRes.json()
      statusMsg.value = `❌ 发布失败: ${errorData.message}`
    }
  } catch (err) {
    statusMsg.value = `❌ 网络请求出错: ${err.message}`
  }
}
</script>

<template>
  <div class="editor-container">
    <div class="api-config">
      <input type="password" v-model="token" placeholder="输入 GitHub API Token" @blur="saveToken" />
    </div>
    
    <div class="file-config-group">
      <input type="text" v-model="filePath" placeholder="保存路径，如：english/BBC/note-1.md" @blur="loadExistingNote" />
      <button class="btn-load" @click="loadExistingNote">🔄 加载</button>
    </div>

    <textarea v-model="content" placeholder="# 在这里使用 Markdown 痛快地写笔记..."></textarea>
    
    <div class="actions">
      <button @click="publishNote" class="btn-publish">🚀 一键保存 / 更新笔记</button>
      <div class="status">{{ statusMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
input, textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.file-config-group { display: flex; gap: 10px; }
.btn-load { padding: 0 20px; background-color: #f3f4f6; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; white-space: nowrap; font-weight: bold; color: #4b5563; }
.btn-load:hover { background-color: #e5e7eb; }
textarea { height: 55vh; resize: vertical; font-family: monospace; }
.btn-publish { padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; font-size: 1.1rem; cursor: pointer; }
.btn-publish:hover { background-color: #059669; }
.status { font-size: 14px; color: #666; text-align: center; }
</style>
