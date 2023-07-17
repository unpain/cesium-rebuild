import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'
import 'element-plus/theme-chalk/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
export const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia()).use(ElementPlus).use(router).mount('#app')

app.directive('longpress', {
  mounted(el, binding) {
    let pressTimer = null;

    el.addEventListener('mousedown', () => {
      pressTimer = setInterval(() => {
        binding.value();
      });
    });

    el.addEventListener('mouseup', () => {
      clearInterval(pressTimer);
    });

    el.addEventListener('mouseleave', () => {
      clearInterval(pressTimer);
    });
  }
})
