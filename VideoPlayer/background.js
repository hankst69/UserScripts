/**
 * Video Player MPD/M3U8/M3U/EPG
 *
 * @author Sharkiller
 * @license Video Player MPD/M3U8/M3U/EPG © 2023 by Sharkiller is licensed under CC BY-NC-ND 4.0.
 * To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-nd/4.0/
 */
const r=()=>{
	chrome.storage.local.set({enabled:!1}),
	chrome.action.setIcon({path:"play-off.png"}),
	chrome.action.setTitle({title:chrome.i18n.getMessage("extension_name")+"\n"+chrome.i18n.getMessage("extension_off")}),
	chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[1,2,3]}),
	chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[1]})},
	
	o=()=>{
		chrome.storage.local.set({enabled:!0}),
		chrome.action.setIcon({path:"play-on.png"}),
		chrome.action.setTitle({title:chrome.i18n.getMessage("extension_name")+"\n"+chrome.i18n.getMessage("extension_on")}),
		t()
	},
	
	t=()=>{
		chrome.declarativeNetRequest.updateDynamicRules({
			removeRuleIds:[1,2,3],
			addRules:[
				{id:1,priority:1,action:{type:chrome.declarativeNetRequest.RuleActionType.REDIRECT,redirect:{regexSubstitution:chrome.runtime.getURL("iptv/player.html")+"#\\0"}},condition:{regexFilter:"^.*\\.m3u(?:\\?|$)",resourceTypes:[chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]}},
				{id:2,priority:2,action:{type:chrome.declarativeNetRequest.RuleActionType.REDIRECT,redirect:{regexSubstitution:chrome.runtime.getURL("pages/player.html")+"#\\0"}},condition:{regexFilter:"^.*\\.(mpd|m3u8)(?:\\?|$)",resourceTypes:[chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]}},
				{id:3,priority:3,action:{type:chrome.declarativeNetRequest.RuleActionType.REDIRECT,redirect:{regexSubstitution:chrome.runtime.getURL("iptv/player.html")+"#\\0"}},condition:{regexFilter:"^.*\\.m3u(?:\\?|$)",excludedInitiatorDomains:[chrome.runtime.id],resourceTypes:[chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST]}}
			]
		})
	},
	
	c=async(e,t,a)=>{
		var r={
			type:chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,responseHeaders:[
				{operation:chrome.declarativeNetRequest.HeaderOperation.SET,header:"access-control-allow-methods",value:"GET, OPTIONS"},
				{operation:chrome.declarativeNetRequest.HeaderOperation.SET,header:"access-control-allow-origin",value:"*"}
			]};
		!1!==e&&(r.requestHeaders=e),
		await chrome.declarativeNetRequest.updateSessionRules({
			removeRuleIds:[t],
			addRules:[{id:t,priority:1,action:r,condition:{resourceTypes:[chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],tabIds:[t]}}]},a)
	},
	
	a=()=>{
		chrome.storage.local.set({
			firstRun:!0,
			enabled:!0,
			autoLowLatency:!0,
			audioLang:"en",
			epgEnabled:!0,
			compressorEnabled:!1,
			customWV:!1,
			customWV_data:"domain1.com>https://example1.com/widevine\ndomain2.com>https://example2.com/widevine",
			customCK:!1,
			customCK_data:{
				"11223344556677889900aabbccddeeff":"11223344556677889900aabbccddeeff",
				"223344556677889900aabbccddeeff11":"223344556677889900aabbccddeeff11",
				"3344556677889900aabbccddeeff1122":"3344556677889900aabbccddeeff1122"
			}
		},
		e=>{})
	};
	
	chrome.runtime.onMessage.addListener((e,t,a)=>{
		switch(e.cmd){
			case"setEnabled":(!1===e.enabled?r:o)();break;
			case"updateHeadersRules":return(async()=>{await c(e.requestHeaders,t.tab.id,a)})(),!0;
			case"openExtensionSetting":chrome.tabs.create({url:"chrome://extensions/?id="+chrome.runtime.id})
		}
	}),
	
	chrome.runtime.onStartup.addListener(()=>{
		chrome.storage.local.get("enabled",e=>{!1===e.enabled&&r()})
	}),
	
	chrome.runtime.onInstalled.addListener(({reason:e})=>{
		switch(e){
			case chrome.runtime.OnInstalledReason.INSTALL:
				chrome.storage.local.get("firstRun",e=>{!0!==e.firstRun&&(a(),t())}),
				chrome.tabs.create({url:"pages/welcome.html"});
				break;
			case chrome.runtime.OnInstalledReason.UPDATE:
				chrome.storage.local.get("enabled",e=>{(!1===e.enabled?r:t)()}),
				chrome.tabs.create({url:"pages/changelog.html"})
		}
	});