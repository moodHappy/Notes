<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()
const token = ref('')
const inputFolder = ref('')
const inputFile = ref('')
const content = ref('')
const statusMsg = ref('')
const textareaRef = ref(null)

// 专门用于存储本地历史目录的变量
const localUsedFolders = ref([])

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
  
  // 核心增强：读取本地记住的历史目录
  const savedFolders = localStorage.getItem('vp_used_folders')
  if (savedFolders) {
    localUsedFolders.value = JSON.parse(savedFolders)
  }
  
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

// 融合云端已有目录和本地历史目录
const existingFolders = computed(() => {
  const folders = new Set(localUsedFolders.value)
  
  // 遍历当前站点已经存在的目录
  const traverse = (nodes) => {
    if (!nodes) return
    nodes.forEach(node => {
      if (node.items) {
        if (node.id) {
           const cleanName = node.id.replace(/^\/+/, '') // 去除开头的斜杠
           if (cleanName) folders.add(cleanName)
        } else if (node.text) {
           folders.add(node.text + '/')
        }
        traverse(node.items)
      }
    })
  }
  traverse(theme.value.sidebar)
  return Array.from(folders).sort()
})

// 点击标签，一键填入目录
const selectFolder = (folderName) => {
  inputFolder.value = folderName
}

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
       statusMsg.value = '🆕 这是一个新笔记。'
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
      statusMsg.value = '✅ 发布成功！约1分钟后刷新页面生效。'
      
      // 核心增强：发布成功后，自动将该目录加入本地记忆库
      let folderStr = inputFolder.value.trim().replace(/^\/+/, '')
      if (folderStr && !folderStr.endsWith('/')) folderStr += '/'
      if (folderStr && !localUsedFolders.value.includes(folderStr)) {
        localUsedFolders.value.push(folderStr)
        localStorage.setItem('vp_used_folders', JSON.stringify(localUsedFolders.value))
      }
      
    } else {
      const errorData = await putRes.json()
      statusMsg.value = `❌ 发布失败: ${errorData.message}`
    }
  } catch (err) {
    statusMsg.value = `❌ 网络出错: ${err.message}`
  }
}

// ====== Markdown 工具栏引擎 ======
const insertMarkdown = (prefix, suffix = '') => {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)
  
  const replacement = prefix + selectedText + suffix
  content.value = content.value.substring(0, start) + replacement + content.value.substring(end)
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
  })
}

const insertLink = () => {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const url = window.prompt('请粘贴链接地址 (URL)：', '')
  if (!url) return 
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end) || '输入标题'
  
  const replacement = `[${selectedText}](${url})`
  content.value = content.value.substring(0, start) + replacement + content.value.substring(end)
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + 1, start + 1 + selectedText.length)
  })
}
</script>

