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
  permissions: ["tabGroups", "tabs", "storage", "bookmarks"],
  host_permissions: []
}));
