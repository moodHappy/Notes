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

const localUsedFolders = ref([])
const hiddenFolders = ref([])
const showFolderDropdown = ref(false)

onMounted(() => {
  const savedToken = localStorage.getItem('gh_api_token')
  if (savedToken) token.value = savedToken
  
  const savedFolders = localStorage.getItem('vp_used_folders')
  if (savedFolders) localUsedFolders.value = JSON.parse(savedFolders)
  
  const savedHidden = localStorage.getItem('vp_hidden_folders')
  if (savedHidden) hiddenFolders.value = JSON.parse(savedHidden)
  
  const savedDefault = localStorage.getItem('vp_default_folder')
  
  const urlParams = new URLSearchParams(window.location.search)
  let pathParam = urlParams.get('path')
  
  if (pathParam) {
     pathParam = pathParam.replace(/^\//, '')
     const parts = pathParam.split('/')
     inputFile.value = parts.pop()
     inputFolder.value = parts.length > 0 ? parts.join('/') + '/' : ''
     loadExistingNote()
  } else {
     if (savedDefault) {
       inputFolder.value = savedDefault
     }
  }
})

const existingFolders = computed(() => {
  const folders = new Set(localUsedFolders.value)
  const traverse = (nodes) => {
    if (!nodes) return
    nodes.forEach(node => {
      if (node.items) {
        if (node.id) {
           const cleanName = node.id.replace(/^\/+/, '')
           if (cleanName) folders.add(cleanName)
        } else if (node.text) {
           folders.add(node.text + '/')
        }
        traverse(node.items)
      }
    })
  }
  traverse(theme.value.sidebar)
  
  return Array.from(folders)
    .filter(f => !hiddenFolders.value.includes(f))
    .sort()
})

const selectFolder = (folderName) => {
  inputFolder.value = folderName
  showFolderDropdown.value = false
}

const removeFolder = (folderName, event) => {
  event.stopPropagation() 
  
  localUsedFolders.value = localUsedFolders.value.filter(f => f !== folderName)
  localStorage.setItem('vp_used_folders', JSON.stringify(localUsedFolders.value))
  
  if (!hiddenFolders.value.includes(folderName)) {
    hiddenFolders.value.push(folderName)
    localStorage.setItem('vp_hidden_folders', JSON.stringify(hiddenFolders.value))
  }
  
  if (localStorage.getItem('vp_default_folder') === folderName) {
    localStorage.removeItem('vp_default_folder')
    if (inputFolder.value === folderName) inputFolder.value = ''
  }
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
      
      let folderStr = inputFolder.value.trim().replace(/^\/+/, '')
      if (folderStr && !folderStr.endsWith('/')) folderStr += '/'
      
      if (folderStr) {
        localStorage.setItem('vp_default_folder', folderStr)
        
        if (!localUsedFolders.value.includes(folderStr)) {
          localUsedFolders.value.push(folderStr)
          localStorage.setItem('vp_used_folders', JSON.stringify(localUsedFolders.value))
        }
        
        if (hiddenFolders.value.includes(folderStr)) {
          hiddenFolders.value = hiddenFolders.value.filter(f => f !== folderStr)
          localStorage.setItem('vp_hidden_folders', JSON.stringify(hiddenFolders.value))
        }
      }
      
    } else {
      const errorData = await putRes.json()
      statusMsg.value = `❌ 发布失败: ${errorData.message}`
    }
  } catch (err) {
    statusMsg.value = `❌ 网络出错: ${err.message}`
  }
}

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
    
    <div class="file-config-group">
      <div class="input-wrapper folder-wrapper" :class="{ 'dropdown-active': showFolderDropdown }">
        <span class="icon">📁</span>
        <input 
          v-model="inputFolder" 
          placeholder="输入或选择目录" 
          @focus="showFolderDropdown = true"
        />
        <button class="dropdown-toggle" @click.stop="showFolderDropdown = !showFolderDropdown">
          ▼
        </button>
        
        <div v-if="showFolderDropdown" class="dropdown-menu">
          <div 
            v-for="folder in existingFolders" 
            :key="folder" 
            class="dropdown-item" 
            @click.stop="selectFolder(folder)"
          >
            <span class="dropdown-item-text">{{ folder }}</span>
            <span class="dropdown-item-delete" @click.stop="removeFolder(folder, $event)" title="从列表中移除">✕</span>
          </div>
          <div v-if="existingFolders.length === 0" class="dropdown-item empty">暂无可用目录</div>
        </div>
      </div>
      
      <div v-if="showFolderDropdown" class="dropdown-overlay" @click.stop="showFolderDropdown = false"></div>
      
      <span class="divider">/</span>
      
      <div class="input-wrapper file-wrapper">
        <span class="icon">📄</span>
        <input v-model="inputFile" placeholder="文件名" @blur="loadExistingNote" />
      </div>
      
      <button class="btn-load" @click="loadExistingNote">🔄 加载</button>
    </div>

    <!-- 还原为静态布局，采用“三明治结构” -->
    <div class="editor-box">
      <!-- 顶部工具栏 -->
      <div class="toolbar top-toolbar">
        <button @click="insertLink" title="插入链接">🔗 链接</button>
        <div class="toolbar-divider"></div>
        <button @click="insertMarkdown('**', '**')" title="粗体"><b>B</b></button>
        <button @click="insertMarkdown('*', '*')" title="斜体"><i>I</i></button>
        <button @click="insertMarkdown('## ', '')" title="标题">#️⃣</button>
        <div class="toolbar-divider"></div>
        <button @click="insertMarkdown('> ', '')" title="引用">❞</button>
        <button @click="insertMarkdown('\n```\n', '\n```\n')" title="代码块">&lt;&gt;</button>
        <button @click="insertMarkdown('\n---\n\n', '')" title="分隔符">---</button>
      </div>
      
      <textarea 
        ref="textareaRef"
        v-model="content" 
        placeholder="# 在这里使用 Markdown 痛快地写笔记..."
      ></textarea>

      <!-- 底部工具栏（新增） -->
      <div class="toolbar bottom-toolbar">
        <button @click="insertLink" title="插入链接">🔗 链接</button>
        <div class="toolbar-divider"></div>
        <button @click="insertMarkdown('**', '**')" title="粗体"><b>B</b></button>
        <button @click="insertMarkdown('*', '*')" title="斜体"><i>I</i></button>
        <button @click="insertMarkdown('## ', '')" title="标题">#️⃣</button>
        <div class="toolbar-divider"></div>
        <button @click="insertMarkdown('> ', '')" title="引用">❞</button>
        <button @click="insertMarkdown('\n```\n', '\n```\n')" title="代码块">&lt;&gt;</button>
        <button @click="insertMarkdown('\n---\n\n', '')" title="分隔符">---</button>
      </div>
    </div>
    
    <div class="actions">
      <button @click="publishNote" class="btn-publish">🚀 保存 / 更新笔记</button>
      <div class="status">{{ statusMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.editor-container { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; position: relative; }
input { width: 100%; border: none; outline: none; background: transparent; font-size: 16px; color: var(--vp-c-text-1); }

.api-config { padding: 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); }

.file-config-group { display: flex; align-items: center; gap: 8px; position: relative; }
.input-wrapper { display: flex; align-items: center; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 10px; position: relative; }

.folder-wrapper { flex: 1.2; z-index: 20; }
.file-wrapper { flex: 2; z-index: 1; }
.icon { margin-right: 8px; filter: grayscale(100%); font-size: 1.1rem; }
.divider { font-size: 1.5rem; color: var(--vp-c-divider); font-weight: 300; }

.dropdown-toggle { background: transparent; border: none; font-size: 0.8rem; color: var(--vp-c-text-3); cursor: pointer; padding: 0 4px; display: flex; align-items: center; justify-content: center; }
.dropdown-menu { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); max-height: 220px; overflow-y: auto; padding: 6px 0; z-index: 30; }
.dropdown-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; font-size: 0.95rem; color: var(--vp-c-text-1); cursor: pointer; transition: background 0.2s; }
.dropdown-item:hover { background: var(--vp-c-bg-soft); color: var(--vp-c-brand); }
.dropdown-item-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dropdown-item-delete { color: #ef4444; font-size: 1.1rem; padding: 2px 6px; margin-left: 12px; border-radius: 4px; transition: background 0.2s; }
.dropdown-item-delete:hover { background: #fee2e2; color: #dc2626; }
.dropdown-item.empty { color: var(--vp-c-text-3); cursor: default; }
.dropdown-item.empty:hover { background: transparent; color: var(--vp-c-text-3); }

.dropdown-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; cursor: default; }

.btn-load { padding: 10px 16px; background-color: var(--vp-c-bg-mute); border: 1px solid var(--vp-c-divider); border-radius: 8px; cursor: pointer; white-space: nowrap; font-weight: bold; color: var(--vp-c-text-1); transition: background 0.2s; }
.btn-load:hover { background-color: var(--vp-c-divider); }

/* 恢复静态布局，去掉 sticky */
.editor-box { 
  border: 1px solid var(--vp-c-divider); 
  border-radius: 8px; 
  background: var(--vp-c-bg-soft); 
  display: flex; 
  flex-direction: column; 
  z-index: 1; 
  position: relative; 
  overflow: hidden;
}

.toolbar { 
  display: flex; 
  align-items: center; 
  gap: 4px; 
  padding: 8px; 
  background: var(--vp-c-bg-mute); 
  overflow-x: auto; 
  white-space: nowrap; 
}
.top-toolbar { border-bottom: 1px solid var(--vp-c-divider); }
.bottom-toolbar { border-top: 1px solid var(--vp-c-divider); }

.toolbar button { padding: 6px 12px; background: transparent; border: 1px solid transparent; border-radius: 6px; font-size: 15px; color: var(--vp-c-text-1); cursor: pointer; transition: all 0.2s; }
.toolbar button:hover { background: var(--vp-c-bg-soft); border-color: var(--vp-c-divider); }
.toolbar-divider { width: 1px; height: 20px; background-color: var(--vp-c-divider); margin: 0 4px; }

textarea { 
  width: 100%; 
  padding: 16px; 
  border: none; 
  outline: none; 
  font-size: 16px; 
  box-sizing: border-box; 
  height: 55vh; 
  resize: vertical; 
  font-family: monospace; 
  background: transparent; 
  color: var(--vp-c-text-1); 
}

.btn-publish { padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; font-size: 1.1rem; cursor: pointer; transition: background 0.2s; }
.btn-publish:hover { background-color: #059669; }
.status { font-size: 14px; color: var(--vp-c-text-2); text-align: center; margin-top: 5px; }

@media (max-width: 640px) {
  .file-config-group { flex-direction: column; align-items: stretch; }
  .divider { display: none; }
  .folder-wrapper { z-index: 20; }
}
</style>
