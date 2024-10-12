var currentTab;
var convertedTabs = new Set();

function updateIcon() {
    chrome.browserAction.setIcon({
	path: convertedTabs.has(currentTab) ? {
	    19: "icons/measuring-cup-pressed-19.png",
	    38: "icons/measuring-cup-pressed-38.png"
	} : {
	    19: "icons/measuring-cup-19.png",
	    38: "icons/measuring-cup-38.png"
	},
	tabId: currentTab
    });
}

function toggleConversion() {
    if (convertedTabs.has(currentTab)) {
	chrome.tabs.reload(currentTab);
	convertedTabs.delete(currentTab);
    } else {
	chrome.tabs.executeScript(null, {file: "metric-cooking.js"});
	convertedTabs.add(currentTab)
    }
    updateIcon();
}

function updateTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	if (tabs[0]) {
	    currentTab = tabs[0].id;
	    updateIcon();
	}
    });
}

chrome.tabs.onUpdated.addListener(updateTab);
chrome.tabs.onActivated.addListener(updateTab);

chrome.browserAction.onClicked.addListener(function(tab) {
    toggleConversion();
});
