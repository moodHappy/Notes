import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "My Digital Garden",
  description: "个人知识库",
  base: '/notes/', 
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/moodHappy/notes' }
    ]
  }
})
