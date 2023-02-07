// @ts-ignore
import ReadMode from "~content";
import type { PlasmoMessaging } from "@plasmohq/messaging"

chrome.action.onClicked.addListener(async(tab) => {
   await chrome.tabs.sendMessage(tab.id, {greeting: "hello"});
})

