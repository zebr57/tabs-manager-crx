<template>
  <div class="current-tabs-container">
    <!-- 树 -->
    <el-tree ref="RefTree" :data="tabTree" :props="defaultProps" node-key="id" default-expand-all @node-click="handleNodeClick">
      <template #default="{ node, data }">
        <div class="custom-tree-node">
          <div class="node-left">
            <img v-if="data.favIconUrl" :src="data.favIconUrl" class="icon-img" />
            <span v-else class="icon-img" :style="{ backgroundColor: data.color }"></span>
            <el-input
              v-if="data.isRootNode && checkId == data.id"
              v-model="data.title"
              placeholder="请输入标题"
              size="small"
              style="width: 200px"
              @click.stop="() => {}"
              @keydown.enter="handleSubmit(data)"
            ></el-input>
            <span v-else class="title-box" :class="{ 'group-title': data.isRootNode }" :style="{ fontWeight: data.isRootNode ? 600 : 400 }" @click.stop="handleInput(data)">{{
              data.title || "未命名"
            }}</span>
          </div>
          <div class="node-right">
            <el-tooltip class="box-item" effect="dark" content="删除" placement="top">
              <el-icon :size="18" @click.stop="handleDelete(node, data)"> <Delete /></el-icon>
            </el-tooltip>
          </div>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import type Node from "element-plus/es/components/tree/src/model/node";
import { ref, toRaw, onMounted } from "vue";

// 定义标签节点的类型
interface TabNode {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  groupId?: number; // 用于存储分组信息的属性
  index?: number;
  groupName?: string;
  color?: string;
  collapsed?: boolean;
  children?: TabNode[];
  isRootNode?: boolean;
}
let RefTree = ref("RefTree");
let tabTree = ref<TabNode[]>([]);
let titleValue = ref<number | string>("");
let checkId = ref<number>(0);

const defaultProps = {
  children: "children",
  label: "title",
};

// 挂载
onMounted(() => {
  chrome.storage.sync.get(["snapshotLogList"], function (result) {
    tabTree.value = result.snapshotLogList ? JSON.parse(result.snapshotLogList) : [];
    console.log(tabTree.value, "tabTree");
  });
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      if (key == "snapshotLogList") {
        tabTree.value = newValue ? JSON.parse(newValue) : [];
      }
      console.log(`Storage key "${key}" in namespace "${namespace}" changed.`, `Old value was "${oldValue}", new value is "${newValue}".`);
    }
  });
});
/* ===================================== Event ===================================== */

// 点击节点
const handleNodeClick = async (data: TabNode) => {
  checkId.value = 0;
  titleValue.value = "";
  // 是否为分组or选项卡
  if (data.isRootNode && data.children && data.children.length != 0) {
    const children: TabNode[] = data.children;
    const tabList: TabNode[] = [];
    children.forEach((e, i) => {
      chrome.tabs.create({ url: e.url, active: false }, function (tab) {
        tabList.push(tab as TabNode);
        chrome.runtime.sendMessage({ action: "createGroup", tab: tab, isLast: i == children.length - 1 });
      });
    });
  } else {
    chrome.tabs.create({ url: data.url });
  }
};

// 修改分组标题
const handleSubmit = (data: TabNode) => {
  console.log("修改标题成功", data);
  setStorageSnapshotLogList();
};
// 显示input
const handleInput = (data: TabNode) => {
  titleValue.value = data.title || "未命名";
  checkId.value = data.id;
};

// 删除
const handleDelete = (node: Node, data: TabNode) => {
  // 移除节点
  const parent = node.parent;
  const children: TabNode[] = parent.data.children || parent.data;
  const index = children.findIndex((d) => d.id === data.id);
  children.splice(index, 1);
  if (children.length == 0) {
    tabTree.value = tabTree.value.filter((e) => e.children && e.children.length > 0);
  } else {
    tabTree.value = [...tabTree.value];
  }
  setStorageSnapshotLogList();
};
// 修改本地存储SnapshotLogList
const setStorageSnapshotLogList = () => {
  let snapshotLogList = toRaw(tabTree.value) || [];
  chrome.storage.sync.set({ snapshotLogList: JSON.stringify(snapshotLogList) }, function () {
    console.log("修改本地存储snapshotLogList成功");
  });
};
</script>

<style lang="scss" scoped>
.custom-tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 620px;
  font-size: 18px;
  .node-left {
    display: flex;
    align-items: center;

    .icon-img {
      width: 18px;
      height: 18px;
      margin-right: 8px;
      border-radius: 50%;
    }
    .title-box {
      // max-width: 570px;
      min-width: 50px;
      height: 28px;
      line-height: 28px;
      padding: 0px 4px;
      margin: 4px 0px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      text-decoration: none;
    }
    .group-title:hover {
      background: #fff;
    }
  }
  .node-right {
    display: none;
    width: 120px;
  }
}
.custom-tree-node:hover .title-box {
  // width: 450px;
}

.custom-tree-node:hover .node-right {
  display: flex;
  justify-content: end;
  align-items: center;
}
</style>
<style lang="scss">
.current-tabs-container {
  min-height: 150px;
  .title-h4 {
    margin-bottom: 12px;
  }
  .el-tree-node__content {
    height: 36px !important;
    line-height: 36px !important;
  }
}
</style>
