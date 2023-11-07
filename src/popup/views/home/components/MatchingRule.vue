<template>
  <div class="matching-rule-container">
    <el-input v-model="domainUrl" placeholder="请输入域名" size="small" clearable></el-input>
    <el-input v-model="groupName" placeholder="请输入分组名" size="small" clearable></el-input>
    <el-button type="primary" size="small" @click="handleMatchGroup">生成该域名分组</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";

const regexp: RegExp = new RegExp("https://(.*?)/"); /* 此处定义正则表达式 */

let domainUrl = ref<string>("");
let groupName = ref<string>("");

// 匹配生成分组
const handleMatchGroup = async () => {
  const tabsList = await chrome.tabs.query({ currentWindow: true });
  const curTab: chrome.tabs.Tab = await getCurrentTab();
  const value = domainUrl.value || curTab?.url?.match(regexp)?.[0] || ""; // 没有输入值则以当前标签页面url
  const title = groupName.value;
  const filterArr: chrome.tabs.Tab[] = tabsList.filter((e) => e.url?.indexOf(value) != -1);
  const tabIds: number[] = filterArr.map(({ id }) => id as number);
  if (tabIds.length) {
    const group: number = await chrome.tabs.group({ tabIds }); // 组合标签页
    await chrome.tabGroups.update(group, { title }); //设置组合标签页标题
  } else {
    ElMessage({
      message: "当前没有匹配的标签页",
      type: "warning",
    });
  }
};

const getCurrentTab = async (): Promise<chrome.tabs.Tab> => {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};
</script>

<style lang="scss" scoped>
.matching-rule-container {
  width: 470px;
}
</style>
