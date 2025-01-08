/**
 * Video Player MPD/M3U8/M3U/EPG
 *
 * @author Sharkiller
 * @license Video Player MPD/M3U8/M3U/EPG © 2023 by Sharkiller is licensed under CC BY-NC-ND 4.0.
 * To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-nd/4.0/
 */
"undefined"==typeof m3u&&(m3u={}),chrome.runtime.id!==atob("b3BtZW9wY2FtYmhmaW1mZmJvbWpnZW1laGprYmJtamk")&&(document.querySelector(".version.warning").style.display="block"),document.querySelector("a.extension_setting").addEventListener("click",e=>{e.preventDefault(),chrome.runtime.sendMessage({cmd:"openExtensionSetting"})}),document.querySelector(".button.changelog").addEventListener("click",e=>{e.preventDefault(),document.querySelector("article.changelog.credits").style.display="none",document.querySelector("article.changelog.full-log").style.display="block"}),document.querySelector(".button.credits").addEventListener("click",e=>{e.preventDefault(),document.querySelector("article.changelog.full-log").style.display="none",document.querySelector("article.changelog.credits").style.display="block"});