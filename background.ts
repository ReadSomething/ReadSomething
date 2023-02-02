// @ts-ignore
import ReadMode from "~contents";

chrome.action.onClicked.addListener(async(tab) => {
   await chrome.tabs.sendMessage(tab.id, {greeting: "hello"});
})

