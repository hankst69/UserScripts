var enabled = true;

/*On install*/
chrome.runtime.onInstalled.addListener(function(){
	chrome.storage.local.set({'Enabled': true});
	loadSettings();
});

function loadSettings() {
  chrome.storage.local.get({'Enabled': true}, function(result) {
    enabled = result.Enabled;
  });
}

loadSettings();

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){ 
      if (request == "getState") {
        sendResponse(enabled);
      } else {
        enabled = request == "Enable";
        if (enabled) {
          chrome.browserAction.setIcon({path:"./DLWSMEDIA.png"});
        	chrome.storage.local.set({'Enabled': false});
         } else {
          chrome.browserAction.setIcon({path:"./DLWSMEDIAgrey.png"});
        	chrome.storage.local.set({'Enabled': false});
        }
      }
    }
);

chrome.webRequest.onBeforeRequest.addListener(	
  function(info) {
  	//alert("[M3U8Playback] onBeforeRequest");
    if (enabled && info.url.split("?")[0].split("#")[0].toLowerCase().endsWith(".m3u8")) {
    	//alert("[M3U8Playback] valid m3u8 url: '" + info.url + "'");
      var playerUrl = chrome.runtime.getURL('player.html') + "#" + info.url
      if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
        chrome.tabs.update(info.tabId, {url: playerUrl});
        return {cancel: true}
      } else {
        return { redirectUrl:  playerUrl }
      }
    } 
    //else {
    //	alert("[M3U8Playback] not a m3u8 url: '" + info.url + "'");
    //}
  },
  //{urls: ["*://*/*.m3u8*"], types:["main_frame"]},
  //{urls: ["<all_urls>"], types:["main_frame"]},
  {urls: ["*://*/*.m3u8*", "file:///*.m3u8*"], types:["main_frame"]},
  ["blocking"]
);

chrome.omnibox.onInputEntered.addListener(function (input){
    var playerUrl = chrome.runtime.getURL('player.html') + "#" + input;
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      chrome.tabs.update(tabs[0].id, {url: playerUrl});
    });
});
