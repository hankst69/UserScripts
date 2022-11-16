// ==UserScript==
// @name        WebSite Media Download
// @namespace   savnt
// @description Adds a download button to the video player pages.
// @include     https://www.redbull.com/*
// @copyright   2019, savnt
// @license     MIT
// @version     0.1.2
// @grant       none
// @inject-into page
// ==/UserScript==

native = false;

function CodeToInject(chromeExensionScriptUrl){

  'use strict';
  
  function debug(message) {
    console.log("[Media Download] " + message);
  }
  
/*
  loadscript = function(variable, url, cb) {
    if (!(variable in window)) {
      debug("injecting script via loadscript with url:'" + url + "'");
      var script = document.createElement("script");
      script.src = url;
      script.onload = cb;
      document.head.insertBefore(script, document.head.lastChild);
    } else {
      cb();
    }
  };
  
  function addHls(hlsVersion) {
    var s = document.createElement('script');
    s.src = 
    s.onload = function() { playM3u8(window.location.href.split("#")[1]); };
    (document.head || document.documentElement).appendChild(s);
  }

*/

  function getAbsoluteUrl(url) {
    if (url) {
      if (url.toLowerCase().startsWith("http")) {
        return url;
      }
      var a = document.createElement('a');
      a.href = url;
      return a.href;
    }
    return null;
  }

  function getExtensionFromUrl(url) {
    if (url) {
      var extPos = url.lastIndexOf('.');
      var extStr = extPos < 0 ? 'blob' : url.substr(extPos+1);
      return extStr.toLowerCase();
    }
    return null;
  }

  function loadM3U8PlayListQualities(m3u8Url) {
    debug("loadM3U8PlayListQualities()");
    return [];
  }

  function analysePageAndCreateUi(showUiOpen)
  {
    debug("analysePageAndCreateUi()");

    // clean up old ui first
    deleteDownloadUi();
    
    // controller object in DOM and video element available?
    //if (window && document.querySelector('div.rbPlyr-container') && 'bitmovin' in window && 'player' in window.bitmovin ) 
    var player = null;
    if (!player && document.querySelector('div.rbPlyr-container') && window && 'rbPlyr_rbPlyrwrapper' in window) {
      player = window.rbPlyr_rbPlyrwrapper;     //RedBull
    }
    if (!player && document.querySelector('div.rbPlyr-container') && window && 'rbPlyr_rbunifiedplayer1' in window) {
      player = window.rbPlyr_rbunifiedplayer1;  //ServusTV
    }
    if (!player && document.querySelector('div.videoPlayerWrapper') && window && 'MyspassPlayer' in window) {
      player = window.MyspassPlayer;            //MySpass
    }
    if (!player && document.querySelector('.player video') && window && 'vimeo' in window) {
      player = window.vimeo;                    //vimeo
    }        

    if (!player) {
      // try again later
      debug("could not find player object, trying again later");
      setTimeout( function(){ analysePageAndCreateUi(false); }, 500 );
    }

    if (player)
    {
      debug("found proper media page with player object");
      // try to get video metadata
      try 
      {
        var jsonMediaList = {
          "mediaList": [/*{ 
            "title": "",
            "description": "",
            "qualities": [{
              "url": null,
              "type": "",
              "quality": "",
            }] 
          }*/]
        };
        
        // retrieve media info from active player properties -> this can break if players change
        if ('getVidInfo' in player) { 
          //RedBull
          var videoInfo = player.getVidInfo();
          var videoTitle = videoInfo.title;
          var videoSubTitle = videoInfo.subtitle;
          var videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
          var videoType = getExtensionFromUrl(videoUrl);
          var videoQuality = null;
          jsonMediaList.mediaList.push({
            "title": videoTitle,
            "description": videoSubTitle,
            "qualities": [{
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality
            }]
          });
        }

        if ('getVidMeta' in player) { 
          //ServusTV
          var videoInfo = player.getVidMeta();
          var videoTitle = videoInfo.title;
          var videoSubTitle = videoInfo.subtitle;
          var videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
          var videoType = getExtensionFromUrl(videoUrl);
          var videoQuality = null;
          jsonMediaList.mediaList.push({
            "title": videoTitle,
            "description": videoSubTitle,
            "qualities": [{
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality
            }]
          });
        }

        if ('videoMetadata' in player) { 
          //MySpass
          var videoInfo = player.videoMetadata;
          var videoTitle = videoInfo.title;
          var videoDesciption = videoInfo.description;
          var videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
          var videoType = getExtensionFromUrl(videoUrl);
          var videoQuality = null;
          jsonMediaList.mediaList.push({
            "title": videoTitle,
            "description": videoDesciption,
            "qualities": [{
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality
            }]
          });
        }

        if ('clips' in player) { 
          //vimeo
          var videoId = player.clip_page_config.clip.id;
          var videoInfo = player.clips[videoId];
          var videoTitle = videoInfo.video.title;
          var videoDescription = "";
          var entry = {
            "title": videoTitle,
            "description": videoDesciption,
            "qualities": []
          };
          // sort streams descending by video resolution (by comparison of 'width' property)
          var streams = videoInfo.request.files.progressive;
          streams.sort( (streamA,streamB) => {
              return streamB.width - streamA.width;
          });
          // iterate over video stream infos
          for (i=0; i<streams.length; i++) {
            var streamInfo = streams[i];
            var videoUrl = getAbsoluteUrl(streamInfo.url);
            var videoType = getExtensionFromUrl(videoUrl);
            var videoQuality = streamInfo.quality;
            entry.qualities.push({
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality
            });
          }
          jsonMediaList.mediaList.push(entry);
        }

        // remove invalid enries
        for (var i=jsonMediaList.mediaList.length; i>0; i--) {
          var entry = jsonMediaList.mediaList[i-1];
          for (var j=entry.qualities.length; j>0; j--) {
            if (entry.qualities[j-1].url == null) {
              delete entry.qualities[j-1];
            }
          }
          if (entry.qualities.length < 1) {
            delete jsonMediaList.mediaList[i-1];
          }
        }

        // validate mediaLisat and retry if necessary
        if (jsonMediaList.mediaList.length < 1) {
            // try again later
            debug("could not retrieve video download url from player, trying again later");
            setTimeout( function(){ analysePageAndCreateUi(false); }, 500 );
            return;
        }

        // resolve m3u8 playlists
        jsonMediaList.mediaList.forEach((entry) => {
          //var m3u8PlayLists;
          entry.qualities.forEach((quality) => {
            if (quality.type && quality.type.toLowerCase().startsWith("m3u8") && quality.quality == null) {
              //quality.quality = "m3u8-multi";
              var subQualities = loadM3U8PlayListQualities(quality.url);
              subQualities.forEach((subQuality) => {entry.qualities.push(subQuality)});
            }
          });
        });

        jsonMediaList.mediaList.forEach((entry) => {
          entry.qualities.forEach((quality) => {
            debug("Title       : '" + entry.title + "'");
            debug("Description : '" + entry.description + "'");
            debug("Url         : '" + quality.url + "'");
            debug("Type        : '" + quality.type + "'");
            debug("Quality     : '" + quality.quality + "'");
            debug("------------------------------");
          });
        });

/*
        var hlsVideoElement = document.getElementById('injected-hls-video');
        if (!hlsVideoElement) {
          hlsVideoElement = document.createElement("video");
          hlsVideoElement.id = "injected-hls-video";
          document.body.appendChild(hlsVideoElement);
        }
        
        loadscript("Hls", chromeExensionHlsUrl, function() {
          var hls = new Hls();
          hls.loadSource(videoUrl);
          //for (var i = 0; i < elements.length; i++) {
          //    hls.attachMedia(elements[i]);
          //}

          var tmpVideoElement = document.getElementById('injected-hls-video');
          hls.attachMedia(tmpVideoElement);
          hls.on(Hls.Events.MANIFEST_PARSED,function() {
            tmpVideoElement.play();
            // make download button
            //var button = makeButton( videoUrl, videoTitle, '' );
          });
        });
        
        var uiInjectionTimer = setInterval(function() {
          if (createDownloadUiAndAddUrls(showUiOpen, jsonMediaList)) {
            clearInterval(uiInjectionTimer);
          }
        }, 500 );
*/              
        // inject download ui
        for (var i=0; i<jsonMediaList.mediaList.length; i++) {
          var entry = jsonMediaList.mediaList[i];
          for (var j=0; j<entry.qualities.length; j++) {
            var quality = entry.qualities[j];
            createDownloadUiAndAddUrl(showUiOpen, quality.url, entry.title, entry.description, quality.type, quality.quality);
          }
        }
      }
      catch ( error )
      {
        // log the error
        console.error("[Media Download] Error retrieving video meta data:", error);
      }
    }
  }

  function deleteDownloadUi() {
    debug("deleteDownloadUi()");
    var el = document.getElementById("i2d-popup");
    if (el) {
      el.parentElement.removeChild(el);
    }
  }

  function createDownloadUiAndAddUrl(showUiOpen, fileUrl, fileTitle, subTitle, mediaType, quality)
  {
    debug("createDownloadUiAndAddUrl()");

    // make valid filename from title and url
    //var extPos = fileUrl.lastIndexOf('.');
    //var extStr = extPos < 0 ? '.dat' : fileUrl.substr(extPos);
    var fileName = fileTitle.replace( /[<>:"\/\\|?*,]/g, '' ) + '.' + mediaType;
    //fileName = fileName.replace(/ /g, '&nbsp'); //fileName = fileName.replace(/ /g, '_');
    
    var el = document.getElementById("i2d-popup");
    var elspan = document.getElementById("i2d-popup-x");
    var elspan1 = document.getElementById("i2d-popup-close");
    var eldiv = document.getElementById("i2d-popup-div");
    var eldivhold = document.getElementById("i2d-popup-div-holder");
    if (!el) {
      el = document.createElement("div");
      el.style.width = "max(60%, 100em)";
      el.style.height = "max(60%, 100em)";
      el.style.maxWidth = "100%";
      el.style.maxHeight = "100%";
      el.style.height = "auto";
      el.style.width = "auto";
      el.style.background = "#a0a0a0"; //"white";
      el.style.top = "100px";
      el.style.left = "0px";
      el.style.zIndex = Number.MAX_SAFE_INTEGER - 1;
      el.style.color = "black";
      el.style.fontFamily = "sans-serif";
      el.style.fontSize = "14px";
      el.style.lineHeight = "normal";
      el.style.textAlign = "left";
      //el.style.overflow = "scroll";
      el.style.position = "absolute";

      eldivhold = document.createElement("div");
      eldivhold.id = "i2d-popup-span-holder";
      eldivhold.style.width = "100%";
      eldivhold.style.display = "block";
      eldivhold.style.overflow = "auto";
      eldivhold.style.paddingBottom = "3px"; //".5em";
      eldivhold.style.paddingLeft = "5px";
      eldivhold.style.paddingRight = "5px";
      //eldivhold.style.margins = "5px 2px 5px 2px";

      elspan = document.createElement("span");
      elspan.style.fontSize = "110%";
      elspan.style.cursor = "pointer";
      elspan.style.color = "#900";
      elspan.style.padding = ".1em";
      elspan.style.float = "left";
      elspan.style.display = "inline";
      elspan.id = "i2d-popup-x";
      elspan.innerHTML = '[hide]';
      elspan.style.textDecoration = "underline";
      eldivhold.appendChild(elspan);

      elspan1 = document.createElement("span");
      elspan1.style.fontSize = "110%";
      elspan1.style.cursor = "pointer";
      elspan1.style.color = "#900";
      elspan1.style.paddingRight = "5px";
      elspan1.style.float = "right";
      elspan1.style.display = "inline";
      elspan1.style.textDecoration = "underline";
      elspan1.id = "i2d-popup-close";
      elspan1.innerHTML = '[x]' //'[close]';
      elspan1.onclick = () => { deleteDownloadUi(); };
      eldivhold.appendChild(elspan1);

      el.id = "i2d-popup";
      eldiv = document.createElement("div");
      eldiv.id = "i2d-popup-div";
      eldiv.style.display = "block";
      el.appendChild(eldiv);
      el.insertBefore(eldivhold, el.firstChild);
      document.documentElement.appendChild(el);

      if (showUiOpen) {
        // initially set to 'shown' state
        elspan.innerHTML = '[hide]';
        eldiv.style.display = "block";
        elspan1.style.display = "inline";
      } else {
        // initially set to 'hidden' state
        elspan.innerHTML = '[show]';
        eldiv.style.display = "none";
        elspan1.style.display = "none";
      }

      elspan.onclick = function() {
        //var eldiv = document.getElementById("i2d-popup-div");
        //var elspan = document.getElementById("i2d-popup-x");
        //var elspan1 = document.getElementById("i2d-popup-close");
        if (eldiv.style.display === "none") {
          elspan.innerHTML = '[hide]';
          eldiv.style.display = "block";
          elspan1.style.display = "inline";
        } else {
          elspan.innerHTML = '[show]';
          eldiv.style.display = "none";
          elspan1.style.display = "none";
        }
      };
    }

    // add download link:
    var el_divspan = document.createElement("span");
    el_divspan.innerHTML = "&nbsp;&nbsp;";
    eldiv.appendChild(el_divspan);

    var el_a = document.createElement("a");
    el_a.href = fileUrl;
    el_a.target = '_blank';
    el_a.download = fileName;
    if (quality) {
      el_a.title = "Download " + fileName + " (" + quality + ")";
      el_a.innerHTML = fileName + " (" + quality + ")";
    }
    else {
      el_a.title = "Download " + fileName;
      el_a.innerHTML = fileName;
    }
    el_a.style.color = "blue";
    el_a.style.textDecoration = "underline";
    el_a.style.cursor = "pointer";
    eldiv.appendChild(el_a);

    var el_divspan2 = document.createElement("span");
    el_divspan2.innerHTML = "&nbsp;&nbsp;";
    eldiv.appendChild(el_divspan2);
    
    var el_br = document.createElement("br");
    //el_br.style.all = "initial";
    eldiv.appendChild(el_br);

    var spanRefresh = document.createElement("span");
    spanRefresh.style.fontSize = "100%";
    spanRefresh.style.cursor = "pointer";
    spanRefresh.style.color = "#900";
    spanRefresh.style.float = "right";
    spanRefresh.style.display = "inline";
    spanRefresh.style.textDecoration = "underline";
    spanRefresh.style.paddingRight = "10px";
    spanRefresh.id = "i2d-popup-close";
    spanRefresh.innerHTML = '[refresh]';
    spanRefresh.onclick = () => { analysePageAndCreateUi(true); };
    eldiv.appendChild(spanRefresh);
    
    return el;
  }


  // start analysing immediately
  //analysePageAndCreateUi();
  
  // start analysing delayed
  window.onload = () => {
    debug("onload");
    analysePageAndCreateUi();
  };
}


(function(){
    // inject script into page in order to run in page context
    var chromeExensionScriptUrl = chrome.runtime.getURL('hls.0.12.4.js');
    var setupScriptCode = CodeToInject.toString();
    var script = document.createElement('script');
    script.textContent = '(' + setupScriptCode + ')("' + chromeExensionScriptUrl.toString() + '");';
    document.head.appendChild(script);
})();
