interface GroupType {
  url: string;
  groupId: number;
  children: chrome.tabs.Tab[];
}

const urlRegex = /\/\/(www\.)?([^.]+)/;
let tabsList: chrome.tabs.Tab[] = []; // 所有标签页
let groupByDomainMap: { [key: string]: any } = {}; // 分组集合
let domainList: string[] = []; // 所有标签页域名
let groupTree: GroupType[] = []; // 标签页分群显示的树结构

const initData = async () => {
  // 1. 获取全部标签页
  tabsList = await chrome.tabs.query({ currentWindow: true });
  // 2. 获取所有url
  tabsList.forEach((tab: chrome.tabs.Tab) => {
    if (tab.url) {
      const url = getDomain(tab.url);
      if (url) {
        domainList.push(url);
      }
    }
  });
  // 3. 去重（域名作为唯一key）
  domainList = Array.from(new Set(domainList));
  // 4. 保存所有域名与标签页的 map
  groupByDomainMap = getGroupByDomain(tabsList);
  // 5. 用于显示树节点的信息
  groupTree = getGroupTree(groupByDomainMap);

  // console.log("所有域名键：", domainList);
  // console.log("域名与标签页的 map", groupByDomainMap);
  // console.log("存在同域名可生成分组：", groupTree);
};

initData();

/* ===================================== 监听行为 start ===================================== */
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({
      url: "src/otherPage/help/index.html"
    });
    chrome.storage.sync.set({ isAutoSort: true, isAuto: true }, function () {
      console.log("初始化自动排序/分组设置成功!");
    });
  }
});
let activeTab: chrome.tabs.Tab | null = null;
// 添加tabs.onActivated事件监听器(切换标签页)
chrome.tabs.onActivated.addListener(function (activeInfo) {
  const tabId = activeInfo.tabId;

  // 获取当前选项卡的信息
  chrome.tabs.get(tabId, function (tab) {
    // console.log("当前选项卡信息:", tab);
    activeTab = tab;
  });
});
// 监听关闭标签页
chrome.tabs.onRemoved.addListener(function () {
  // 查询所有分组，查询每个分组是否只剩下一个tab，则取消分组
  chrome.tabGroups.query({}, function (groups) {
    groups.forEach((group) => {
      chrome.tabs.query({ groupId: group.id, currentWindow: true }, (tabs) => {
        if (tabs.length == 1) {
          const tabIds = tabs.map((tab) => tab.id as number);
          chrome.tabs.ungroup(tabIds);
        }
      });
    });
  });
});

// 监听popup.js按钮点击事件
chrome.runtime.onMessage.addListener(async (request) => {
  console.log(request.action);
  const { action } = request;
  switch (action) {
    case "autoGroup": // 一键创建分组
      autoGroup();
      break;
    case "cancelGroup": // 取消所有分组
      cancelGroup();
      break;
    default:
      break;
  }
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // 当地址栏URL变化时执行处理逻辑
  if (changeInfo.url) {
    // 在此处进行其他操作
    chrome.storage.sync.get(["isAutoSort", "isAuto"], async function (result) {
      // 1. 是否开启
      if (!result.isAutoSort) return;
      // 2. 获取新建选项卡信息，进行匹配创建分组
      if (result.isAuto) {
        chrome.tabs.get(tabId, function (tab) {
          createMatchGroup(tab);
        });
      } else {
        // Changed：改为自动排序逻辑，解决在当前位置改变地址自动排序位置错乱问题
        await autoGroup();
        await cancelGroup();
        return;

        // 找出最后一个符合的元素索引
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          const lastIndex = findLastIndex(tabs, (t) => {
            return t.index != tab.index && getDomain(t.url) == getDomain(tab.url);
          });
          // 移动指定位置
          if (lastIndex != -1) chrome.tabs.move(tabId, { index: lastIndex + 1 });
        });
      }
    });
  }
});
/**
 * @description: 监听自定义快捷键指令
 */
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log(`Command "${command}" called`);
  // 根据当前活跃标签页进行操作
  const [currentTab]: chrome.tabs.Tab[] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (command == "toggle-group") {
    const groupId = currentTab.groupId;
    if (groupId != -1) {
      // (解散选项卡组)
      const groupTabs: chrome.tabs.Tab[] = await chrome.tabs.query({
        groupId: groupId,
        currentWindow: true
      });
      const tabIds: number[] = groupTabs.map((t) => t.id as number);
      await chrome.tabs.ungroup(tabIds);
    } else {
      // (创建分组)
      await initData();
      const tabUrl = getDomain(currentTab.url);
      if (groupByDomainMap[tabUrl].length >= 2) {
        const tabIds = groupByDomainMap[tabUrl].map((t: chrome.tabs.Tab) => t.id as number);
        const groupId: number = await chrome.tabs.group({ tabIds }); // 组合标签页
        const title = getDomain(tab.url);
        await chrome.tabGroups.update(groupId, { title });
      } else {
        console.warn("当前不存在其他相同域名的页面");
      }
    }
  } else if (command == "close-group") {
    // （关闭选项卡组）
    const groupId = currentTab.groupId;
    if (groupId != -1) {
      // (解散选项卡组)
      const groupTabs: chrome.tabs.Tab[] = await chrome.tabs.query({
        groupId: groupId,
        currentWindow: true
      });
      const tabIds: number[] = groupTabs.map((t) => t.id as number);
      await chrome.tabs.remove(tabIds);
    }
  } else if (command == "sort-tab") {
    // 以下方式不影响原有顺序，效果跟分组一样，将后续移至第一个标签页后面
    await autoGroup();
    await cancelGroup();
  }
});
/* ===================================== 监听行为 end ===================================== */

