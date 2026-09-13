import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const IGNORE_LIST = ['.git', '.github', '.vitepress', 'node_modules', 'public', 'index.md', 'README.md', 'directory.md', 'write.md']

// 【终极核心】：每次 GitHub Actions 打包时，底层自动生成绝对不重复的核弹级时间戳
const NUCLEAR_VERSION = Date.now().toString();

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

      try {
        const gitDate = execSync(`git log -1 --format="%ad" --date=short -- "${fullPath}"`).toString().trim();
        const gitTime = execSync(`git log -1 --format="%ct" -- "${fullPath}"`).toString().trim();

        if (gitDate) {
          date = gitDate;
          timestamp = parseInt(gitTime) * 1000;
        } else {
          date = stat.mtime.toISOString().split('T')[0];
          timestamp = stat.mtime.getTime();
        }
      } catch(e) {
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
  
  head: [
    ['meta', { 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate' }],
    ['meta', { 'http-equiv': 'Pragma', content: 'no-cache' }],
    ['meta', { 'http-equiv': 'Expires', content: '0' }],
    
    // 【暴力破局】：这段脚本只要被加载一次，以后所有的缓存问题都会被它在底层自动物理超度
    ['script', {}, `
      (function() {
        try {
          var serverV = '${NUCLEAR_VERSION}';
          var localV = localStorage.getItem('cms_nuclear_v');
          
          if (localV !== serverV) {
            // 1. 强杀当前目录下的 Service Worker（绝不碰你域名的其他网站）
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(regs) {
                for (var i = 0; i < regs.length; i++) {
                  if (regs[i].scope.includes('/Notes/')) regs[i].unregister();
                }
              });
            }
            
            // 2. 强杀 Cache API（很多手机浏览器暗中使用的缓存池）
            if ('caches' in window) {
              caches.keys().then(function(keyList) {
                keyList.forEach(function(key) { caches.delete(key); });
              });
            }
            
            // 3. 记录最新版本，并给自己挂上随机参数强行自杀式刷新
            localStorage.setItem('cms_nuclear_v', serverV);
            var url = new URL(window.location.href);
            url.searchParams.set('v', serverV);
            window.location.replace(url.href);
          }
        } catch(e) {}
      })();
    `]
  ],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '📚 笔记目录', link: '/directory' },
      { text: '✍️ 写作台', link: '/write' }
    ],
    sidebar: getDynamicSidebar(path.resolve(__dirname, '../')),
    docFooter: { prev: false, next: false },
    socialLinks: [{ icon: 'github', link: 'https://github.com/moodHappy/Notes' }],
    search: { provider: 'local' }
  }
})
