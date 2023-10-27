// 通过vue-router插件实现模板路由配置
import { createRouter, createWebHashHistory } from "vue-router";

// 创建路由器示例
let router = createRouter({
  // 路由模式hash
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "/",
      // redirect: '/home',
      redirect: "/home",
      children: [],
    },
    {
      path: "/home",
      name: "home",
      component: () => import("../views/home/index.vue"),
    },
  ],
  scrollBehavior() {
    return {
      left: 0,
      top: 0,
    };
  },
});

export default router;
