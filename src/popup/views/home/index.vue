<template>
  <el-tabs v-model="activeName" class="demo-tabs" type="border-card" @tab-click="handleClick">
    <el-tab-pane label="快捷操作" name="first"><QuickOperation :tabsList="tabsList" :groupArr="groupArr"/></el-tab-pane>
    <el-tab-pane label="当前标签" name="second"><CurrentTabs :tabsList="tabsList" :groupObj="groupObj" /></el-tab-pane>
    <el-tab-pane label="快照记录" name="third"><SnapshotLog /></el-tab-pane>
    <el-tab-pane label="自动匹配" name="fourth"><MatchingRule /></el-tab-pane>
  </el-tabs>
</template>
<script lang="ts" setup>
import { ref, reactive, onMounted } from "vue";
import type { TabsPaneContext } from "element-plus";

import QuickOperation from "./components/QuickOperation.vue";
import CurrentTabs from "./components/CurrentTabs.vue";
import SnapshotLog from "./components/SnapshotLog.vue";
import MatchingRule from "./components/MatchingRule.vue";

const activeName = ref("first");

const regexp: RegExp = new RegExp("https://(.*?)/"); /* 此处定义正则表达式 */
let tabsList = ref<chrome.tabs.Tab[]>([]);
let urlArr = reactive<string[]>([]); // 所有域名地址
let groupObj = reactive<{ [key: string]: any }>({}); // 分组集合
let groupArr = ref<any[]>([]); // 分组

onMounted(async () => {
  tabsList.value = await chrome.tabs.query({ currentWindow: true });
  tabsList.value.forEach((tab: chrome.tabs.Tab) => {
    if (tab.url) {
      const matchArr: RegExpMatchArray | null = tab.url.match(regexp);
      if (matchArr) {
        if (matchArr) {
          urlArr.push(matchArr[0]);
        }
      }
    }
  });
  // 去重
  urlArr = Array.from(new Set(urlArr));
  // 按域名分组
  for (const tab of tabsList.value) {
    if (tab.url) {
      const matchArr: RegExpMatchArray | null = tab.url.match(regexp);
      if (matchArr) {
        const url = matchArr?.[0];
        if (url) {
          const flag = urlArr.includes(url);
          if (flag) {
            if (!groupObj[url]) {
              groupObj[url] = [tab];
            } else {
              groupObj[url].push(tab);
            }
          }
        }
      }
    }
  }

  for (const e of Object.values(groupObj)) {
    if (e.length > 1) {
      groupArr.value.push(e);
    }
  }
  console.log("存在同域名可生成分组：", tabsList.value, groupArr.value, groupObj, urlArr);
});

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};
</script>
<style>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 16px;
  /* width: 800px; */
}
</style>
