import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        config: resolve(__dirname, './src/otherPage/config/index.html'),
        help: resolve(__dirname, './src/otherPage/help/index.html'),
      },
      output: {
        dir: 'dist-crx',
        format: "es",
      },
    },
    
  },
  resolve: {
    alias: [
      {
        find: /^\/@\//,
        replacement: resolve('src') + '/'
      },
    ]
  },
  plugins: [vue()],
});
