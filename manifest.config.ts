import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";
const { version } = packageJson;

export default defineManifest(async (env) => ({
  name: "标签管理器beta",
  version: version,
  description: "标签页自动分组、自定义分组功能",
  manifest_version: 3,
  action: {
    default_popup: "index.html",
    default_icon: {
      "16": "images/icon-16.png",
      "32": "images/icon-32.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    },
    default_title: "Vue CRX MV3"
  },
  icons: {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  },
  background: {
    service_worker: "src/background/index.ts"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_end"
    }
  ],
  permissions: ["tabGroups", "tabs", "storage", "contextMenus", "commands"],
  commands: {
    // 自定义快捷键指令
    "toggle-group": {
      suggested_key: {
        default: "Alt+Q"
      },
      description: "根据当前标签页生成/取消分组"
    },
    "close-group": {
      suggested_key: {
        default: "Alt+W"
      },
      description: "根据当前标签页关闭分组"
    },
    "sort-tab": {
      suggested_key: {
        default: "Alt+S"
      },
      description: "根据域名排序标签页"
    }

    // 映射 action （icon的事件）
    // _execute_action: {
    //   suggested_key: {
    //     default: "Alt+T"
    //   }
    // }
  }
}));
