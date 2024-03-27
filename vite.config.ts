import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config"; // Node >=17

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        config: resolve(__dirname, "./src/otherPage/config/index.html"),
        help: resolve(__dirname, "./src/otherPage/help/index.html")
      },
      output: {
        dir: "dist",
        format: "es"
      }
    }
  },
  resolve: {
    alias: [
      {
        find: /^\/@\//,
        replacement: resolve("src") + "/"
      }
    ]
  },
  plugins: [vue(), crx({ manifest })],
  // 根据启动服务的端口修改，否则 hmr 不生效
  server: {
    strictPort: true,
    port: 5175,
    hmr: {
      clientPort: 5175
    },
  }
});