/* ===================================== utils ===================================== */
/**
 * @description: 根据url获取域名
 */
const getDomain = (url: string | undefined) => {
  if (!url) return "";
  const matches: RegExpMatchArray | null = url.match(urlRegex); // 匹配主机名部分

  if (matches && matches.length > 2) {
    const extractedDomain = matches[2];
    return extractedDomain;
  } else {
    console.log("无法匹配域名");
  }
  return "";
};
/**
 * @description: 按域名归类
 */
const getGroupByDomain = (tabsList: chrome.tabs.Tab[]) => {
  // 按域名分组
  let res: { [key: string]: any } = {};
  for (const tab of tabsList) {
    if (tab.url) {
      const url = getDomain(tab.url);
      if (url) {
        const flag = domainList.includes(url);
        if (flag) {
          if (!res[url]) {
            res[url] = [tab];
          } else {
            res[url].push(tab);
          }
        }
      }
    }
  }
  return res;
};
/**
 * @description: 根据归类好的键值({domain: [tab,tab]})，组成分群信息
 */
const getGroupTree = (groupByDomainMap: { [key: string]: any }) => {
  let groupTree = [];
  for (const e of Object.entries(groupByDomainMap)) {
    const key = e[0];
    const value = e[1];
    if (value.length > 1) {
      groupTree.push({
        url: key,
        groupId: -2,
        children: value
      });
    }
  }
  return groupTree;
};
// 一键根据同域名自动分组
const autoGroup = async () => {
  try {
    await initData();
    if (groupTree && groupTree.length > 0) {
      for (const item of groupTree) {
        const tabIds = item.children.map(({ id }: chrome.tabs.Tab) => id) as number[];
        const groupId: number = await chrome.tabs.group({ tabIds }); // 组合标签页
        item.groupId = groupId;
        const title = item.url; // url：xxx.com
        await chrome.tabGroups.update(groupId, { title });
      }
    } else {
      console.log("当前不存在相同域名的标签页");
    }
  } catch (error) {
    console.error("autoGroup()", error);
  }
};
// 找出存在两个及以上并还没分组标签页生成分组
const createMatchGroup = async (tab: chrome.tabs.Tab) => {
  const domain = getDomain(tab.url);
  if (!domain) return; // 不是正确域名，终止操作
  try {
    await initData();

    // 这里有个问题有些网站是http://wwww.ex.com 跳转 https://wwww.ex.com，导致创建不了分组。
    // 解决：改变匹配正则，只匹配域名
    const groups = await chrome.tabGroups.query({});
    const findGroup = groups.find((e) => e.title == domain);
    if (findGroup) {
      chrome.tabs.group({ tabIds: tab.id, groupId: findGroup.id }, () => {
        console.log("已存在分组，加入分组成功!");
      });
    } else {
      // 没有符合的分组，需要判断有没有存在相同域名且不在分组中的选项卡，有则生成
      const noGroupTabs = await chrome.tabs.query({ currentWindow: true, groupId: -1 });
      // 查询所有未分组的选项卡，过滤出相同域名的id集合，建立分组

      const findTabs = noGroupTabs.filter((e) => getDomain(e.url) == domain);
      if (findTabs) {
        const tabIds: number[] = findTabs.map((e) => e.id as number);

        if (tabIds.length <= 1) return;

        const groupId: number = await chrome.tabs.group({ tabIds: [...tabIds, tab.id as number] }); // 组合标签页

        await chrome.tabGroups.update(groupId, { title: domain });
      }
    }
  } catch (error) {
    console.error("createMatchGroup()", error);
  }
};

/**
 * @description: 一键取消所有分组
 */
const cancelGroup = async () => {
  try {
    const groups = await chrome.tabGroups.query({});
    groups.forEach(async (group) => {
      const tabs: chrome.tabs.Tab[] = await chrome.tabs.query({
        groupId: group.id,
        currentWindow: true
      });
      const tabIds: number[] = tabs.map((t) => t.id as number);
      await chrome.tabs.ungroup(tabIds);
    });
  } catch (error) {
    console.error("cancelGroup()", error);
  }
};

/**
 * @description 找出最后一个符合条件的元素索引
 * @param array 数组
 * @param condition 条件
 * @returns index
 */
// 定义回调函数类型
const findLastIndex = <T>(
  array: T[],
  condition: (element: T, index: number, array: T[]) => boolean
): number => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (condition(array[i], i, array)) {
      return i;
    }
  }
  return -1;
};
