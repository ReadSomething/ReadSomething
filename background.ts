// @ts-ignore
import ReadMode from "~content";

chrome.action.onClicked.addListener(async(tab) => {
   await chrome.tabs.sendMessage(tab.id, {greeting: "hello"});
})

