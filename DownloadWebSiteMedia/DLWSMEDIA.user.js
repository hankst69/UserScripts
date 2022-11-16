// ==UserScript==
// @name        WebSite Media Download
// @namespace   savnt
// @description Adds a download button to the video player pages.
// @include     https://www.redbull.com/*
// @copyright   2019, savnt
// @license     MIT
// @version     0.1.9
// @grant       none
// @inject-into page
// ==/UserScript==

function CodeToInject(chromeExtensionScriptUrl) {
  'use strict';
  
  var muxjsVersion = 'mux.js'; //"mux-min.js";
  
  function debug(message) {
    console.log("[Media Download] " + message);
  }
  
  function loadScript(variable, url, cb) {
    if (!(variable in window)) {
      debug("injecting script via loadScript with url:'" + url + "'");
      var script = document.createElement("script");
      script.src = url;
      script.onload = cb;
      (document.head || document.documentElement).appendChild(script);
      //document.head.insertBefore(script, document.head.lastChild);
    } else {
      cb();
    }
  };

  function createXHR(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
      // XHR for Chrome/Firefox/Opera/Safari.
      xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
      // XDomainRequest for IE.
      xhr = new XDomainRequest();
      xhr.open(method, url);
    } else {
      // XHR not supported.
      xhr = null;
    }
    return xhr;
  }
  
  function loadWebResourceAsync(url) {
    // might be necessary to enable CORS (in chrome by patching request/response headers)
    // for following url patterns:
    //   *://*/*
    //   https://rbmn-live.akamaized.net/*
    return new Promise((resolve, reject) => {
      var xhr = createXHR('GET', url);
      if (!xhr) {
        reject('XHR not supported');
        return;
      }
      //xhr.setRequestHeader('Content-Type', 'application/xml');
      //xhr.setRequestHeader('Content-Type', 'application/json');
      //xhr.setRequestHeader('Content-Type', 'application/' + type);
      //xhr.overrideMimeType('text/xml');
      //xhr.setRequestHeader('Content-Type', 'text/xml');
      xhr.setRequestHeader('Content-Type', 'text/plain');
          
      xhr.onloadstart = function() {
        //alert("load started");
      }
      xhr.onload = function() {
        //alert("load finished");
        var data = xhr.responseText;
        resolve(data);
      }
      xhr.onerror = function() {
        //alert("load failed");
        reject('CORS request failed : ' + xhr.statusText);
      }
      xhr.send();
    })
  }

  function getAbsoluteUrl(url) {
    if (url) {
      if (url.toLowerCase().startsWith("http")) {
        return url;
      }
      if (url.toLowerCase().startsWith("blob")) {
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
      var qustnmrkPos = extStr.indexOf('?');
      if (qustnmrkPos > 0) {
        extStr = extStr.substr(0, qustnmrkPos);
      }
      if (extStr.length > 4) {
        extStr = extStr.substr(0, 4);
      }
      return extStr.toLowerCase();
    }
    return null;
  }

  async function loadM3U8PlayListQualities(m3u8Url) {
    debug("loadM3U8PlayListQualities()");
    var m3u8PlayList = await loadWebResourceAsync(m3u8Url);
    //debug(m3u8PlayList);
    //parse:
    // #EXT-X-STREAM-INF:BANDWIDTH=7556940,AVERAGE-BANDWIDTH=5745432,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
    // https://dms.redbull.tv/dms/media/AP-1XCY6DVFN1W11/1920x1080@7556940/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjYXRlZ29yeSI6InBlcnNvbmFsX2NvbXB1dGVyIiwib3NfZmFtaWx5IjoiaHR0cCIsIm9zX3ZlcnNpb24iOiIiLCJ1aWQiOiIwMmRjMzc1Mi01NjA4LTQ3YWMtOGY3Mi1hNmUwZDE5ZTI3MWYiLCJsYXRpdHVkZSI6MC4wLCJsb25ndGl0dWRlIjowLjAsImNvdW50cnlfaXNvIjoiZGUiLCJhZGRyZXNzIjoiMjAwMzplYTo5NzI4OjIwMDA6YjQ2MDpkZGZhOjJiODg6M2QwMCIsInVzZXItYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzQuMC4zNzI5LjE1NyBTYWZhcmkvNTM3LjM2IiwiZGV2aWNlX3R5cGUiOiIiLCJkZXZpY2VfaWQiOiIiLCJpYXQiOjE1NTgwNDQ3NTJ9.sTG_v7V_mGR2DMsvjVC10fOmvpfJR3T4h78Y5VaFa-w=/playlist.m3u8
    //or:
    // #EXT-X-STREAM-INF:BANDWIDTH=1838389,AVERAGE-BANDWIDTH=1461672,RESOLUTION=960x540,CODECS="mp4a.40.2,avc1.4d001f"
    // AA-1Z4QM5U2W1W12_FO-1Z6B52KKN5N11.m3u8
    var qualities = [];
    var m3u8Lines = m3u8PlayList.split('#');
    m3u8Lines.forEach((line) => {
      //debug(line);
      var trimedLine = line.trim();
      if (trimedLine.toUpperCase().startsWith('EXT-X-STREAM-INF:')) {
        var subLines = trimedLine.substr('EXT-X-STREAM-INF:'.length).split('\n');
        if (subLines.length > 1) {
          var params = subLines[0].split(',');
          var url = subLines[1].trim();
          var resolution = null;
          params.forEach((param) => {
            if (param.trim().toUpperCase().startsWith('RESOLUTION=')) {
              resolution = param.trim().substr('RESOLUTION='.length);
            }
          });
          // complement url if necessary
          if (url && !(url.toLowerCase().startsWith('http'))) {
            var lastSlashPos = m3u8Url.lastIndexOf('/');
            if (lastSlashPos > 0) {
              var baseUrl = m3u8Url.substr(0,lastSlashPos);
              var needSlash = !url.startsWith('/');
              url = baseUrl + (needSlash ? '/' : '') + url;
            }
          }
          // extract videoHeight from resolutuion parameter
          var videoHeight = 0;
          if (resolution.toLowerCase().indexOf('x') >= 0) {
            var widthHeight = resolution.split('x');
            videoHeight = widthHeight.pop();
          }
          var quality = {
            "url": url,
            "type": getExtensionFromUrl(url),
            "quality": videoHeight,
            "adfree": false,
            "content": ""
          };
          qualities.push(quality);
        }
      }
    });
    qualities.sort((streamA,streamB) => {
        return streamB.quality - streamA.quality;
    });
    return qualities;
  }


  async function createAdFreeVodPlayListAsync(m3u8Url, quality) {
    debug("createAdFreeVodPlayListAsync()");
    var m3u8PlayList = await loadWebResourceAsync(m3u8Url);
    //parse:
    // #EXT-X-PLAYLIST-TYPE:VOD
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/0.ts
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/1.ts
    //
    //#EXTINF:2.240,
    //https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/486.ts
    //#EXT-X-DISCONTINUITY
    //#EXTINF:3.000,
    //https://cs5.rbmbtnx.net/v1/GAMS/s/1/ST/8N/Z5/QH/21/11/0.ts
    //#EXT-X-DISCONTINUITY
    //#EXTINF:3.000,
    //https://cs.rbmbtnx.net/v1/GAMS/s/1/YX/HB/1S/YW/5N/11/0.ts
    //#EXTINF:3.000,
    //https://cs.rbmbtnx.net/v1/GAMS/s/1/YX/HB/1S/YW/5N/11/1.ts
    //#EXTINF:3.000,
    //...
    //#EXTINF:2.000,
    //https://cs.rbmbtnx.net/v1/GAMS/s/1/YX/HB/1S/YW/5N/11/15.ts
    //#EXT-X-DISCONTINUITY
    //#EXTINF:3.000,
    //https://cs2.rbmbtnx.net/v1/GAMS/s/1/SV/5P/JV/F1/1W/11/0.ts
    //#EXT-X-DISCONTINUITY
    //#EXTINF:0.760,
    //https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/487.ts
    if (m3u8PlayList.toUpperCase().indexOf('#EXT-X-PLAYLIST-TYPE:VOD') < 0) {
      return null;
    }
    var urlList = [];    
    var newVodPlayList = '';
    var lastValidSegment = -1;
    var m3u8Lines = m3u8PlayList.split('#');
    m3u8Lines.forEach((line) => {
      var trimedLine = line.trim();
      if (trimedLine.toUpperCase().startsWith('EXTINF')) {
        var subLines = trimedLine.split('\n');
        if (subLines.length > 1) {
          // a valid TS segment line
          var url = subLines[1].trim();
          // complement url if necessary
          if (url && !(url.toLowerCase().startsWith('http'))) {
            var lastSlashPos = m3u8Url.lastIndexOf('/');
            if (lastSlashPos > 0) {
              var baseUrl = m3u8Url.substr(0,lastSlashPos);
              var needSlash = !url.startsWith('/');
              url = baseUrl + (needSlash ? '/' : '') + url;
            }
          }
          if (url.toLowerCase().endsWith('.ts')) {
            var slashPos = url.lastIndexOf('/');
            if (slashPos > 0) {
              var tsFile = url.substr(slashPos+1);
              var dotPos = tsFile.lastIndexOf('.');
              if (dotPos > 0) {
                var segmentNumberName = tsFile.substr(0,dotPos);
                var segmentNumber = parseInt(segmentNumberName);
                if (!isNaN(segmentNumber)) {
                  var addSegment = false;
                  if (lastValidSegment < 0) {
                    // first valid segment
                    addSegment = true;
                    lastValidSegment = segmentNumber;
                  }
                  else if (segmentNumber > lastValidSegment) {
                    // this is a simple parsing mechanism only matching above documented scenario!
                    // do some validations
                    var missingSegments = segmentNumber - lastValidSegment - 1;
                    if (missingSegments > 0) {
                      debug("missing " + missingSegments + " segment(s)");
                    }
                    // seems we have the next valid segment after the intermediate advertisment
                    addSegment = true;
                    lastValidSegment = segmentNumber;
                  }
                  if (addSegment) {
                    newVodPlayList += '#' + subLines[0] + '\n' + url + '\n';
                    urlList.push(url);
                  }
                }
              }
            }
          }
        }
      }
      else if (trimedLine.length > 0 && !trimedLine.toUpperCase().startsWith('EXT-X-DISCONTINUITY')) {
        newVodPlayList += '#' + trimedLine + '\n';
        urlList.push(url);
      }
    });
    // create a downloadlink to this blob
    //debug(newVodPlayList);
    var saveBlob = new Blob([newVodPlayList], { type: "text/html;charset=UTF-8" });
    var saveUrl = window.URL.createObjectURL(saveBlob);
    var quali = {
      "url": saveUrl,
      "type": "m3u8",
      "quality": quality,
      "adfree": true,
      "content": newVodPlayList
    };
    return quali;
  }

  async function analysePageAndCreateUiAsync(showUiOpen) {
    debug("analysePageAndCreateUiAsync()");

    // clean up old ui first
    deleteDownloadUi();
    
    // controller object in DOM and video element available?
    if(!window) {
      return;
    }
    var player = null;
    // RedBull:
    if (!player && document.querySelector('div.rbPlyr-container') && 'rbPlyr_rbPlyrwrapper' in window) {
      player = window.rbPlyr_rbPlyrwrapper;     
    }
    if (!player && document.querySelector('div.rbPlyr-rbupEl')) {
      var playerId = document.querySelector('div.rbPlyr-rbupEl').id;
      var playerName = "rbPlyr_" + playerId.replace(/-/g, "");
      if (playerName in window) {
        player = window[playerName];
      }
    }
    // ServusTV:
    if (!player && document.querySelector('div.rbPlyr-container') && 'rbPlyr_rbunifiedplayer1' in window) {
      player = window.rbPlyr_rbunifiedplayer1;
    }
    // MySpass:
    if (!player && document.querySelector('div.videoPlayerWrapper') && 'MyspassPlayer' in window) {
      player = window.MyspassPlayer;
    }
    // Vimeo:
    if (!player && document.querySelector('.player video') && 'vimeo' in window) {
      player = window.vimeo;
    }        
    // ARD:
    if (!player && this && '_state' in this && 'playerConfig' in this._state) {
      player = this._state.playerConfig;        //ard mediathek (_state exported by webpack:///./src/common/components/widgets/player/PlayerModel.js
    }        

    if (!player) {
      // try again later
      debug("could not find player object, trying again later");
      setTimeout( function(){ analysePageAndCreateUiAsync(false); }, 500 );
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
              "adfree": false,
              "content": ""
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
              "quality": videoQuality,
              "adfree": false,
              "content": ""
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
              "quality": videoQuality,
              "adfree": false,
              "content": ""
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
              "quality": videoQuality,
              "adfree": false,
              "content": ""
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
              "quality": videoQuality,
              "adfree": false,
              "content": ""              
            });
          }
          jsonMediaList.mediaList.push(entry);
        }

        if ('_pixelConfig' in player && player._pixelConfig.length > 0) { 
          //Ard Mediathek
          var videoInfo = player._pixelConfig[0];
          var videoTitle = videoInfo.clipTitle;
          var videoDesciption = videoInfo.agfMetaDataSDK.title;
          var videoUrl = getAbsoluteUrl(videoInfo.agfMetaDataSDK.assetid);
          var videoType = getExtensionFromUrl(videoUrl);
          var videoQuality = null;
          jsonMediaList.mediaList.push({
            "title": videoTitle,
            "description": videoDesciption,
            "qualities": [{
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality,
              "adfree": false,
              "content": ""
            }]
          });
        }

        // remove invalid entries
        for (var i=jsonMediaList.mediaList.length; i>0; i--) {
          var entry = jsonMediaList.mediaList[i-1];
          for (var j=entry.qualities.length; j>0; j--) {
            if (entry.qualities[j-1].url == null) {
              entry.qualities.pop();
            }
          }
          if (entry.qualities.length < 1) {
            jsonMediaList.mediaList.pop();
          }
        }

        // validate mediaLisat and retry if necessary
        if (jsonMediaList.mediaList.length < 1) {
            // try again later
            debug("could not retrieve video download url from player, trying again later");
            setTimeout( function(){ analysePageAndCreateUiAsync(false); }, 500 );
            return;
        }

        // resolve m3u8 playlists
        for (var i=0; i<jsonMediaList.mediaList.length; i++) {
          var entry = jsonMediaList.mediaList[i];
          for (var j=0; j<entry.qualities.length; j++) {
            var quality = entry.qualities[j];
            if (quality.type && quality.type.toLowerCase().startsWith("m3u8") && quality.quality == null) {
              //quality.quality = "m3u8-multi";
              var subQualities = await loadM3U8PlayListQualities(quality.url);
              subQualities.forEach((subQuality) => {entry.qualities.push(subQuality)});
            }
          }
        }
        // process m3u8 playlists
        for (var i=0; i<jsonMediaList.mediaList.length; i++) {
          var entry = jsonMediaList.mediaList[i];
          var subQualities = [];
          for (var j=0; j<entry.qualities.length; j++) {
            var quality = entry.qualities[j];
            if (quality.url && quality.type && quality.type.toLowerCase().startsWith("m3u8")) {
              var subQuality = await createAdFreeVodPlayListAsync(quality.url, quality.quality);
              if (subQuality) {
                subQualities.push(subQuality);
              }
            }
          }
          subQualities.forEach((subQuality) => {entry.qualities.push(subQuality)});
        }

        // debug output of retieved media information
        jsonMediaList.mediaList.forEach((entry) => {
          entry.qualities.forEach((quality) => {
            debug("Title       : '" + entry.title + "'");
            debug("Description : '" + entry.description + "'");
            debug("Url         : '" + quality.url + "'");
            debug("Type        : '" + quality.type + "'");
            debug("Quality     : '" + quality.quality + "'");
            debug("AdFree      : '" + quality.adfree + "'");
            debug("Content     : '" + (quality.content.length > 0) ? quality.content.substr(0,7) + "...'" : "'");
            debug("------------------------------");
          });
        });

        // inject download ui
        jsonMediaList.mediaList.forEach((entry) => {
          //var m3u8PlayLists;
          entry.qualities.forEach(async (quality) => {
            createDownloadUiAndAddUrl(showUiOpen, quality.url, entry.title, entry.description, quality.type, quality.quality, quality.adfree);
          })
        });
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

  function createDownloadUiAndAddUrl(showUiOpen, fileUrl, fileTitle, subTitle, mediaType, quality, adfree)
  {
    debug("createDownloadUiAndAddUrl()");

    // make valid filename from title and url
    var fileName = fileTitle.replace( /[<>:"\/\\|?*,]/g, '' );
    if (quality) {
      var qualiName = quality + (adfree ? '-AdFree' : '');
      fileName = fileName + " (" + qualiName + ")";
    }
    fileName = fileName  + '.' + mediaType

    var el = document.getElementById("i2d-popup");
    var elspan = document.getElementById("i2d-popup-x");
    var elspan1 = document.getElementById("i2d-popup-close");
    var eldiv = document.getElementById("i2d-popup-div");
    var eldivhold = document.getElementById("i2d-popup-div-holder");
 		var elrefresh = document.getElementById("i2d-popup-refresh");
 		if (elrefresh) {
 			elrefresh.parentElement.removeChild(elrefresh);
 		}
    if (!el) {
      el = document.createElement("div");
      el.id = "i2d-popup";
      el.style = "max-width: 100%; max-height: 100%; height: auto; width: auto; background: rgb(160, 160, 160); top: 100px; left: 0px; color: black; font-family: sans-serif; font-size: 14px; line-height: normal; text-align: left; position: absolute;";
      el.style.zIndex = Number.MAX_SAFE_INTEGER - 1;
      //el.style.overflow = "scroll";

      eldivhold = document.createElement("div");
      eldivhold.id = "i2d-popup-span-holder";
      eldivhold.style = "width: 100%; display: block; overflow: auto; padding-bottom: 3px; padding-left: 5px; padding-right: 5px;";

      elspan = document.createElement("span");
      elspan.id = "i2d-popup-x";
      elspan.style = "font-size: 110%; cursor: pointer; color: rgb(153, 0, 0); padding: 0.1em; float: left; display: inline; text-decoration: underline;";
      elspan.innerHTML = '[hide]';
      eldivhold.appendChild(elspan);

      elspan1 = document.createElement("span");
      elspan1.id = "i2d-popup-close";
      elspan1.style = "font-size: 110%; cursor: pointer; color: rgb(153, 0, 0); padding-right: 5px; float: right; display: inline; text-decoration: underline;";
      elspan1.innerHTML = '[x]' //'[close]';
      elspan1.onclick = () => { deleteDownloadUi(); };
      eldivhold.appendChild(elspan1);

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
        //var eldiv = document.getElementById("i2d-popup-div"); var elspan = document.getElementById("i2d-popup-x"); var elspan1 = document.getElementById("i2d-popup-close");
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
    el_a.title = 'Download: "' + fileName + '"';
    el_a.innerHTML = fileName;
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
    spanRefresh.id = "i2d-popup-refresh";
    spanRefresh.style = "font-size: 100%; cursor: pointer; color: rgb(153, 0, 0); float: right; display: inline; text-decoration: underline; padding-right: 10px;";
    spanRefresh.innerHTML = '[refresh]';
    spanRefresh.onclick = () => { analysePageAndCreateUiAsync(true); };
    eldiv.appendChild(spanRefresh);
    
    return el;
  }

  // load mux.js script
  loadScript('muxjs', chromeExtensionScriptUrl + muxjsVersion, ()=>{});
  
  // start analysing page
  analysePageAndCreateUiAsync();
}


(function(){
    // inject script into page in order to run in page context
    var chromeExtensionScriptUrl = (chrome && chrome.runtime) ? chrome.runtime.getURL('') : '';
    var setupScriptCode = CodeToInject.toString();
    var script = document.createElement('script');
    script.textContent = '(' + setupScriptCode + ')("' + chromeExtensionScriptUrl.toString() + '");';
    document.head.appendChild(script);
})();
