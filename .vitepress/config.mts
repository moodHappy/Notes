import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// 核心优化：无限层级递归扫描引擎
function getDynamicSidebar(dirPath, basePath = '') {
  const items = [];
  if (!fs.existsSync(dirPath)) return items;

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file.startsWith('.') || file === 'node_modules' || file === 'index.md') continue;
    
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 遇到文件夹，进入递归无限向下挖
      const subItems = getDynamicSidebar(fullPath, `${basePath}${file}/`);
      if (subItems.length > 0) {
        items.push({ text: file, items: subItems, collapsed: false });
      }
    } else if (file.endsWith('.md')) {
      // 遇到文件，提取信息
      const name = file.replace(/\.md$/, '');
      const content = fs.readFileSync(fullPath, 'utf-8');
      const match = content.match(/^#\s+(.*)/m);
      
      let date = '新笔记';
      let timestamp = Date.now();
      try {
        const gitDate = execSync(`git log -1 --format="%ad" --date=short -- "${fullPath}"`).toString().trim();
        const gitTime = execSync(`git log -1 --format="%ct" -- "${fullPath}"`).toString().trim();
        if (gitDate) {
           date = gitDate;
           timestamp = parseInt(gitTime) * 1000;
        }
      } catch(e) {
         date = new Date().toISOString().split('T')[0];
      }

      items.push({
        text: match ? match[1].trim() : name,
        link: `/${basePath}${name}`,
        date: date,
        timestamp: timestamp
      });
    }
  }
  
  // 排序规则：文件夹排在前面，笔记按修改时间倒序（最新的在最上面）
  return items.sort((a, b) => {
     if (a.items && !b.items) return -1;
     if (!a.items && b.items) return 1;
     if (!a.items && !b.items) return b.timestamp - a.timestamp;
     return 0;
  });
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
    // 指向根目录，触发全局无限扫描
    sidebar: getDynamicSidebar(path.resolve(__dirname, '../')),
    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }],
    search: { provider: 'local' }
  }
})
