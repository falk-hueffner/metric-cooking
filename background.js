const convertedTabs = new Set();

function setTabIcon(tabId, pressed) {
    const suffix = pressed ? '-pressed' : '';
    chrome.action?.setIcon?.({
        tabId,
        path: {
            19: `icons/measuring-cup${suffix}-19.png`,
            38: `icons/measuring-cup${suffix}-38.png`,
        },
    });
}

chrome.action.onClicked.addListener(async tab => {
    if (!tab?.id) {
        return;
    }

    if (!convertedTabs.has(tab.id)) {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['metric-cooking.js'],
        });
        convertedTabs.add(tab.id);
        await setTabIcon(tab.id, true);
    } else {
        await chrome.tabs.reload(tab.id);
        convertedTabs.delete(tab.id);
        await setTabIcon(tab.id, false);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        convertedTabs.delete(tabId);
        setTabIcon(tabId, false);
    }
});

chrome.tabs.onRemoved.addListener(tabId => convertedTabs.delete(tabId));
