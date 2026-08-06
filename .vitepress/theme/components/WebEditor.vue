<script setup>
import { ref, onMounted, computed } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()
const token = ref('')
const inputFolder = ref('')
const inputFile = ref('')
const content = ref('')
const statusMsg = ref('')

// 自动抓取全局已存在的文件夹目录，供下拉框使用
const existingFolders = computed(() => {
  const folders = new Set()
  const traverse = (nodes) => {
    if (!nodes) return
    nodes.forEach(node => {
      if (node.items) {
        if (node.id) folders.add(node.id)
        traverse(node.items)
      }
    })
  }
  traverse(theme.value.sidebar)
  return Array.from(folders)
})

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
  
  const urlParams = new URLSearchParams(window.location.search)
  let pathParam = urlParams.get('path')
  
  // 如果是从编辑按钮跳过来的，智能拆解目录和文件名
  if (pathParam) {
     pathParam = pathParam.replace(/^\//, '') // 去除开头的斜杠
     const parts = pathParam.split('/')
     inputFile.value = parts.pop()
     inputFolder.value = parts.length > 0 ? parts.join('/') + '/' : ''
     loadExistingNote()
  }
})

const saveToken = () => {
  localStorage.setItem('gh_api_token', token.value)
  statusMsg.value = '🔑 Token 已保存'
}

const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)))
const base64ToUtf8 = (str) => decodeURIComponent(escape(atob(str.replace(/\s/g, ''))))

// 组合路径处理器
const getFullPath = () => {
  let folder = inputFolder.value.trim().replace(/^\/+/, '') // 去除前导斜杠
  if (folder && !folder.endsWith('/')) folder += '/'
  let file = inputFile.value.trim().replace(/\.md$/, '')
  if (!file) file = '未命名笔记'
  return folder + file + '.md'
}

const loadExistingNote = async () => {
  if (!token.value) {
    statusMsg.value = '⚠️ 请先输入 Token 才能拉取原笔记内容'
    return
  }
  if (!inputFile.value.trim()) return

  statusMsg.value = '⏳ 正在从云端拉取笔记内容...'
  const finalPath = getFullPath()
  
  try {
    const res = await fetch(`https://api.github.com/repos/moodHappy/Notes/contents/${finalPath}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    if (res.ok) {
       const data = await res.json()
       content.value = base64ToUtf8(data.content)
       statusMsg.value = '✅ 笔记加载成功，可直接修改正文！'
    } else {
       statusMsg.value = '🆕 这是一个全新的笔记。'
    }
  } catch (e) {
     statusMsg.value = `❌ 读取失败: ${e.message}`
  }
}

const publishNote = async () => {
  if (!token.value || !content.value) {
    statusMsg.value = '❌ 错误：Token 或正文不能为空'
    return
  }

  statusMsg.value = '⏳ 正在提交至 GitHub...'
  const owner = 'moodHappy' 
  const repo = 'Notes'      
  const finalPath = getFullPath()
  
  try {
    let sha = null
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${finalPath}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    if (getRes.ok) {
      const data = await getRes.json()
      sha = data.sha
    }

    const body = {
      message: `前台更新笔记: ${finalPath}`,
      content: utf8ToBase64(content.value),
    }
    if (sha) body.sha = sha 

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${finalPath}`, {
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

// 核心黑科技：智能粘贴拦截
const handlePaste = (e) => {
  const pastedText = (e.clipboardData || window.clipboardData).getData('text').trim();
  // 正则判断：如果粘贴的是一个纯正的 http/https 链接
  const urlRegex = /^https?:\/\/[^\s]+$/;
  
  if (urlRegex.test(pastedText)) {
    e.preventDefault(); // 阻止默认粘贴行为
    const mdLink = `[输入标题](${pastedText})`;
    
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // 插入 Markdown 格式的链接
    content.value = content.value.substring(0, start) + mdLink + content.value.substring(end);
    
    // 延迟 10ms 等待 Vue 渲染完成，然后自动框选 "输入标题" 四个字
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 5);
    }, 10);
  }
}
</script>

<template>
  <div class="editor-container">
    <div class="api-config">
      <input type="password" v-model="token" placeholder="输入 GitHub API Token" @blur="saveToken" />
    </div>
    
    <!-- 全新拆分设计的路径选择器 -->
    <div class="file-config-group">
      <div class="input-wrapper folder-wrapper">
        <span class="icon">📁</span>
        <input list="folder-options" v-model="inputFolder" placeholder="目录 (如 english/)" />
        <!-- 自动加载所有已有目录 -->
        <datalist id="folder-options">
          <option v-for="folder in existingFolders" :key="folder" :value="folder"></option>
        </datalist>
      </div>
      
      <span class="divider">/</span>
      
      <div class="input-wrapper file-wrapper">
        <span class="icon">📄</span>
        <input v-model="inputFile" placeholder="文件名" @blur="loadExistingNote" />
      </div>
      
      <button class="btn-load" @click="loadExistingNote">🔄 加载</button>
    </div>

    <!-- 绑定智能粘贴事件 -->
    <textarea 
      v-model="content" 
      placeholder="# 在这里使用 Markdown 痛快地写笔记..."
      @paste="handlePaste"
    ></textarea>
    
    <div class="actions">
      <button @click="publishNote" class="btn-publish">🚀 保存 / 更新笔记</button>
      <div class="status">{{ statusMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
input { width: 100%; border: none; outline: none; background: transparent; font-size: 16px; }
textarea { width: 100%; padding: 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; font-size: 16px; box-sizing: border-box; height: 55vh; resize: vertical; font-family: monospace; background: var(--vp-c-bg-soft); }
.api-config { padding: 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); }

.file-config-group { display: flex; align-items: center; gap: 8px; }
.input-wrapper { display: flex; align-items: center; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 10px; }
.folder-wrapper { flex: 1.2; }
.file-wrapper { flex: 2; }
.icon { margin-right: 8px; filter: grayscale(100%); font-size: 1.1rem; }
.divider { font-size: 1.5rem; color: var(--vp-c-divider); font-weight: 300; }

.btn-load { padding: 10px 16px; background-color: var(--vp-c-bg-mute); border: 1px solid var(--vp-c-divider); border-radius: 8px; cursor: pointer; white-space: nowrap; font-weight: bold; color: var(--vp-c-text-1); transition: background 0.2s; }
.btn-load:hover { background-color: var(--vp-c-divider); }
.btn-publish { padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; font-size: 1.1rem; cursor: pointer; transition: background 0.2s; }
.btn-publish:hover { background-color: #059669; }
.status { font-size: 14px; color: var(--vp-c-text-2); text-align: center; }

/* 移动端竖屏适配 */
@media (max-width: 640px) {
  .file-config-group { flex-direction: column; align-items: stretch; }
  .divider { display: none; }
}
</style>
