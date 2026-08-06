import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

// 核心引擎：自动扫描根目录下的所有文件夹，你建什么文件夹，前台就展示什么大模块！
function getDynamicSidebar() {
  const rootPath = path.resolve(__dirname, '../')
  
  // 1. 获取所有真实内容的文件夹（自动过滤掉隐藏配置和非文件夹）
  const folders = fs.readdirSync(rootPath).filter(file => {
    const fullPath = path.join(rootPath, file)
    const stat = fs.statSync(fullPath)
    return stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules'
  })

  // 2. 遍历这些文件夹，生成菜单
  return folders.map(folder => {
    const folderPath = path.join(rootPath, folder)
    const items = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.md') && file !== 'index.md')
      .map(file => {
        const name = file.replace(/\.md$/, '')
        const content = fs.readFileSync(path.join(folderPath, file), 'utf-8')
        const match = content.match(/^#\s+(.*)/m) 
        return { 
          text: match ? match[1].trim() : name, 
          link: `/${folder}/${name}` 
        }
      })
    // 返回模块名称和它里面的笔记列表
    return { text: folder, items, collapsed: false }
  })
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

    // 调用引擎，以后你的大模块全靠前台自由发挥
    sidebar: getDynamicSidebar(),

    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }],
    search: { provider: 'local' }
  }
})
