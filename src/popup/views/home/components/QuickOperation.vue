<template>
  <div class="quick-operation-container">
    <!-- 快捷操作 -->
    <el-button type="primary" size="small" @click="handleCreateGroup">一键生成分组</el-button>
    <el-button type="primary" size="small" @click="handleCancelGroup">一键取消分组</el-button>

    <el-switch
      v-model="isAutoSort"
      size="large"
      inline-prompt
      style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949; margin-left: 12px"
      active-text="开启自动排序"
      inactive-text="关闭自动排序"
      @change="handleChangeAutoSort"
    />
    <el-switch
      v-show="isAutoSort"
      v-model="isAuto"
      size="large"
      inline-prompt
      style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949; margin-left: 12px"
      active-text="开启自动分组"
      inactive-text="关闭自动分组"
      @change="handleChangeAuto"
    />

    <el-divider direction="horizontal" content-position="left">选择标签页创建分组</el-divider>
    <!-- 当前窗口所有标签页 -->
    <el-checkbox-group v-model="checkIds" size="normal">
      <el-checkbox v-for="tab in tabsList" :key="tab.id" :label="tab.id">
        <div style="display: flex; align-items: center; gap: 4px">
          <img :src="tab.favIconUrl" alt="" srcset="" width="16" height="16" />
          {{ tab.title }}
        </div>
      </el-checkbox>
    </el-checkbox-group>
    <!-- 表单控件 创建分组 -->
    <div class="form-box">
      <div class="form-title">
        <el-input v-model="groupTitle" placeholder="请输入分组名" size="small" clearable></el-input>
      </div>
      <div class="form-color">
        <el-popover placement="bottom" :width="230" trigger="click">
          <template #reference>
            <div class="color-check" :style="{ backgroundColor: colors[colorIdx] }"></div>
          </template>
          <template #default>
            <div class="color-box">
              <span
                v-for="(color, index) in colors"
                :key="color"
                :style="{ backgroundColor: color }"
                :class="index == colorIdx ? 'color-active' : ''"
                class="color-item"
                @click="handleChangeColor(index)"
              ></span>
            </div>
          </template>
        </el-popover>
      </div>
      <div class="form-btn">
        <el-button type="primary" size="small" @click="handleCheckGroup">生成分组</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, toRaw, onMounted } from "vue";
import type { PropType } from "vue";
import { ElMessage } from "element-plus";

const { tabsList, groupArr } = defineProps({
  tabsList: {
    type: Array as PropType<chrome.tabs.Tab[]>, // 指定类型
    required: true, // 设置为必传
    default: [] // 设置默认值
  },
  groupArr: {
    type: Array as PropType<chrome.tabs.Tab[][]>,
    required: true, // 设置为必传
    default: [] // 设置默认值
  }
});

const checkIds = ref<number[]>([]);
const colorIdx = ref<number>(0);
const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];

let groupTitle = ref<string>("");
let isAuto = ref<boolean>(true);
let isAutoSort = ref<boolean>(true);

// 加载初始化
onMounted(() => {
  chrome.storage.sync.get(["isAuto", "isAutoSort"], function (result) {
    isAuto.value = result.isAuto;
    isAutoSort.value = result.isAutoSort;
  });
});

// /* ===================================== 操作按钮 ===================================== */

// 一键生成
const handleCreateGroup = async () => {
  chrome.runtime.sendMessage({ action: "autoGroup" });
  return;
  if (groupArr && groupArr.length > 0) {
    for (const tabs of groupArr) {
      const tabIds = tabs.map(({ id }: chrome.tabs.Tab) => id) as number[];
      await chrome.tabs.group({ tabIds }); // 组合标签页
      // await chrome.tabGroups.update(group, { title: "" }); //设置组合标签页标题
    }
  } else {
    ElMessage("当前不存在相同域名的标签页");
  }
};
// 一键取消
const handleCancelGroup = () => {
  // 向后台脚本发送消息，触发取消分组操作
  chrome.runtime.sendMessage({ action: "cancelGroup" });
};

// 是否开启自动分组
const handleChangeAuto = () => {
  // 本地存储是让后台判断否开启自动分组
  chrome.storage.sync.set({ isAuto: isAuto.value }, function () {});
};
const handleChangeAutoSort = () => {
  if (isAutoSort.value) {
    isAuto.value = false;
    // 本地存储是让后台判断否开启自动分组
    chrome.storage.sync.set({ isAuto: false }, function () {});
  }
  // 本地存储是让后台判断否开启自动分组
  chrome.storage.sync.set({ isAutoSort: isAutoSort.value }, function () {});
};
// 选择颜色
const handleChangeColor = (idx: number) => {
  colorIdx.value = idx;
};
// 勾选生成分组
const handleCheckGroup = async () => {
  if (checkIds.value.length > 0) {
    const tabIds = toRaw(checkIds.value);
    const title = groupTitle.value;
    const group: number = await chrome.tabs.group({ tabIds }); // 组合标签页
    await chrome.tabGroups.update(group, { title }); //设置组合标签页标题
    checkIds.value = []; // 重置
    colorIdx.value = 0;
  } else {
    ElMessage({
      message: "请勾选标签页~",
      type: "warning"
    });
  }
};
</script>

<style lang="scss" scoped>
.quick-operation-container {
  width: 470px;
  padding: 15px;
  .el-checkbox {
    width: 100%;
    .el-checkbox__label {
      width: 300px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      text-decoration: none;
      margin-bottom: 12px;
    }
  }
  .form-box {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
    .form-title {
      width: 120px;
    }
    .form-color {
      width: 24px;
    }
    .form-btn {
    }
  }
}
</style>
<style lang="scss">
.color-check {
  cursor: pointer;
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 4px;
}
.color-box {
  display: flex;
  align-items: center;
  gap: 8px;
  .color-item {
    cursor: pointer;
    width: 18px;
    height: 18px;
    border-radius: 50%;
  }
  .color-active {
    border: 2px solid #ccc;
    box-shadow: 0px 0px 8px #ccc;
  }
}
</style>