<template>
  <div class="editor-container">
    <div class="api-config">
      <input type="password" v-model="token" placeholder="输入 GitHub API Token" @blur="saveToken" />
    </div>
    
    <!-- 路径配置区 -->
    <div class="file-config-group">
      <div class="input-wrapper folder-wrapper">
        <span class="icon">📁</span>
        <input v-model="inputFolder" placeholder="输入或下方选目录" />
      </div>
      
      <span class="divider">/</span>
      
      <div class="input-wrapper file-wrapper">
        <span class="icon">📄</span>
        <input v-model="inputFile" placeholder="文件名" @blur="loadExistingNote" />
      </div>
      
      <button class="btn-load" @click="loadExistingNote">🔄 加载</button>
    </div>

    <!-- 快捷目录选择区 (横向滑动) -->
    <div class="quick-select-zone" v-if="existingFolders.length > 0">
      <span class="quick-label">常用：</span>
      <div class="tags-scroll">
        <span 
          v-for="folder in existingFolders" 
          :key="folder" 
          class="folder-tag" 
          @click="selectFolder(folder)"
        >
          {{ folder }}
        </span>
      </div>
    </div>

    <div class="editor-box">
      <!-- 快捷工具栏 -->
      <div class="toolbar">
        <button @click="insertLink" title="插入链接">🔗 链接</button>
        <div class="toolbar-divider"></div>
        <button @click="insertMarkdown('**', '**')" title="粗体"><b>B</b></button>
        <button @click="insertMarkdown('*', '*')" title="斜体"><i>I</i></button>
        <button @click="insertMarkdown('## ', '')" title="标题">#️⃣</button>
        <div class="toolbar-divider"></div>
        <button @click="insertMarkdown('> ', '')" title="引用">❞</button>
        <button @click="insertMarkdown('\n```\n', '\n```\n')" title="代码块">&lt;&gt;</button>
      </div>
      
      <textarea 
        ref="textareaRef"
        v-model="content" 
        placeholder="# 在这里使用 Markdown 痛快地写笔记..."
      ></textarea>
    </div>
    
    <div class="actions">
      <button @click="publishNote" class="btn-publish">🚀 保存 / 更新笔记</button>
      <div class="status">{{ statusMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
input { width: 100%; border: none; outline: none; background: transparent; font-size: 16px; }

.api-config { padding: 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); }

.file-config-group { display: flex; align-items: center; gap: 8px; }
.input-wrapper { display: flex; align-items: center; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 10px; }
.folder-wrapper { flex: 1.2; }
.file-wrapper { flex: 2; }
.icon { margin-right: 8px; filter: grayscale(100%); font-size: 1.1rem; }
.divider { font-size: 1.5rem; color: var(--vp-c-divider); font-weight: 300; }

.btn-load { padding: 10px 16px; background-color: var(--vp-c-bg-mute); border: 1px solid var(--vp-c-divider); border-radius: 8px; cursor: pointer; white-space: nowrap; font-weight: bold; color: var(--vp-c-text-1); transition: background 0.2s; }
.btn-load:hover { background-color: var(--vp-c-divider); }

/* 快捷标签区样式 */
.quick-select-zone { display: flex; align-items: center; gap: 8px; padding: 0 4px; overflow: hidden; }
.quick-label { font-size: 0.85rem; color: var(--vp-c-text-2); white-space: nowrap; font-weight: bold; }
.tags-scroll { display: flex; gap: 8px; overflow-x: auto; white-space: nowrap; padding-bottom: 4px; scrollbar-width: none; }
.tags-scroll::-webkit-scrollbar { display: none; }
.folder-tag { background: var(--vp-c-bg-mute); border: 1px solid var(--vp-c-divider); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; color: var(--vp-c-text-1); cursor: pointer; transition: all 0.2s; }
.folder-tag:hover { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-dark); border-color: var(--vp-c-brand); }

.editor-box { border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; background: var(--vp-c-bg-soft); display: flex; flex-direction: column; }
.toolbar { display: flex; align-items: center; gap: 4px; padding: 8px; background: var(--vp-c-bg-mute); border-bottom: 1px solid var(--vp-c-divider); overflow-x: auto; white-space: nowrap; }
.toolbar button { padding: 6px 12px; background: transparent; border: 1px solid transparent; border-radius: 6px; font-size: 15px; color: var(--vp-c-text-1); cursor: pointer; transition: all 0.2s; }
.toolbar button:hover { background: var(--vp-c-bg-soft); border-color: var(--vp-c-divider); }
.toolbar-divider { width: 1px; height: 20px; background-color: var(--vp-c-divider); margin: 0 4px; }
textarea { width: 100%; padding: 16px; border: none; outline: none; font-size: 16px; box-sizing: border-box; height: 55vh; resize: vertical; font-family: monospace; background: transparent; }

.btn-publish { padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; font-size: 1.1rem; cursor: pointer; transition: background 0.2s; }
.btn-publish:hover { background-color: #059669; }
.status { font-size: 14px; color: var(--vp-c-text-2); text-align: center; margin-top: 5px; }

@media (max-width: 640px) {
  .file-config-group { flex-direction: column; align-items: stretch; }
  .divider { display: none; }
}
</style>
