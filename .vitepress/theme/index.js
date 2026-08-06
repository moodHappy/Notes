import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import WebEditor from './components/WebEditor.vue'
import FloatingButton from './components/FloatingButton.vue'

export default {
  ...DefaultTheme,
  // 核心修复：利用 Layout 插槽，强行把你的悬浮按钮注入到整个网站的最外层
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(FloatingButton)
    })
  },
  enhanceApp({ app }) {
    // 保持你的编辑器组件注册不变
    app.component('WebEditor', WebEditor)
  }
}
