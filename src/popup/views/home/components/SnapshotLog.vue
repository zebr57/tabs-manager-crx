<template>
  <div class="current-tabs-container">
    <div>当前标签</div>
    <el-tree :data="tabTree" :props="defaultProps" node-key="id" default-expand-all @node-click="handleNodeClick">
      <template #default="{ node, data }">
        <div class="custom-tree-node">
          <div class="node-left">
            <img v-if="data.favIconUrl" :src="data.favIconUrl" class="icon-img" />
            <span v-else class="icon-img" :style="{ backgroundColor: data.color }"></span>
            <span class="title-box" :style="{ fontWeight: data.isRootNode ? 600 : 400 }">{{ data.title }}</span>
          </div>
          <div class="node-right">
            <el-tooltip class="box-item" effect="dark" content="移至新窗口" placement="top">
              <el-icon :size="18" style="margin-right: 12px" @click.stop="handleMove(data)"><TopRight /></el-icon>
            </el-tooltip>
            <el-tooltip v-if="data.isRootNode" class="box-item" effect="dark" content="添加新标签" placement="top">
              <el-icon :size="18" style="margin-right: 12px" @click.stop="handleAppend(data)"><Plus /></el-icon>
            </el-tooltip>
            <el-tooltip class="box-item" effect="dark" content="保存快照" placement="top">
              <el-icon :size="18" style="margin-right: 12px" @click.stop="handleSave(data)"> <Camera /> </el-icon>
            </el-tooltip>
            <el-tooltip class="box-item" effect="dark" content="关闭标签" placement="top">
              <el-icon :size="18" @click.stop="handleClose(node, data)"> <Close /></el-icon>
            </el-tooltip>
          </div>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import type Node from "element-plus/es/components/tree/src/model/node";
import { reactive, onMounted } from "vue";

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

let tabTree = reactive<TabNode[]>([]);

const defaultProps = {
  children: "children",
  label: "title",
};
const handleNodeClick = (data: TabNode) => {
  console.log(data);
};

const handleMove = (data: TabNode) => {
  // Todo: 移动到新窗口打开
  if (data.isRootNode) {
    chrome.windows.create({ focused: true }, (newWindow) => {
      if (data.children && newWindow) {
        // 1.将分组移至新窗口
        chrome.tabGroups.move(data.groupId as number, { windowId: newWindow.id, index: -1 });
        // 2.移除新窗口默认创建的标签页
        chrome.tabs.query({ windowId: newWindow.id }, (windowTabs: chrome.tabs.Tab[]) => {
          const moveTabIds = data.children?.map((tab) => tab.id) as number[];
          const filterTabIds = windowTabs.filter((tab) => !moveTabIds.includes(tab.id as number));
          const defaultTabIds = filterTabIds.map((tab) => tab.id) as number[];
          chrome.tabs.remove(defaultTabIds);
        });
      }
    });
  } else {
    // 1.将标签页移至新窗口
    const tabIds = data.id;
    chrome.windows.create({ tabId: tabIds });
  }
};
const handleAppend = (data: TabNode) => {
  // Todo: 在分组下添加标签
  // 1. 创建新标签
  const newTab = {
    url: "chrome://newtab/", // 你要打开的网址
    active: false,
  };
  // 2. 新标签添加至分组中
  chrome.tabs.create(newTab, (tab) => {
    chrome.tabs.group({ tabIds: tab.id, groupId: data.groupId });
  });
};
const handleSave = (data: TabNode) => {
  console.log(data);
  // Todo：保存当前选项信息

  // 1.获取本地快照
  chrome.storage.sync.get(["snapshotLogList"], function (result) {
    console.log("Value currently is " + result.snapshotLogList);
    let snapshotLogList = result.snapshotLogList || [];
    console.log(snapshotLogList);

    snapshotLogList.push(data);
    chrome.storage.sync.set({ snapshotLogList }, function () {
      console.log("Value is set to " + snapshotLogList);
      tabTree = result.snapshotLogList;
    });
  });
};
const handleClose = (node: Node, data: TabNode) => {
  console.log(node, data);
  if (data.isRootNode) {
    // 1. 移除分组
  } else {
  }
};

onMounted(() => {
  chrome.storage.sync.get(["snapshotLogList"], function (result) {
    tabTree = result.snapshotLogList ? JSON.parse(result.snapshotLogList) : [];
    console.log(tabTree, "tabTree");
  });
});
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
      max-width: 570px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      text-decoration: none;
    }
  }
  .node-right {
    display: none;
    width: 120px;
  }
}
.custom-tree-node:hover .title-box {
  width: 450px;
}
.custom-tree-node:hover .node-right {
  display: flex;
  justify-content: end;
  align-items: center;
}
</style>
<style lang="scss">
.current-tabs-container {
  .el-tree-node__content {
    height: 36px !important;
    line-height: 36px !important;
  }
}
</style>
