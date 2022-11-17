﻿// ==UserScript==
// @name        WebSite Media Download
// @namespace   savnt
// @description Adds a download button to the video player pages.
// @include     https://www.redbull.com/*
// @copyright   2019-2020, savnt
// @license     MIT
// @version     0.2.4
// @grant       none
// @inject-into page
// ==/UserScript==

function CodeToInject(chromeExtensionScriptUrl) {
  'use strict';
  
  var muxjsVersion = 'mux.js'; //'mux-min.js';
  var muxjsUrl = chromeExtensionScriptUrl + muxjsVersion;
  //var muxJs = null;

  var transmuxer = null
  var remuxedSegments = [];
  var remuxedInitSegment = null;
  var remuxedBytesLength = 0;
  var createInitSegment = false;
  var bytes = null;
  var muxedData = null;

  function transmuxSegmentsToCombinedMp4(nextSegmentData, resetTransmuxer) {
    debug("transmuxSegmentsToCombinedMp4()");

    // define mux output type (move to function arguments?)
    //var combined = false; var outputType = 'video'; //'audio';
    var combined = true; var outputType = 'combined';

    var i, j;

    if (resetTransmuxer || !transmuxer) {
      remuxedSegments = [];
      remuxedInitSegment = null;
      remuxedBytesLength = 0;
      muxedData = null;
      createInitSegment = true;

      if (!('muxjs' in window) && !(window['muxjsloading'])) {
        window['muxjsloading'] = true;
        injectScript(muxjsUrl, ()=>{
          debug("defering transmuxSegmentsToCombinedMp4()");
          window['muxjsloading'] = false;
          transmuxSegmentsToCombinedMp4(nextSegmentData, resetTransmuxer);
        });
        return;
      }

      if (combined) {
        outputType = 'combined';
        transmuxer = new muxjs.mp4.Transmuxer();
      } else {
        transmuxer = new muxjs.mp4.Transmuxer({remux: false});
      }

      transmuxer.on('data', function(event) {
        if (event.type === outputType) {
          remuxedSegments.push(event);
          remuxedBytesLength += event.data.byteLength;
          remuxedInitSegment = event.initSegment;
        }
      });

      transmuxer.on('done', function () {
        var offset = 0;
        if (createInitSegment) {
          bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength)
          bytes.set(remuxedInitSegment, offset);
          offset += remuxedInitSegment.byteLength;
          createInitSegment = false;
        } else {
          bytes = new Uint8Array(remuxedBytesLength);
        }

        for (j = 0, i = offset; j < remuxedSegments.length; j++) {
          bytes.set(remuxedSegments[j].data, i);
          i += remuxedSegments[j].byteLength;
        }
        muxedData = bytes;
        remuxedSegments = [];
        remuxedBytesLength = 0;
      });
    }

    //transmuxer.push(new Uint8Array(nextSegmentData));
    transmuxer.push(nextSegmentData);
    //transmuxer.flush();
  }

  function transmuxSegmentsToCombinedMp4SaveResultAs(videoFileName) {
    debug("transmuxSegmentsToCombinedMp4SaveResultAs()");
    transmuxer.flush();
    if (muxedData) {
      var videoBlob = new Blob([muxedData], {type: 'application/octet-binary'}); 
      window.saveAs(videoBlob, videoFileName);
    }
  }

  function debug(message) {
    console.log("[Media Download] " + message);
  }
  
  function injectScript(url, cb, variable=null) {
    debug("injectScript()");
    if (variable && (variable in window) && window[variable]) {
      debug("script already loaded -> invoking callback");
      cb();
    } else {
      debug("injecting script with url:'" + url + "'");
      let script = document.createElement("script");
      script.src = url;
      script.type = 'text/javascript';
      script.onload = cb;
      (document.head || document.documentElement).appendChild(script);
    }
  };

  function createXHR(method, url) {
    let xhr = new XMLHttpRequest();
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
      let xhr = createXHR('GET', url);
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
      let a = document.createElement('a');
      a.href = url;
      return a.href;
    }
    return null;
  }

  function getExtensionFromUrl(url) {
    if (url) {
      let extPos = url.lastIndexOf('.');
      let extStr = extPos < 0 ? 'blob' : url.substr(extPos+1);
      let qustnmrkPos = extStr.indexOf('?');
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
    let m3u8PlayList = await loadWebResourceAsync(m3u8Url);
    //debug(m3u8PlayList);
    //parse:
    // #EXT-X-STREAM-INF:BANDWIDTH=7556940,AVERAGE-BANDWIDTH=5745432,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
    // https://dms.redbull.tv/dms/media/AP-1XCY6DVFN1W11/1920x1080@7556940/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjYXRlZ29yeSI6InBlcnNvbmFsX2NvbXB1dGVyIiwib3NfZmFtaWx5IjoiaHR0cCIsIm9zX3ZlcnNpb24iOiIiLCJ1aWQiOiIwMmRjMzc1Mi01NjA4LTQ3YWMtOGY3Mi1hNmUwZDE5ZTI3MWYiLCJsYXRpdHVkZSI6MC4wLCJsb25ndGl0dWRlIjowLjAsImNvdW50cnlfaXNvIjoiZGUiLCJhZGRyZXNzIjoiMjAwMzplYTo5NzI4OjIwMDA6YjQ2MDpkZGZhOjJiODg6M2QwMCIsInVzZXItYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzQuMC4zNzI5LjE1NyBTYWZhcmkvNTM3LjM2IiwiZGV2aWNlX3R5cGUiOiIiLCJkZXZpY2VfaWQiOiIiLCJpYXQiOjE1NTgwNDQ3NTJ9.sTG_v7V_mGR2DMsvjVC10fOmvpfJR3T4h78Y5VaFa-w=/playlist.m3u8
    //or:
    // #EXT-X-STREAM-INF:BANDWIDTH=1838389,AVERAGE-BANDWIDTH=1461672,RESOLUTION=960x540,CODECS="mp4a.40.2,avc1.4d001f"
    // AA-1Z4QM5U2W1W12_FO-1Z6B52KKN5N11.m3u8
    let qualities = [];
    let m3u8Lines = m3u8PlayList.split('#');
    m3u8Lines.forEach((line) => {
      //debug(line);
      let trimedLine = line.trim();
      if (trimedLine.toUpperCase().startsWith('EXT-X-STREAM-INF:')) {
        let subLines = trimedLine.substr('EXT-X-STREAM-INF:'.length).split('\n');
        if (subLines.length > 1) {
          let params = subLines[0].split(',');
          let url = subLines[1].trim();
          let resolution = null;
          params.forEach((param) => {
            if (param.trim().toUpperCase().startsWith('RESOLUTION=')) {
              resolution = param.trim().substr('RESOLUTION='.length);
            }
          });
          // complement url if necessary
          if (url && !(url.toLowerCase().startsWith('http'))) {
            let lastSlashPos = m3u8Url.lastIndexOf('/');
            if (lastSlashPos > 0) {
              let baseUrl = m3u8Url.substr(0,lastSlashPos);
              let needSlash = !url.startsWith('/');
              url = baseUrl + (needSlash ? '/' : '') + url;
            }
          }
          // extract videoHeight from resolutuion parameter
          let videoHeight = 0;
          if (resolution.toLowerCase().indexOf('x') >= 0) {
            let widthHeight = resolution.split('x');
            videoHeight = widthHeight.pop();
          }
          let quality = {
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

  function getUrlListFromM3U8VodPlayList(m3u8PlayList) {
    debug("getUrlListFromM3U8VodPlayList()");
    //parse:
    // #EXT-X-PLAYLIST-TYPE:VOD
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/0.ts
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/1.ts
    if (m3u8PlayList.toUpperCase().indexOf('#EXT-X-PLAYLIST-TYPE:VOD') < 0) {
      return null;
    }
    let urlList = [];
    let m3u8Lines = m3u8PlayList.split('#');
    m3u8Lines.forEach((line) => {
      let trimedLine = line.trim();
      if (trimedLine.toUpperCase().startsWith('EXTINF')) {
        let subLines = trimedLine.split('\n');
        if (subLines.length > 1) {
          // a valid TS segment line
          let url = subLines[1].trim();
          // complement url if necessary
          if (url && !(url.toLowerCase().startsWith('http'))) {
            let lastSlashPos = m3u8Url.lastIndexOf('/');
            if (lastSlashPos > 0) {
              let baseUrl = m3u8Url.substr(0,lastSlashPos);
              let needSlash = !url.startsWith('/');
              url = baseUrl + (needSlash ? '/' : '') + url;
            }
          }
          urlList.push(url);
        }
      }
    });
    // return urlList and adapted m3u8PlayList
    let result = {
      "urlList": urlList,
      "vodPlayList": m3u8PlayList
    };
    return result;
  }

  function getAdFreeUrlListFromM3U8VodPlayList(m3u8PlayList) {
    debug("getAdFreeUrlListFromM3U8VodPlayList()");
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
    let urlList = [];
    let newVodPlayList = '';
    let lastValidSegment = -1;
    let m3u8Lines = m3u8PlayList.split('#');
    m3u8Lines.forEach((line) => {
      let trimedLine = line.trim();
      if (trimedLine.toUpperCase().startsWith('EXTINF')) {
        let subLines = trimedLine.split('\n');
        if (subLines.length > 1) {
          // a valid TS segment line
          let url = subLines[1].trim();
          // complement url if necessary
          if (url && !(url.toLowerCase().startsWith('http'))) {
            let lastSlashPos = m3u8Url.lastIndexOf('/');
            if (lastSlashPos > 0) {
              let baseUrl = m3u8Url.substr(0,lastSlashPos);
              let needSlash = !url.startsWith('/');
              url = baseUrl + (needSlash ? '/' : '') + url;
            }
          }
          if (url.toLowerCase().endsWith('.ts')) {
            let slashPos = url.lastIndexOf('/');
            if (slashPos > 0) {
              let tsFile = url.substr(slashPos+1);
              let dotPos = tsFile.lastIndexOf('.');
              if (dotPos > 0) {
                let segmentNumberName = tsFile.substr(0,dotPos);
                let segmentNumber = parseInt(segmentNumberName);
                if (!isNaN(segmentNumber)) {
                  let addSegment = false;
                  if (lastValidSegment < 0) {
                    // first valid segment
                    addSegment = true;
                    lastValidSegment = segmentNumber;
                  }
                  else if (segmentNumber > lastValidSegment) {
                    // this is a simple parsing mechanism only matching above documented scenario!
                    // do some validations
                    let missingSegments = segmentNumber - lastValidSegment - 1;
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
        //urlList.push(url);
      }
    });
    // return urlList and adapted m3u8PlayList
    let result = {
      "urlList": urlList,
      "vodPlayList": newVodPlayList
    };
    return result;
  }

  async function createAdFreeVodPlayListAsync(m3u8Url, quality) {
    debug("createAdFreeVodPlayListAsync()");
    let m3u8PlayList = await loadWebResourceAsync(m3u8Url);
    let adFreeResult = getAdFreeUrlListFromM3U8VodPlayList(m3u8PlayList);
    if (!adFreeResult || !adFreeResult.vodPlayList) {
      return null;
    }
    //debug(adFreeResult.vodPlayList);
    // create a downloadlink to this blob
    let saveBlob = new Blob([adFreeResult.vodPlayList], { type: "text/html;charset=UTF-8" });
    let saveUrl = window.URL.createObjectURL(saveBlob);
    let quali = {
      "url": saveUrl,
      "type": "m3u8",
      "quality": quality,
      "adfree": true,
      "content": adFreeResult.vodPlayList
    };
    return quali;
  }

  function stringToUint8Array(str) {
    //let buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    //let srcBufView = new Uint16Array(buf);
    //let tgtBufView = new Uint8Array(buf);
    //for (let i=0, strLen=str.length; i < strLen; i++) {
    //  srcBufView[i] = str.charCodeAt(i);
    //}
    //return tgtBufView;
    let ui8buf = new Uint8Array(str.length);
    for (let i=0, strLen=str.length; i < strLen; i++) {
      ui8buf[i] = str.charCodeAt(i);
    }
    return ui8buf;
  }

  async function saveM3U8VideoAsMP4Async(videoFileName, m3u8Url, m3u8Content) {
    debug("saveM3U8VideoAsMP4Async()");
    if (!m3u8Content) {
      m3u8Content = await loadWebResourceAsync(m3u8Url);
    }
    //let playListResult = getAdFreeUrlListFromM3U8VodPlayList(m3u8Content);
    let playListResult = getUrlListFromM3U8VodPlayList(m3u8Content);
    let urlList = playListResult.urlList;
    // mux.js
    muxedData = null;
    for (let i=0; i<urlList.length; i++) {
      let tsSegmentUrl = urlList[i];
      debug(tsSegmentUrl);
      let tsSegmentString = await loadWebResourceAsync(tsSegmentUrl);
      let tsSegment = stringToUint8Array(tsSegmentString);
      transmuxSegmentsToCombinedMp4(tsSegment, !i);
    }
    transmuxSegmentsToCombinedMp4SaveResultAs(videoFileName);
  }

  async function findRedBullMedia(document, jsonMediaList) {
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
    if (!player) {
      return;     
    }
    debug("found RedBull media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    let videoInfo = null;
    if ('getVidInfo' in player) {
      videoInfo = player.getVidInfo();
    } 
    if ('getVidMeta' in player) {
      videoInfo = player.getVidMeta();
    } 
    if (videoInfo) {
      var videoTitle = videoInfo.title;
      var videoDescription = videoInfo.subtitle;
      var videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
      var videoType = getExtensionFromUrl(videoUrl);
      var videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "adfree": false,
          "content": ""
        }]
      });
    } 
    else { 
      debug("could not extract RedBull media"); 
    }
  }

  async function findServusTVMedia(document, jsonMediaList) {
    var player = null;
    // ServusTV:
    if (!player && document.querySelector('div.rbPlyr-container') && 'rbPlyr_rbunifiedplayer1' in window) {
      player = window.rbPlyr_rbunifiedplayer1;
    }
    if (!player) {
      return;     
    }   
    debug("found ServusTV media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    if ('getVidMeta' in player) { 
      var videoInfo = player.getVidMeta();
      var videoTitle = videoInfo.title;
      var videoDescription = videoInfo.subtitle;
      var videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
      var videoType = getExtensionFromUrl(videoUrl);
      var videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "adfree": false,
          "content": ""
        }]
      });
    }
    else {
      debug("could not extract ServusTV media"); 
    }
  } 

  async function findMySpassMedia(document, jsonMediaList) {
    var player = null;
    // MySpass:
    if (!player && document.querySelector('div.videoPlayerWrapper') && 'MyspassPlayer' in window) {
      player = window.MyspassPlayer;
    }
    if (!player) {
      return;     
    }
    debug("found MySpass media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    if ('videoMetadata' in player) { 
      var videoInfo = player.videoMetadata;
      var videoTitle = videoInfo.title;
      var videoDescription = videoInfo.description;
      var videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
      var videoType = getExtensionFromUrl(videoUrl);
      var videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "adfree": false,
          "content": ""
        }]
      });
    }
    else {
      debug("could not extract MySpass media"); 
    }
  }
 
  async function findVimeoMedia(document, jsonMediaList) {
    var player = null;
    var isVimeoPlayer = false;
    // Vimeo:
    if (!player && document.querySelector('.player video') && 'vimeo' in window) {
      debug("found Vimeo page");
      player = window.vimeo;
    }
    // VimeoPlayer:        
    if (!player && document.querySelector('.player video') && 'VimeoPlayer' in window) {
      debug("found VimeoPlayer page");
      isVimeoPlayer = true;
      player = window.VimeoPlayer;
    }        
    if (!player) {
      return;     
    }
    debug("found Vimeo media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    if ('clips' in player) {
      debug("found Vimeo media data");
      //Vimeo
      var videoId = player.clip_page_config.clip.id;
      var videoInfo = player.clips[videoId];
      var videoTitle = videoInfo.video.title;
      var videoDescription = "";
      var entry = {
        "title": videoTitle,
        "description": videoDescription,
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
    else if (player.clip_page_config) {
      debug("found Vimeo live data");
      var videoTitle = player.clip_page_config.clip.title;
      var videoDescription = player.clip_page_config.clip.description;
      var vimeoConfigUrl = player.clip_page_config.player.config_url;
      var vimeoConfigJson = await loadWebResourceAsync(vimeoConfigUrl);
      var vimeoConfig = JSON.parse(vimeoConfigJson);
      var videoUrl = vimeoConfig.request.files.hls.cdns.akamai_live.url;
      var videoType = getExtensionFromUrl(videoUrl);
      var videoQuality = null;
        jsonMediaList.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality,
            "adfree": false,
            "content": ""
          }]
        });
    }
    else if (document.URL.includes('player.vimeo.com')) {
      //VimeoPlayer
      var vimeoConfigUrl = document.URL + '/config'; //https://player.vimeo.com/video/497651456/config
      var vimeoConfigJson = await loadWebResourceAsync(vimeoConfigUrl);
      var vimeoConfig = JSON.parse(vimeoConfigJson);
      var videoTitle = vimeoConfig.video.title;
      var videoDescription = "";
      if (vimeoConfig.request.files.progressive) {
        debug("found VimeoPlayer media data");
        var progressive = vimeoConfig.request.files.progressive;
        for (var i=0; i<progressive.length; i++) {
          var videoUrl = getAbsoluteUrl(progressive[i].url);
          var videoType = getExtensionFromUrl(videoUrl);
          var videoQuality = progressive[i].height;
          jsonMediaList.mediaList.push({
            "title": videoTitle,
            "description": videoDescription,
            "qualities": [{
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality,
              "adfree": false,
              "content": ""
            }]
          });
        }
      }
      else if (vimeoConfig.request.files.hls.cdns.akamai_live) {
        debug("found VimeoPlayer dash data");
        //var videoUrl = getAbsoluteUrl(vimeoConfig.request.files.hls.cdns.akamai_live.url);
        var videoUrl = vimeoConfig.request.files.hls.cdns.akamai_live.url;
        var videoType = getExtensionFromUrl(videoUrl);
        var videoQuality = null;
        jsonMediaList.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality,
            "adfree": false,
            "content": ""
          }]
        });
      }
    }
    else {
      debug("could not extract Vimeo media"); 
    }
  }
 
  async function findYouTubeMedia(document, jsonMediaList) {
    var player = null;
    // YouTube:        
    if (!player && document.querySelector('#ytd-player') && 'ytplayer' in window) {
      player = window.ytplayer;
    }
    //if (!player && document.querySelector('div#player.ytd-watch-flexy') && 'ytplayer' in window) {
    //  player = window.ytplayer;
    //}        
    if (!player) {
      return;     
    }
    debug("found YouTube media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    if ((player.config && player.config.args && player.config.args.video_id) &&
        (  player.player_response
        || player.playerResponse
        || player.config.args.player_response
        || player.config.args.raw_player_response)) {

      var plrResponseJson = player.player_response || player.playerResponse || player.config.args.player_response;
      var videoPlayerResponse = plrResponseJson ? JSON.parse(plrResponseJson) : null;
      videoPlayerResponse = videoPlayerResponse || player.config.args.raw_player_response;

      var videoID = player.config.args.video_id;

      var videoTitle=document.title || 'video';
      videoTitle=videoTitle.replace(/\s*\-\s*YouTube$/i, '').replace(/'/g, '\'').replace(/^\s+|\s+$/g, '').replace(/\.+$/g, '');
      videoTitle=videoTitle.replace(/[:"\?\*]/g, '').replace(/[\|\\\/]/g, '_'); //Mac, Linux, Windows
      if (((window.navigator.userAgent || '').toLowerCase()).indexOf('windows') >= 0) {
        videoTitle=videoTitle.replace(/#/g, '').replace(/&/g, '_'); //Windows
      } else {
        videoTitle=videoTitle.replace(/#/g, '%23').replace(/&/g, '%26'); //Mac, Linux
      }
      videoTitle=videoTitle.replace(/^\([0-9][0-9][0-9]\) /, '');
      
      if (videoPlayerResponse.streamingData && videoPlayerResponse.streamingData.hlsManifestUrl) {
        // add youtube live media stream info for download
        var videoDescription = "";
        var videoUrl = getAbsoluteUrl(videoPlayerResponse.streamingData.hlsManifestUrl);
        var videoType = getExtensionFromUrl(videoUrl);
        var videoQuality = null;
        jsonMediaList.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality,
            "adfree": false,
            "content": ""
          }]
        });
      }
    }
    else {
      debug("could not extract YouTube media"); 
    }
  }
 
  async function findArdMedia(document, jsonMediaList) {
    var player = null;
    // ARD:
    if (!player && this && '_state' in this && 'playerConfig' in this._state) {
      player = this._state.playerConfig;        //ard mediathek (_state exported by webpack:///./src/common/components/widgets/player/PlayerModel.js
    }
    if (!player) {
      return;     
    }
    debug("found ARD media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    if ('_pixelConfig' in player && player._pixelConfig.length > 0) { 
      var videoInfo = player._pixelConfig[0];
      var videoTitle = videoInfo.clipTitle;
      var videoDescription = videoInfo.agfMetaDataSDK.title;
      var videoUrl = getAbsoluteUrl(videoInfo.agfMetaDataSDK.assetid);
      var videoType = getExtensionFromUrl(videoUrl);
      var videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "adfree": false,
          "content": ""
        }]
      });
    }
    else {
      debug("could not extract ARD media"); 
    }
  }
  
  async function analysePageAndCreateUiAsync(showUiOpen) {
    debug("analysePageAndCreateUiAsync()");

    // clean up old ui first
    deleteDownloadUi();
    
    // controller object in DOM and video element available?
    if(!window) {
      return;
    }

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

      await findRedBullMedia(document, jsonMediaList);
      await findServusTVMedia(document, jsonMediaList);
      await findMySpassMedia(document, jsonMediaList);
      await findVimeoMedia(document, jsonMediaList);
      await findYouTubeMedia(document, jsonMediaList);
      await findArdMedia(document, jsonMediaList);
        
      // POSTPROCESS AND DISPLAY retrieved media information
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

      // validate mediaList and retry if necessary
      if (jsonMediaList.mediaList.length < 1) {
          // try again later
          debug("could not retrieve video download url from player, trying again later");
          setTimeout( function(){ analysePageAndCreateUiAsync(false); }, 1000);
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
          createDownloadUiAndAddUrl(showUiOpen, entry.title, entry.description, quality);
        })
      });
    }
    catch ( error )
    {
      // log the error
      console.error("[Media Download] Error retrieving video meta data:", error);
    }
  }

  function deleteDownloadUi() {
    debug("deleteDownloadUi()");
    var el = document.getElementById("i2d-popup");
    if (el) {
      el.parentElement.removeChild(el);
    }
  }

  function createDownloadUiAndAddUrl(showUiOpen, fileTitle, subTitle, downloadInfo)
  {
    debug("createDownloadUiAndAddUrl()");

    var fileUrl = downloadInfo.url;
    var mediaType = downloadInfo.type;
    var quality = downloadInfo.quality;
    var adfree = downloadInfo.adfree;

    // make valid filename from title and url
    var fileName = fileTitle.replace( /[<>:"\/\\|?*,]/g, '' );
    if (quality) {
      var qualiName = quality + (adfree ? '-AdFree' : '');
      fileName = fileName + " (" + qualiName + ")";
    }
    var mediaFileName = fileName  + '.' + mediaType

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
    el_a.download = mediaFileName;
    el_a.title = 'Download: "' + mediaFileName + '"';
    el_a.innerHTML = mediaFileName;
    el_a.style.color = "blue";
    el_a.style.textDecoration = "underline";
    el_a.style.cursor = "pointer";
    eldiv.appendChild(el_a);

    if (mediaType.toLowerCase().startsWith("m3u8")) {
      var span = document.createElement("span");
      span.innerHTML = "&nbsp;&nbsp;";
      eldiv.appendChild(span);
      var videoFileName = fileName + ".mp4";
      var spanSave = document.createElement("span");
      //spanSave.id = "i2d-popup-save" + fileName;
      spanSave.style = "font-size: 100%; cursor: pointer; color: rgb(153, 0, 0); float: right; display: inline; text-decoration: underline; padding-right: 10px;";
      spanSave.innerHTML = '[save]';
      spanSave.onclick = () => { saveM3U8VideoAsMP4Async(videoFileName, fileUrl, downloadInfo.content); };
      eldiv.appendChild(spanSave);
    }

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

  // add SaveAs feature
  // @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js 
window.saveAs=function(view){"use strict";if(typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var doc=view.document,get_URL=function(){return view.URL||view.webkitURL||view},save_link=doc.createElementNS("http://www.w3.org/1999/xhtml","a"),can_use_save_link="download"in save_link,click=function(node){var event=new MouseEvent("click");node.dispatchEvent(event)},is_safari=/Version\/[\d\.]+.*Safari/.test(navigator.userAgent),webkit_req_fs=view.webkitRequestFileSystem,req_fs=view.requestFileSystem||webkit_req_fs||view.mozRequestFileSystem,throw_outside=function(ex){(view.setImmediate||view.setTimeout)(function(){throw ex},0)},force_saveable_type="application/octet-stream",fs_min_size=0,arbitrary_revoke_timeout=500,revoke=function(file){var revoker=function(){if(typeof file==="string"){get_URL().revokeObjectURL(file)}else{file.remove()}};if(view.chrome){revoker()}else{setTimeout(revoker,arbitrary_revoke_timeout)}},dispatch=function(filesaver,event_types,event){event_types=[].concat(event_types);var i=event_types.length;while(i--){var listener=filesaver["on"+event_types[i]];if(typeof listener==="function"){try{listener.call(filesaver,event||filesaver)}catch(ex){throw_outside(ex)}}}},auto_bom=function(blob){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)){return new Blob(["\ufeff",blob],{type:blob.type})}return blob},FileSaver=function(blob,name,no_auto_bom){if(!no_auto_bom){blob=auto_bom(blob)}var filesaver=this,type=blob.type,blob_changed=false,object_url,target_view,dispatch_all=function(){dispatch(filesaver,"writestart progress write writeend".split(" "))},fs_error=function(){if(target_view&&is_safari&&typeof FileReader!=="undefined"){var reader=new FileReader;reader.onloadend=function(){var base64Data=reader.result;target_view.location.href="data:attachment/file"+base64Data.slice(base64Data.search(/[,;]/));filesaver.readyState=filesaver.DONE;dispatch_all()};reader.readAsDataURL(blob);filesaver.readyState=filesaver.INIT;return}if(blob_changed||!object_url){object_url=get_URL().createObjectURL(blob)}if(target_view){target_view.location.href=object_url}else{var new_tab=view.open(object_url,"_blank");if(new_tab==undefined&&is_safari){view.location.href=object_url}}filesaver.readyState=filesaver.DONE;dispatch_all();revoke(object_url)},abortable=function(func){return function(){if(filesaver.readyState!==filesaver.DONE){return func.apply(this,arguments)}}},create_if_not_found={create:true,exclusive:false},slice;filesaver.readyState=filesaver.INIT;if(!name){name="download"}if(can_use_save_link){object_url=get_URL().createObjectURL(blob);setTimeout(function(){save_link.href=object_url;save_link.download=name;click(save_link);dispatch_all();revoke(object_url);filesaver.readyState=filesaver.DONE});return}if(view.chrome&&type&&type!==force_saveable_type){slice=blob.slice||blob.webkitSlice;blob=slice.call(blob,0,blob.size,force_saveable_type);blob_changed=true}if(webkit_req_fs&&name!=="download"){name+=".download"}if(type===force_saveable_type||webkit_req_fs){target_view=view}if(!req_fs){fs_error();return}fs_min_size+=blob.size;req_fs(view.TEMPORARY,fs_min_size,abortable(function(fs){fs.root.getDirectory("saved",create_if_not_found,abortable(function(dir){var save=function(){dir.getFile(name,create_if_not_found,abortable(function(file){file.createWriter(abortable(function(writer){writer.onwriteend=function(event){target_view.location.href=file.toURL();filesaver.readyState=filesaver.DONE;dispatch(filesaver,"writeend",event);revoke(file)};writer.onerror=function(){var error=writer.error;if(error.code!==error.ABORT_ERR){fs_error()}};"writestart progress write abort".split(" ").forEach(function(event){writer["on"+event]=filesaver["on"+event]});writer.write(blob);filesaver.abort=function(){writer.abort();filesaver.readyState=filesaver.DONE};filesaver.readyState=filesaver.WRITING}),fs_error)}),fs_error)};dir.getFile(name,{create:false},abortable(function(file){file.remove();save()}),abortable(function(ex){if(ex.code===ex.NOT_FOUND_ERR){save()}else{fs_error()}}))}),fs_error)}),fs_error)},FS_proto=FileSaver.prototype,saveAs=function(blob,name,no_auto_bom){return new FileSaver(blob,name,no_auto_bom)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(blob,name,no_auto_bom){if(!no_auto_bom){blob=auto_bom(blob)}return navigator.msSaveOrOpenBlob(blob,name||"download")}}FS_proto.abort=function(){var filesaver=this;filesaver.readyState=filesaver.DONE;dispatch(filesaver,"abort")};FS_proto.readyState=FS_proto.INIT=0;FS_proto.WRITING=1;FS_proto.DONE=2;FS_proto.error=FS_proto.onwritestart=FS_proto.onprogress=FS_proto.onwrite=FS_proto.onabort=FS_proto.onerror=FS_proto.onwriteend=null;return saveAs}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!=null){define([],function(){return saveAs})}

 
  // load mux.js script and 
  // start analysing page
  injectScript(muxjsUrl, ()=>{
    debug("analysePageOnMuxJsLoad()");
    //muxJs = window['muxjs'];
    analysePageAndCreateUiAsync();
  });
 
  //analysePageAndCreateUiAsync();
}

(function(){
  console.log("[Media Download] MAINSTART");
 
  function injectCode() {
    console.log("[Media Download] injectCode");
    // inject script into page in order to run in page context
    var chromeExtensionScriptUrl = (chrome && chrome.runtime) ? chrome.runtime.getURL('') : '';
    var setupScriptCode = CodeToInject.toString();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    //script.textContent = '(' + setupScriptCode + ')("' + chromeExtensionScriptUrl.toString() + '");';
    script.textContent = setupScriptCode + ' CodeToInject("' + chromeExtensionScriptUrl.toString() + '");';
    document.head.appendChild(script);
  }

  //window.onload = function () {
  //  console.log("[Media Download] window.onload");
  //  injectCode();
  //};
  //window.onload = injectCode();
  injectCode();
})();
