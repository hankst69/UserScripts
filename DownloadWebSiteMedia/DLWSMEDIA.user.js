// ==UserScript==
// @name        WebSite Media Download
// @namespace   savnt
// @description Adds a download button to the video player pages.
// @include     https://www.redbull.com/*
// @copyright   2019, savnt
// @license     MIT
// @version     0.1.0
// @grant       none
// @inject-into page
// ==/UserScript==

native = false;

function VideoDownload(chromeExensionScriptUrl){

    'use strict';
/*
    loadscript = function(variable, url, cb) {
        if (!(variable in window)) {
            console.log("[Video Download] injecting script via loadscript with url:'" + url + "'");
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

    function get_absolute_url(url) {
        var a = document.createElement('a');
        a.href = url;
        return a.href;
    }
*/
    function getExtensionFromUrl(url) {
        var extPos = url.lastIndexOf('.');
        var extStr = extPos < 0 ? 'blob' : url.substr(extPos+1);
        return extStr
    }


    // wait for player to be ready and set up periodic video check
    function setup()
    {
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
        if (player)
        {
            console.log("[Video Download] found poper player page");
            // try to get video metadata
            try 
            {
                var jsonMediaList = {
                  "mediaList": [/*{ 
                      "title": "",
                      "description": "",
                      "url": null
                      "type": "",
                      "quality": "",
                      "subQualities": [{
                        "url": null,
                        "type": "",
                        "quality": "",
                      }] 
                  }*/]
                };
                
                // retrieve active player properties
                // this can break if players change
                if ('getVidInfo' in player) { //RedBull
                  var videoInfo = player.getVidInfo();
                  var videoTitle = videoInfo.title;
                  var videoSubTitle = videoInfo.subtitle;
                  var videoUrl = videoInfo.videoUrl
                  var videoType = getExtensionFromUrl(videoUrl).toLowerCase();
                  var videoQuality = videoType.startsWith("m3u8") ? "multiple" : ""; 
                  jsonMediaList.mediaList.push({
                      "title": videoTitle,
                      "description": videoSubTitle,
                      "url": videoUrl,
                      "type": videoType,
                      "quality": videoQuality,
                    });
                }
                if ('getVidMeta' in player) { //ServusTV
                  var videoInfo = player.getVidMeta();
                  var videoTitle = videoInfo.title;
                  var videoSubTitle = videoInfo.subtitle;
                  var videoUrl = videoInfo.videoUrl
                  var videoType = getExtensionFromUrl(videoUrl).toLowerCase();
                  var videoQuality = videoType.startsWith("m3u8") ? "multiple" : ""; 
                  jsonMediaList.mediaList.push({
                      "title": videoTitle,
                      "description": videoSubTitle,
                      "url": videoUrl,
                      "type": videoType,
                      "quality": videoQuality,
                    });
                }
                if ('videoMetadata' in player) { //MySpass
                  var videoInfo = player.videoMetadata;
                  var videoTitle = videoInfo.title;
                  var videoDesciption = videoInfo.description;
                  var videoUrl = videoInfo.videoUrl
                  var videoType = getExtensionFromUrl(videoUrl).toLowerCase();
                  var videoQuality = videoType.startsWith("m3u8") ? "multiple" : ""; 
                  jsonMediaList.mediaList.push({
                      "title": videoTitle,
                      "description": videoDesciption,
                      "url": videoUrl,
                      "type": videoType,
                      "quality": videoQuality,
                    });
                }
                if ('clips' in player) { //vimeo
                  var videoId = player.clip_page_config.clip.id;
                  var videoInfo = player.clips[videoId];
                  var streams = videoInfo.request.files.progressive;
                  // sort streams descending by video resolution (by comparison of 'width' property)
                  streams.sort( (streamA,streamB) => {
                      return streamB.width - streamA.width;
                  });
                  // get video file info
                  for (i=0; i<streams.length; i++) {
                    var fileInfo = streams[i];
                    var videoTitle = videoInfo.video.title;
                    var videoDescription = "";
                    var videoUrl = fileInfo.url;
                    var videoType = getExtensionFromUrl(videoUrl).toLowerCase();
                    var videoQuality = fileInfo.quality;
                    jsonMediaList.mediaList.push({
                        "title": videoTitle,
                        "description": videoDesciption,
                        "url": videoUrl,
                        "type": videoType,
                        "quality": videoQuality,
                      });
                  }
                }

                // remove invalid enries
                for (var i=jsonMediaList.mediaList.length; i>0; i--) {
                  if (jsonMediaList.mediaList[i-1].url == null) {
                    delete jsonMediaList.mediaList[i-1];
                  } 
                }
                
                if (jsonMediaList.mediaList.length < 1) {
                    // try again later
                    console.log("[Video Download] could not retrieve video download url from player, trying again later");
                    setTimeout( setup, 500 );
                    return;
                }

                jsonMediaList.mediaList.forEach((entry) => {
                  console.log("[Video Download] Title       : '" + entry.title + "'");
                  console.log("[Video Download] Description : '" + entry.description + "'");
                  console.log("[Video Download] Url         : '" + entry.url + "'");
                  console.log("[Video Download] Quality     : '" + entry.quality + "'");
                  console.log("------------------------------");
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
                    if (createDownloadUiAndAddUrls(jsonMediaList)) {
                      clearInterval(uiInjectionTimer);
                    }
                }, 500 );
*/              
                // inject download ui
                for (var i=0; i<jsonMediaList.mediaList.length; i++) {
                		var entry = jsonMediaList.mediaList[i];
                    createDownloadUiAndAddUrl(entry.url, entry.title, entry.description, entry.type, entry.quality);
                }
            }
            catch ( error )
            {
                // log the error
                console.error( "[Video Download] Error retrieving video meta data:", error );
            }
        }
        else
        {
            // try again later
            setTimeout( setup, 500 );
        }
    }

    // create download button
    function createDownloadUiAndAddUrl(fileUrl, fileTitle, subTitle, mediaType, quality)
    {
        console.log("[Video Download] createDownloadUiAndAddUrl");

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
            elspan1.style.fontSize = "130%";
            elspan1.style.cursor = "pointer";
            elspan1.style.color = "#900";
            elspan1.style.paddingRight = "10px";
            //elspan1.style.padding = ".1em";
            elspan1.style.float = "right";
            elspan1.style.display = "inline";
            elspan1.id = "i2d-popup-close";
            elspan1.innerHTML = 'x' //'[close]';
            elspan1.style.textDecoration = "underline";
            eldivhold.appendChild(elspan1);

            //el.innerHTML = "<br style='line-height:150%' />";
            el.id = "i2d-popup";
            eldiv = document.createElement("div");
            eldiv.id = "i2d-popup-div";
            //eldiv.style.display = "none";
            eldiv.style.display = "block";
            el.appendChild(eldiv);
            el.insertBefore(eldivhold, el.firstChild);
            document.documentElement.appendChild(el);

            elspan.onclick = function() {
                var eldiv = document.getElementById("i2d-popup-div");
                var elspan = document.getElementById("i2d-popup-x");
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

            elspan1.onclick = function() {
                var el = document.getElementById("i2d-popup");
                el.parentElement.removeChild(el);
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
        
        return el;
    }

    // start looking for video player
    setup();
}

(function(){
    // inject script into page in order to run in page context
    var chromeExensionScriptUrl = chrome.runtime.getURL('hls.0.12.4.js');
    var setupScriptCode = VideoDownload.toString();
    var script = document.createElement('script');
    script.textContent = '(' + setupScriptCode + ')("' + chromeExensionScriptUrl.toString() + '");';
    document.head.appendChild(script);
})();
