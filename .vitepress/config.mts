import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const IGNORE_LIST = ['.git', '.github', '.vitepress', 'node_modules', 'public', 'index.md', 'README.md', 'directory.md', 'write.md']

function getDynamicSidebar(dirPath, basePath = '') {
  const items = [];
  if (!fs.existsSync(dirPath)) return items;

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file.startsWith('.') || IGNORE_LIST.includes(file)) continue;
    
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 核心修正 1：生成文件夹唯一标识 id，交给前端用来“记住”展开状态
      const folderId = `${basePath}${file}/`;
      const subItems = getDynamicSidebar(fullPath, folderId);
      if (subItems.length > 0) {
        items.push({ text: file, id: folderId, items: subItems, collapsed: true });
      }
    } else if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      const content = fs.readFileSync(fullPath, 'utf-8');
      const match = content.match(/^#\s+(.*)/m);
      
      let date = '新笔记';
      let timestamp = Date.now();
      try {
        const gitDate = execSync(`git log -1 --format="%ad" --date=short -- "${fullPath}"`).toString().trim();
        const gitTime = execSync(`git log -1 --format="%ct" -- "${fullPath}"`).toString().trim();
        if (gitDate) { date = gitDate; timestamp = parseInt(gitTime) * 1000; }
      } catch(e) { date = new Date().toISOString().split('T')[0]; }

      items.push({
        text: match ? match[1].trim() : name,
        link: `/${basePath}${name}`,
        date: date,
        timestamp: timestamp
      });
    }
  }
  
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
    sidebar: getDynamicSidebar(path.resolve(__dirname, '../')),
    
    // 核心修正 2：彻底屏蔽底部画蛇添足的“上一篇/下一篇”按钮
    docFooter: { prev: false, next: false },
    
    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }],
    search: { provider: 'local' }
  }
})
