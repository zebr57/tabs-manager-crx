import { createApp } from "vue";
import App from "./popup.vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css"; // 暗黑主题
// 引入所有图标并注册
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import router from "./router";

const app = createApp(App);

app.use(router);
app.use(ElementPlus, { size: "small", zIndex: 3000 });
// 注册所有element图标。
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount("#app");

// 主题跟随系统
const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
if (darkModeMediaQuery.matches) {
  const htmlElement = document.querySelector("html");
  if (htmlElement) htmlElement.classList.add("dark");
}
