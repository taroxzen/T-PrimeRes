/* T-PrimeRes background — keeps the pinned toolbar badge in sync. */

function badgeStyle(height) {
  if (!height) return { text: "", color: "#000000", title: "T-PrimeRes — çözünürlük bekleniyor" };
  if (height >= 2160) return { text: "4K", color: "#4A9E5C", title: "T-PrimeRes — 4K UHD" };
  if (height >= 1440) return { text: "2K", color: "#000000", title: "T-PrimeRes — 2K QHD" };
  if (height >= 1080) return { text: "1080", color: "#000000", title: "T-PrimeRes — Full HD" };
  if (height >= 720) return { text: "720", color: "#000000", title: "T-PrimeRes — HD" };
  return { text: "SD", color: "#D4A843", title: "T-PrimeRes — düşük çözünürlük" };
}

function applyBadge(tabId, height) {
  var style = badgeStyle(height);
  chrome.action.setBadgeText({ text: style.text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: style.color, tabId: tabId });
  chrome.action.setTitle({ title: style.title, tabId: tabId });
}

chrome.runtime.onMessage.addListener(function (message, sender) {
  if (message && message.type === "RESOLUTION_UPDATE" && sender.tab && sender.tab.id !== undefined) {
    applyBadge(sender.tab.id, message.height);
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  try { chrome.action.setBadgeText({ text: "", tabId: tabId }); } catch (e) {}
});

chrome.runtime.onInstalled.addListener(function () {
  console.log("[T-PrimeRes] installed");
});
