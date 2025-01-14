var enabled = true;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
      if (request == "getState") {
        sendResponse(enabled);
      } else {
        enabled = request == "Enable";
        enabled ? chrome.browserAction.setIcon({ path: "./DLWSMEDIA.png" }) : chrome.browserAction.setIcon({ path: "./DLWSMEDIAgrey.png" })
        // persist enabled state:
        enabled ? chrome.storage.local.set({ 'Enabled': true }) : chrome.storage.local.set({ 'Enabled': false });
      }
    }
);

chrome.webRequest.onBeforeRequest.addListener(
  function (info) {
    let isForPlayer = enabled && (
      false
		//|| info.url.split("?")[0].split("#")[0].endsWith(".m3u8")
    //|| info.url.split("?")[0].split("#")[0].endsWith(".mpd")
    )
    if (enabled && isForPlayer) {
      var playerUrl = chrome.runtime.getURL('player.html') + "#" + info.url.replace(".mpd",".m3u8")
      if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        chrome.tabs.update(info.tabId, { url: playerUrl });
        return { cancel: true }
      } else {
        return { redirectUrl: playerUrl }
      }
    }
  },
  //{ urls: ["*://*/*.m3u8*"], types: ["main_frame"] },
  { urls: ["*://*/*.m3u8*", "file:///*.m3u8*", "*://*/*.mpd*", "file:///*.mpd*"], types: ["main_frame"] },
  ["blocking"]
);

chrome.omnibox.onInputEntered.addListener(function (input) {
  var playerUrl = chrome.runtime.getURL('player.html') + "#" + input;
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    chrome.tabs.update(tabs[0].id, { url: playerUrl });
  });
});


// *** persitance of settings ***
// defining  inital values 'On install':
chrome.runtime.onInstalled.addListener(function(){
	chrome.storage.local.set({'Enabled': true});
	loadSettings();
});
// loading values on script start
function loadSettings() {
  chrome.storage.local.get({'Enabled': true}, function(result) {
    enabled = result.Enabled;
  });
}
loadSettings();
