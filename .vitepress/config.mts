import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const IGNORE_LIST = ['.git', '.github', '.vitepress', 'node_modules', 'public', 'index.md', 'README.md', 'directory.md', 'write.md']

// 【核心改造】：每次 GitHub Actions 打包时，自动生成一个随机且唯一的时间戳版本号
const BUILD_VERSION = Date.now().toString();

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
    
    // 【核心改造】：注入自动化防缓存脚本，让系统自己处理随机化，不用人操心
    ['script', {}, `
      (function() {
        var latestVersion = '${BUILD_VERSION}';
        var localVersion = localStorage.getItem('notes_cms_version');
        
        if (localVersion !== latestVersion) {
          localStorage.setItem('notes_cms_version', latestVersion);
          
          // 精准狙击：只清理当前 Notes 目录的 Service Worker 缓存，绝对不碰你其他站点的 Cookie 和数据
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(var i = 0; i < registrations.length; i++) {
                if (registrations[i].scope.includes('/Notes/')) {
                  registrations[i].unregister();
                }
              }
            });
          }
          
          // 自动重定向：如果当前 URL 没有带上最新的随机戳，系统自动给你加上并刷新
          var url = new URL(window.location.href);
          if (url.searchParams.get('v') !== latestVersion) {
            url.searchParams.set('v', latestVersion);
            window.location.replace(url.href); // 浏览器会自动重新拉取真实代码
          }
        }
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
