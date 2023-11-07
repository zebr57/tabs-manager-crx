import { GroupType } from "./type";

const urlRegex = /\/\/(www\.)?([^/]+)/;
let tabsList: chrome.tabs.Tab[] = [];
let groupObj: { [key: string]: any } = {}; // 分组集合
let urlArr: string[] = [];
let groupTree: GroupType[] = [];
let tabList: chrome.tabs.Tab[] = [];

const initData = async () => {
  groupObj = {}; // 分组集合重置
  urlArr = []; // key数组重置
  tabsList = await chrome.tabs.query({ currentWindow: true }); // 最新所有选项卡
  tabsList.forEach((tab: chrome.tabs.Tab) => {
    if (tab.url) {
      const url = getDomain(tab.url);
      if (url) {
        urlArr.push(url);
      }
    }
  });
  // 去重（域名作为唯一key）
  urlArr = Array.from(new Set(urlArr));
  // 按域名分组
  for (const tab of tabsList) {
    if (tab.url) {
      const url = getDomain(tab.url);

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

  groupTree = [];

  for (const e of Object.entries(groupObj)) {
    const key = e[0];
    const value = e[1];
    if (value.length > 1) {
      groupTree.push({
        url: key,
        groupId: -2,
        children: value,
      });
    }
  }
  console.log("当前窗口所有标签页：", tabsList);
  console.log("存在同域名可生成分组：", groupTree);
};
initData();

// 根据同域名自动分组
const autoGroup = async () => {
  await initData();
  if (groupTree && groupTree.length > 0) {
    for (const item of groupTree) {
      const tabIds = item.children.map(({ id }: chrome.tabs.Tab) => id) as number[];
      const groupId: number = await chrome.tabs.group({ tabIds }); // 组合标签页
      item.groupId = groupId;
      const title = getDomain(item.url);
      await chrome.tabGroups.update(groupId, { title });
    }
  } else {
    console.log("当前不存在相同域名的标签页");
  }
};
/* ===================================== 监听行为 start ===================================== */
let activeTab: chrome.tabs.Tab | null = null;
// 添加tabs.onActivated事件监听器(切换标签页)
chrome.tabs.onActivated.addListener(function (activeInfo) {
  const tabId = activeInfo.tabId;

  // 获取当前选项卡的信息
  chrome.tabs.get(tabId, function (tab) {
    console.log("当前选项卡信息:", tab);
    // const currentUrl = new URL(tab.url as string);
    // const subdomain = currentUrl.hostname.split(".").slice(0, -2).join(".");
    // console.log("当前标签页的子域名：", subdomain);
    activeTab = tab;
  });
});

// 添加tabs.onCreated事件(新建标签页)
chrome.tabs.onCreated.addListener(function (tab: chrome.tabs.Tab) {
  console.log(tab);
});
// 监听popup.js按钮点击事件
chrome.runtime.onMessage.addListener(async (request) => {
  console.log(request, activeTab);
  const { action, tab, isLast } = request;
  if (tab) {
    tabList.push(tab);
    const tabIds: number[] = tabList.map(({ id }: chrome.tabs.Tab) => id as number);
    chrome.tabs.group({ tabIds }, function () {
      console.log("create group success!!");
      if (isLast) {
        tabList = [];
        chrome.tabs.update(tab.id, { active: true });
      }
    }); // 组合标签页
  } else if (action == "autoGroup") {
    await autoGroup();
  }
  if (!activeTab) return;
  const groupId = activeTab.groupId;
  if (groupId != -1) {
    // Todo：到时候改为快捷键方式
    const groupTabs: chrome.tabs.Tab[] = await chrome.tabs.query({ groupId: groupId });
    const tabIds: number[] = groupTabs.map((t) => t.id as number);
    switch (action) {
      case "cancelGroup":
        // 取消组合（解散选项卡组）
        await chrome.tabs.ungroup(tabIds);
        break;
      case "closeGroup":
        // 关闭组合（关闭选项卡组）
        await chrome.tabs.remove(tabIds);
        break;
      default:
        break;
    }
  } else {
    // chrome.tabs.create({ url: "chrome-extension://pgapimkopipddcbfnmbebbnfhbkmpjoe/popup/popup.html" });
    console.log("当前页面没有分组");
  }
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // 当地址栏URL变化时执行处理逻辑
  if (changeInfo.url) {
    console.log("地址栏URL变化：", tabId, changeInfo.url, tab);
    // 在此处进行其他操作
    chrome.storage.sync.get(["isAuto"], async function (result) {
      // 1. 是否开启
      if (!result.isAuto) return;
      // 2. 获取新建选项卡信息，进行匹配创建分组
      chrome.tabs.get(tabId, function (tab) {
        createMatchGroup(tab);
      });
    });
  }
});
/* ===================================== 监听行为 end ===================================== */

// 获取所有书签
chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
  // 处理书签信息
  console.log(bookmarkTreeNodes);
  
  // for (const node of bookmarkTreeNodes) {
  //   processBookmarkNode(node);
  // }
});

// 处理书签节点
// function processBookmarkNode(node) {
//   if (node.children) {
//     // 这是一个文件夹，递归处理其子节点
//     for (const childNode of node.children) {
//       processBookmarkNode(childNode);
//     }
//   } else {
//     // 这是一个书签，打印其信息
//     console.log("书签名称: " + node.title);
//     console.log("书签URL: " + node.url);
//   }
// }

/* ===================================== utils ===================================== */

// 获取域名
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
// 找出存在两个及以上标签页生成分组
const createMatchGroup = async (tab: chrome.tabs.Tab) => {
  await initData();
  console.log("groupTree", groupTree);

  if (tab.url) {
    const domain = getDomain(tab.url);
    console.log("新打开标签域名：", domain);

    if (!domain) return; // 不是正确域名，终止操作
    // 这里有个问题有些网站是http://wwww.ex.com 跳转 https://wwww.ex.com，导致创建不了分组。
    // 解决：改变匹配正则，只匹配域名

    const group: GroupType | undefined = groupTree.find((e) => e.url == domain);
    console.log(group, "group");

    if (group && group.children.length >= 3) {
      chrome.tabGroups.query({}, (groups) => {
        const group = groups.find((e) => e.title == domain);
        chrome.tabs.group({ tabIds: tab.id, groupId: group?.id });
      });
    } else {
      // 没有符合的分组，需要判断有没有存在相同域名且不在分组中的选项卡，有则生成
      const noGroupTabs = await chrome.tabs.query({ currentWindow: true, groupId: -1 });
      console.log("未分组选项卡：", noGroupTabs);
      // 查询所有未分组的选项卡，过滤出相同域名的id集合，建立分组
      const findTabs = noGroupTabs.filter((e) => e.url?.indexOf(domain) != -1);
      if (findTabs) {
        const tabIds: number[] = findTabs.map((e) => e.id as number);

        if (tabIds.length <= 1) return;

        const groupId: number = await chrome.tabs.group({ tabIds }); // 组合标签页
        const title = getDomain(tab.url);
        await chrome.tabGroups.update(groupId, { title });
      }
    }
  } else {
    console.warn("新打开选项卡url：", tab.url);
  }
};

// const setGroup = (tab: chrome.tabs.Tab) => {
//   // 1. 获取当前所有分组信息
//   // chrome.tabGroups.get()
//   // 2. 查找对应分组
//   // 3. 将标签页添加进去
// };
