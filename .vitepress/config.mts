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
      const folderId = `${basePath}${file}/`;
      const subItems = getDynamicSidebar(fullPath, folderId);
      if (subItems.length > 0) {
        items.push({ text: file, id: folderId, items: subItems, collapsed: true });
      }
    } else if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      const content = fs.readFileSync(fullPath, 'utf-8');
      const match = content.match(/^#\s+(.*)/m);
      
      let date = '';
      let timestamp = Date.now();
      
      // 核心修复：完善 Git 时间抓取与本地文件系统时间的 fallback 机制
      try {
        const gitDate = execSync(`git log -1 --format="%ad" --date=short -- "${fullPath}"`).toString().trim();
        const gitTime = execSync(`git log -1 --format="%ct" -- "${fullPath}"`).toString().trim();
        
        if (gitDate) {
          // 如果 Git 有记录，使用绝对准确的 Git 提交时间
          date = gitDate;
          timestamp = parseInt(gitTime) * 1000;
        } else {
          // 刚创建还没被 Git 索引的新文件，git log 会返回空，此时果断使用系统底层的文件修改时间
          date = stat.mtime.toISOString().split('T')[0];
          timestamp = stat.mtime.getTime();
        }
      } catch(e) {
        // 如果连 git 环境都没有（或者执行报错），同样兜底到系统文件时间
        date = stat.mtime.toISOString().split('T')[0];
        timestamp = stat.mtime.getTime();
      }

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
    
    // 屏蔽底部多余的上一篇/下一篇
    docFooter: { prev: false, next: false },
    
    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }],
    search: { provider: 'local' }
  }
})
