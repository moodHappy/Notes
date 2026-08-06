import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "My Digital Garden",
  description: "记录技术、英语与生活",
  // 这里的 base 必须和你的 GitHub 仓库名大小写完全一致，用来修复样式彻底丢失的问题
  base: '/Notes/', 
  
  themeConfig: {
    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '英语精读', link: '/english/' },
      { text: '脚本与工具', link: '/scripts/' },
      { text: '阅读笔记', link: '/literature/' },
      { text: '✍️ 前台工作台', link: '/write' } // 点击直接进入网页端沉浸式写作
    ],

    // 左侧边栏菜单结构
    sidebar: {
      '/english/': [
        {
          text: '英语学习与分析',
          items: [
            { text: '长难句拆解', link: '/english/sentence-breakdowns' },
            { text: '词汇与 Anki 卡片', link: '/english/vocabulary-anki' }
          ]
        }
      ],
      '/scripts/': [
        {
          text: '前端与自动化脚本',
          items: [
            { text: 'Tampermonkey 脚本', link: '/scripts/tampermonkey' },
            { text: '阅读界面优化', link: '/scripts/reading-interface' }
          ]
        }
      ],
      '/literature/': [
        {
          text: '经典文学摘录',
          items: [
            { text: '百年孤独', link: '/literature/one-hundred-years-of-solitude' },
            { text: '小王子', link: '/literature/the-little-prince' }
          ]
        }
      ]
    },

    // 右上角社交链接，直接指向你的 GitHub 仓库
    socialLinks: [
      { icon: 'github', link: 'https://github.com/moodHappy/Notes' }
    ],

    // 底部版权信息
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present moodHappy'
    },

    // 顺手帮你开启了全局本地搜索功能，方便在前台查笔记
    search: {
      provider: 'local'
    }
  }
})
