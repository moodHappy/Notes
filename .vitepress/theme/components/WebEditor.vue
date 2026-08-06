<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()
const token = ref('')
const inputFolder = ref('')
const inputFile = ref('')
const content = ref('')
const statusMsg = ref('')

// 自动抓取已有文件夹供下拉选择
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
  
  if (pathParam) {
     pathParam = pathParam.replace(/^\//, '')
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

const getFullPath = () => {
  let folder = inputFolder.value.trim().replace(/^\/+/, '')
  if (folder && !folder.endsWith('/')) folder += '/'
  let file = inputFile.value.trim().replace(/\.md$/, '')
  if (!file) file = '未命名笔记'
  return folder + file + '.md'
}

const loadExistingNote = async () => {
  if (!token.value) {
    statusMsg.value = '⚠️ 请先输入 Token 才能拉取'
    return
  }
  if (!inputFile.value.trim()) return

  statusMsg.value = '⏳ 正在拉取云端笔记...'
  const finalPath = getFullPath()
  
  try {
    const res = await fetch(`https://api.github.com/repos/moodHappy/Notes/contents/${finalPath}`, {
      headers: { 'Authorization': `token ${token.value}` }
    })
    if (res.ok) {
       const data = await res.json()
       content.value = base64ToUtf8(data.content)
       statusMsg.value = '✅ 笔记加载成功！'
    } else {
       statusMsg.value = '🆕 这是一个新笔记路径。'
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
      message: `更新笔记: ${finalPath}`,
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
      statusMsg.value = '✅ 发布成功！约1分钟后重载页面即可生效。'
    } else {
      const errorData = await putRes.json()
      statusMsg.value = `❌ 发布失败: ${errorData.message}`
    }
  } catch (err) {
    statusMsg.value = `❌ 网络出错: ${err.message}`
  }
}

// 终极修复方案：针对安卓与各类移动端浏览器的强力粘贴接管
const handlePaste = async (e) => {
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  // 绝招 1：废弃单纯的 text/plain，使用多级降级取值，专治部分安卓机型不给值的问题
  let pastedText = clipboardData.getData('text') || clipboardData.getData('text/plain') || '';
  pastedText = pastedText.trim();

  // 严谨匹配纯正的 HTTP 链接，中间不能带空格
  const urlRegex = /^https?:\/\/[^\s]+$/i;
  
  if (urlRegex.test(pastedText)) {
    // 绝招 2：立刻掐断系统原生粘贴，防止裸链接跑上屏幕
    e.preventDefault(); 
    
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const titlePlaceholder = "输入标题";
    const mdLink = `[${titlePlaceholder}](${pastedText})`;
    
    // 直接操作 Vue 数据，完成替换
    content.value = content.value.substring(0, start) + mdLink + content.value.substring(end);
    
    // 绝招 3：移动端专属的双重锁帧。必须等 DOM 刷新完，再加上额外的延时，才能在软键盘弹出的情况下强行抓住光标！
    await nextTick();
    setTimeout(() => {
      textarea.focus();
      // 精确框选“输入标题”这四个字，方便直接打字替换
      textarea.setSelectionRange(start + 1, start + 1 + titlePlaceholder.length);
    }, 80);
  }
}
</script>

<template>
  <div class="editor-container">
    <div class="api-config">
      <input type="password" v-model="token" placeholder="输入 GitHub API Token" @blur="saveToken" />
    </div>
    
    <div class="file-config-group">
      <div class="input-wrapper folder-wrapper">
        <span class="icon">📁</span>
        <input list="folder-options" v-model="inputFolder" placeholder="目录 (如 english/)" />
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
.status { font-size: 14px; color: var(--vp-c-text-2); text-align: center; margin-top: 5px; }

@media (max-width: 640px) {
  .file-config-group { flex-direction: column; align-items: stretch; }
  .divider { display: none; }
}
</style>
