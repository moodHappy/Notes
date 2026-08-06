import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function getDynamicSidebar() {
  const rootPath = path.resolve(__dirname, '../')
  
  const folders = fs.readdirSync(rootPath).filter(file => {
    const fullPath = path.join(rootPath, file)
    return fs.statSync(fullPath).isDirectory() && !file.startsWith('.') && file !== 'node_modules'
  })

  return folders.map(folder => {
    const folderPath = path.join(rootPath, folder)
    const items = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.md') && file !== 'index.md')
      .map(file => {
        const name = file.replace(/\.md$/, '')
        const filePath = path.join(folderPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const match = content.match(/^#\s+(.*)/m) 
        
        // 核心优化：直接调取 Git 底层记录，获取最真实的修改日期
        let date = '新笔记'
        let timestamp = Date.now()
        try {
          // 在 GitHub Actions 环境中抓取最后提交时间
          const gitDate = execSync(`git log -1 --format="%ad" --date=short -- "${filePath}"`).toString().trim()
          const gitTime = execSync(`git log -1 --format="%ct" -- "${filePath}"`).toString().trim()
          if (gitDate) {
             date = gitDate
             timestamp = parseInt(gitTime) * 1000
          }
        } catch(e) {
           // 如果是还没 commit 的本地文件，降级使用系统时间
           date = new Date().toISOString().split('T')[0]
        }

        return { 
          text: match ? match[1].trim() : name, 
          link: `/${folder}/${name}`,
          date: date,
          timestamp: timestamp
        }
      })
      // 核心优化：把最新写的、最近改的笔记永远排在最前面！
      .sort((a, b) => b.timestamp - a.timestamp)

    // 默认折叠状态设为 false，但在我们的新版前台组件里会用 details 控制
    return { text: folder, items, collapsed: false }
  }).filter(folder => folder.items.length > 0) // 自动隐藏空文件夹
}

export default defineConfig({
  title: "My Digital Garden",
  description: "记录技术、英语与生活",
  base: '/Notes/', 
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '📚 笔记目录', link: '/directory' },
      { text: '✍️ 写作台', link: '/write' }
    ],
    sidebar: getDynamicSidebar(),
    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }],
    search: { provider: 'local' }
  }
})
