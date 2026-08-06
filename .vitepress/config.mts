import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

// 核心黑科技：自动读取文件夹，提取你笔记里的第一个 # 标题作为显示名字
function getAutoSidebar(dir, title) {
  const fullPath = path.resolve(__dirname, '../', dir)
  if (!fs.existsSync(fullPath)) return { text: title, items: [] }
  
  const items = fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => {
      const name = file.replace(/\.md$/, '')
      const content = fs.readFileSync(path.join(fullPath, file), 'utf-8')
      const match = content.match(/^#\s+(.*)/m) 
      return { 
        text: match ? match[1].trim() : name, 
        link: `/${dir}/${name}` 
      }
    })
  return { text: title, items, collapsed: false }
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

    // 将菜单改为全局自动生成！
    sidebar: [
      getAutoSidebar('english', '🇬🇧 英语精读与分析'),
      getAutoSidebar('scripts', '💻 前端与自动化脚本'),
      getAutoSidebar('literature', '📖 经典文学摘录')
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }]
  }
})
