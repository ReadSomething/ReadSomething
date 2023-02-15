export const i18n = function (key: string) {
    console.log('chrome.i18n.getMessage(key)', chrome.i18n.getMessage(key))
    console.log( chrome.i18n.getUILanguage())
    return chrome.i18n.getMessage(key)
}
