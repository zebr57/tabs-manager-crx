export interface GroupType {
  url: string
  groupId: number
  children: chrome.tabs.Tab[]
}