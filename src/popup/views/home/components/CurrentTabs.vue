<template>
  <div class="current-tabs-container">
    <div class="title-h4">当前所有标签</div>
    <el-tree :data="tabTree" :props="defaultProps" node-key="id" default-expand-all @node-click="handleNodeClick">
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
            <el-tooltip v-if="data.isRootNode" class="box-item" effect="dark" content="折叠|展开" placement="top">
              <el-icon :size="18" @click.stop="handleCollapsed(data)">
                <Expand v-show="!data.collapsed" />
                <Fold v-show="data.collapsed" />
              </el-icon>
            </el-tooltip>
            <el-tooltip class="box-item" effect="dark" content="移至新窗口" placement="top">
              <el-icon :size="18"  @click.stop="handleMove(data)"><TopRight /></el-icon>
            </el-tooltip>
            <el-tooltip v-if="data.isRootNode" class="box-item" effect="dark" content="添加新标签" placement="top">
              <el-icon :size="18"  @click.stop="handleAppend(data)"><Plus /></el-icon>
            </el-tooltip>
            <el-tooltip class="box-item" effect="dark" content="保存快照" placement="top">
              <el-icon :size="18"  @click.stop="handleSave(data)"> <Camera /> </el-icon>
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
import { ref, defineProps, onMounted } from "vue";

import { ElNotification } from "element-plus";
import type Node from "element-plus/es/components/tree/src/model/node";

const { tabsList, groupObj } = defineProps({
  tabsList: Array,
  groupObj: Object,
});

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
  isInput?: boolean;
}

let tabTree = ref<TabNode[]>([]);
let checkId = ref<number>(0); // 显示input
let titleValue = ref<number | string>(""); // input 标题

const defaultProps = {
  children: "children",
  label: "title",
};

// 挂载
onMounted(async () => {
  console.log("currentTabs onMounted：", groupObj, tabsList);
  setTabTree();
});

const handleNodeClick = (data: TabNode) => {
  console.log(data);
  checkId.value = 0;
  titleValue.value = "";
  if (!data.isRootNode) {
    chrome.tabs.update(data.id as number, { active: true });
  }
};

// 修改分组标题
const handleSubmit = (data: TabNode) => {
  chrome.tabGroups.update(data.id, { title: data.title }, () => {
    checkId.value = 0; // 恢复取消选中
  });
};
// 显示input
const handleInput = (data: TabNode) => {
  titleValue.value = data.title || "未命名";
  checkId.value = data.id;
  if (!data.isRootNode) {
    chrome.tabs.update(data.id as number, { active: true });
  }
};
// 折叠|展开
const handleCollapsed = (data: TabNode) => {
  if (data.isRootNode) {
    data.collapsed = !data.collapsed;
    chrome.tabGroups.update(data.groupId as number, { collapsed: data.collapsed });
  }
};
// 移动新窗口
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
  setTabTree();
};
// 新增选项卡
const handleAppend = (data: TabNode) => {
  // Todo: 在分组下添加标签
  // 1. 创建新标签
  const newTab = {
    url: "chrome://newtab/", // 你要打开的网址
    active: false,
  };
  chrome.tabs.create(newTab, (tab) => {
    // 2. 新标签添加至分组中
    chrome.tabs.group({ tabIds: tab.id, groupId: data.groupId });
    // 3. 激活选项卡
    chrome.tabs.update(tab.id as number, { active: true });
  });
};
// 保存快照
const handleSave = (data: TabNode) => {
  // Todo：保存当前选项信息
  // 1.1获取本地快照
  chrome.storage.sync.get(["snapshotLogList"], function (result) {
    let snapshotLogList = result.snapshotLogList ? JSON.parse(result.snapshotLogList) : [];
    snapshotLogList.push(data);
    // 1.2 更新本地快照
    chrome.storage.sync.set({ snapshotLogList: JSON.stringify(snapshotLogList) }, function () {
      ElNotification({
        title: "保存快照成功",
        type: "success",
      });
    });
  });
};
// 关闭分组、选型卡
const handleClose = (node: Node, data: TabNode) => {
  // 移除节点
  const parent = node.parent;
  const children: TabNode[] = parent.data.children || parent.data;
  const index = children.findIndex((d) => d.id === data.id);
  children.splice(index, 1);
  tabTree.value = [...tabTree.value];
  // 移除标签
  if (data.isRootNode) {
    // 1. 移除分组
    // 查询分组中的标签信息
    chrome.tabs.query({ groupId: data.groupId }, (groupTabs) => {
      const tabIds = groupTabs.map((tab) => tab.id) as number[];
      // 关闭分组中的所有选项卡
      chrome.tabs.remove(tabIds);
    });
  } else {
    chrome.tabs.remove(data.id);
  }
};

const setTabTree = () => {
  tabTree.value = [];
  // 获取当前窗口的所有标签
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    // 将标签信息存储到 tabTree 数组
    tabs.forEach((tab) => {
      const tabNode: TabNode = {
        id: tab.id as number,
        title: tab.title || "",
        url: tab.url as string,
        favIconUrl: tab.favIconUrl,
        groupId: tab.groupId, // 存储分组信息
        index: tab.index,
        children: [],
      };
      tabTree.value.push(tabNode);
    });

    // 获取分组信息
    chrome.tabGroups.query({}, (groups) => {
      // 将分组信息添加到标签节点中
      tabTree.value.forEach((tabNode: TabNode) => {
        const group = groups.find((g) => g.id === tabNode.groupId);
        if (group) {
          tabNode.groupName = group.title;
          tabNode.color = group.color;
          tabNode.collapsed = group.collapsed;
        }
      });
      groups.forEach((group) => {
        // 1. 找出要插入的位置
        const idx = tabTree.value.findIndex((tab) => tab.groupId == group.id);
        // 2. 存储元素
        const groupChild = tabTree.value.filter((tab) => tab.groupId == group.id);
        // 3. 删除元素
        tabTree.value = tabTree.value.filter((tab) => tab.groupId != group.id);
        // 4. 插入元素
        const groupItem = {
          id: group.id as number,
          title: group.title || "",
          url: "",
          color: group.color,
          groupId: group.id, // 存储分组信息
          collapsed: group.collapsed,
          children: groupChild,
          isRootNode: true,
          isInput: false,
        };
        tabTree.value.splice(idx, 0, groupItem);
      });
      // 现在，tabTree 数组包含了标签和它们的分组信息
      console.log(tabTree.value, "xxxx标签树🌲xxxx");
    });
  });
};
</script>

<style lang="scss" scoped>
.current-tabs-container {
  width: 470px;
  .custom-tree-node {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 470px;
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
        max-width: 260px;
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
      gap: 12px;
      margin-right: 12px;
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
}
</style>
<style lang="scss">
.current-tabs-container {
  .title-h4 {
    margin-bottom: 12px;
  }
  .el-tree-node__content {
    height: 36px !important;
    line-height: 36px !important;
  }
}
</style>
