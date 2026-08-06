import DefaultTheme from 'vitepress/theme'
import WebEditor from './components/WebEditor.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('WebEditor', WebEditor)
  }
}
