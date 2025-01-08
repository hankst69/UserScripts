/**
 * Video Player MPD/M3U8/M3U/EPG
 *
 * @author Sharkiller
 * @license Video Player MPD/M3U8/M3U/EPG © 2023 by Sharkiller is licensed under CC BY-NC-ND 4.0.
 * To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-nd/4.0/
 */
"undefined"==typeof m3u&&(m3u={}),class{static replace(e,t){var r=t.replace(/__MSG_(\w+)__/g,(e,t)=>{if(t){let e=chrome.i18n.getMessage(t);return e=0===e.length?t:e}return""});r!==t&&(e.innerHTML=r)}static translate(){let e,t;var r,a=document.querySelectorAll("[data-localize]");for(r in a)a.hasOwnProperty(r)&&(e=a[r],t=e.getAttribute("data-localize").toString(),this.replace(e,t));var n=document.querySelector("body");t=n.innerHTML.toString(),this.replace(n,t)}}.translate(),chrome.runtime.id!==atob("b3BtZW9wY2FtYmhmaW1mZmJvbWpnZW1laGprYmJtamk")&&(document.querySelector(".version.warning").style.display="block");