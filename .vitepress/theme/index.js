import DefaultTheme from 'vitepress/theme'
import WebEditor from './components/WebEditor.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('WebEditor', WebEditor)
  }
}
