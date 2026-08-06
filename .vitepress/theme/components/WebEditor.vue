<script setup>
import { ref, onMounted } from 'vue'

const token = ref('')
const filePath = ref('english/new-note.md')
const content = ref('')
const statusMsg = ref('')

// 本地持久化记忆 Token，避免每次输入
onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
})

const saveToken = () => {
  localStorage.setItem('gh_api_token', token.value)
  statusMsg.value = 'Token 已保存在本地浏览器'
}

// 支持中文的 Base64 编码
const utf8ToBase64 = (str) => {
  return btoa(unescape(encodeURIComponent(str)))
}

const publishNote = async () => {
  if (!token.value || !content.value) {
    statusMsg.value = '错误：Token 或内容不能为空'
    return
  }

  statusMsg.value = '正在提交至 GitHub...'
  const owner = 'moodHappy' // 你的 GitHub 用户名
  const repo = 'Notes'      // 你的仓库名
  
  try {
    // 1. 先尝试获取文件，判断是新建还是更新（更新需要 sha）
    let sha = null
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath.value}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    if (getRes.ok) {
      const data = await getRes.json()
      sha = data.sha
    }

    // 2. 推送文件
    const body = {
      message: `API 前台发布: ${filePath.value}`,
      content: utf8ToBase64(content.value),
    }
    if (sha) body.sha = sha // 如果是更新已有文件，附带 sha 校验码

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath.value}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (putRes.ok) {
      statusMsg.value = '✅ 笔记发布成功！约 1 分钟后网页自动更新。'
      content.value = '' // 清空输入框
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
      <input type="password" v-model="token" placeholder="输入 GitHub Personal Access Token" @blur="saveToken" />
    </div>
    
    <div class="file-config">
      <input type="text" v-model="filePath" placeholder="文件路径，如：english/reading-1.md" />
    </div>

    <textarea v-model="content" placeholder="# 在这里使用 Markdown 痛快地写笔记..."></textarea>
    
    <div class="actions">
      <button @click="publishNote">🚀 一键发布 / 更新笔记</button>
      <span class="status">{{ statusMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}
input, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: inherit;
  font-size: 16px;
  box-sizing: border-box;
}
textarea {
  height: 400px;
  resize: vertical;
}
button {
  padding: 12px 24px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
button:hover { background-color: #059669; }
.status { margin-left: 15px; font-size: 14px; color: #666; }
</style>
