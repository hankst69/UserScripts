// ==UserScript==
// @name        WebSite Media Download
// @namespace   savnt
// @description Adds a download button to video player pages
// @copyright   2019-2021, savnt
// @license     MIT
// @version     0.4.4
// @grant       none
// @inject-into page
// ==/UserScript==
// spec: https://wiki.greasespot.net/Metadata_Block

(function content() {

function CodeToInject(chromeExtensionScriptUrl) {
  //'use strict';

  //-------------------------------------------------------------------
  // mux.js add on
  
  var muxjsVersion = 'mux.js'; //'mux-min.js';
  var muxjsUrl = chromeExtensionScriptUrl ? chromeExtensionScriptUrl + muxjsVersion : null;
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
    let combined = true; 
    let outputType = 'combined';

    if (resetTransmuxer || !transmuxer) {
      remuxedSegments = [];
      remuxedInitSegment = null;
      remuxedBytesLength = 0;
      muxedData = null;
      createInitSegment = true;

      if (!('muxjs' in window) && !(window['muxjsloading'])) {
        window['muxjsloading'] = true;
        debug("muxjs not available -> reinjecting 'muxjs' script and defering transmuxSegmentsToCombinedMp4() call");
        injectScript(muxjsUrl, ()=>{
          debug("execute defered transmuxSegmentsToCombinedMp4() call");
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

        for (let j = 0, i = offset; j < remuxedSegments.length; j++) {
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

  function transmuxSegmentsToCombinedMp4Blob() {
    debug("transmuxSegmentsToCombinedMp4Blob()");
    transmuxer.flush();
    if (muxedData) {
      var videoBlob = new Blob([muxedData], { type: 'application/octet-binary' }); 
      //alert("videoBlob created");
      //window.saveAs(videoBlob, videoFileName);
      // add download anchor to the document:
      //...
      return videoBlob;
    }
  }

  //-------------------------------------------------------------------
  // main script
  
  function debug(message) {
    console.log("[Media Download] " + message);
    // simulate console on I(Pad)OS Safari browsers
    if (!navigator.userAgent.includes("Windows")) //if(navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome"))
    {
      let DEBUG_ID = "DLWSMEDIA_DEBUG";
      let div = document.getElementById(DEBUG_ID);
      if (!div) {
        div = document.createElement("div");
        div.id = DEBUG_ID;
        //div.style.position = "fixed";
        div.style.top = "20%";
        div.style.left = "10%";
        div.style.height = "50%";
        div.style.width = "80%";
        document.body.appendChild(div);
      }
      let lines = message.split('\n');
      lines.forEach((line)=>{
        let pre = document.createElement('pre');
        pre.innerHTML = line;
        div.appendChild(pre);   
      });
    }
  }
  
  function debugJson(context, json) {
    if (json) {
      debug(context + JSON.stringify(json, null, 2)); 
    }
    else {
      debug(context + 'null');
    }
  }
  
  function debugJsonString(context, jsonStr) {
    debugJson(context, JSON.parse(jsonStr));
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
        let response = {
          "url" : xhr.responseURL,
          "status" : xhr.status,
          "data" : xhr.responseText
        };
        resolve(response);
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
      let lastSlashPos = url.lastIndexOf('/');
      if (lastSlashPos > 0 && lastSlashPos < (url.length - 1)) {
        url = url.substr(lastSlashPos+1);
      }
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

  function getExtensionFromMimeType(mime) {
    if (mime) {
      let firstSlashPos = mime.indexOf('/');
      if (firstSlashPos > 0) {
        let mediaType = mime.substr(0,firstSlashPos);
        let firstSemicolonPos = mime.indexOf(';');
        if (firstSemicolonPos < 0) {
          firstSemicolonPos = mime.length;
        }
        let extType = mime.substr(firstSlashPos+1, firstSemicolonPos - firstSlashPos - 1);
        return extType.toLowerCase();
      }
    }
    return null;
  }

  function convertTitleToValidFilename(videoTitle) {
    debug("convertTitleToValidFilename()");
    if (!videoTitle) {
      return 'video';
    }
    // modifications for: Mac, Linux, Windows
    videoTitle = videoTitle
      .replace(/'/g, '\'')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\.+$/g, '')
      .replace(/[<>:"?*]/g, '')
      .replace(/[\|\\\/]/g, '_')
    if (((window.navigator.userAgent || '').toLowerCase()).indexOf('windows') >= 0) {
      // modifications for: Windows
      videoTitle = videoTitle
        .replace(/#/g, '')
        .replace(/&/g, '_'); 
    } else {
      // modifications for: Mac, Linux
      videoTitle = videoTitle
        .replace(/#/g, '%23')
        .replace(/&/g, '%26');
    }
    videoTitle = videoTitle.replace(/^\([0-9][0-9][0-9]\) /, '');
    return videoTitle;
  }

  //-------------------------------------------------------------------
  // m3u8 handling

  function m3u8TagToSegmentData(tag) {
    if (tag && tag.name && tag.name == 'EXTINF' && tag.uri && tag.values.length > 0) {
      let name = tag.uri;
      let slashPos = name.lastIndexOf('/');
      if (slashPos > 0) {
        name = name.substr(slashPos+1);
      }
      let dotPos = name.lastIndexOf('.');
      if (dotPos > 0) {
        name = name.substr(0,dotPos);
      }
      let number = 0;
      // assuming the name contains digits:
      let firstDigitPos = -1;
      let lastDigitPos = -1;
      for (let i = 0; i < name.length; i++) {
        let num = name.substr(i, 1);
        let isDigit = !isNaN(num);
        if (firstDigitPos < 0) {
          if (isDigit) {
            firstDigitPos = i;
            lastDigitPos = i;
          }
        }
        else {
          if (isDigit) {
            lastDigitPos = i;
          }
          else {
            break;
          }
        }
      }
      if (firstDigitPos >= 0) {
        number = parseInt(name.substr(firstDigitPos, lastDigitPos - firstDigitPos + 1));
      }
      return {
        "name": name,
        "number": number,
        "time": tag.values[0],
        "uri": tag.uri
      };
    }
    return null;
  }
  
  function m3u8ParseData(m3u8DataString) {
    let m3u8Data = {
      "tags": [],
      "segments": []
    };
    m3u8DataString = m3u8DataString.trim();
    let m3u8TagStrings = m3u8DataString.split('#');
    m3u8TagStrings.forEach((tagString) => {
      let tag = m3u8ParseTag(tagString);
      if (tag.name) {
        // we parsed a valid tag
        // we try to convert it into an segmentTag
        let segment = m3u8TagToSegmentData(tag);
        if (segment) {
          m3u8Data.segments.push(segment);
          tag.isSegment = true;
        }
        m3u8Data.tags.push(tag);
      }
    });
    return m3u8Data;
  }

  function m3u8ParseTag(m3u8TagString) {
    let m3u8Tag = {
      "name": null,
      "values": [],
      "attributes": [],
      "uri": null,
      "isSegment": false
    };
    m3u8TagString = m3u8TagString.trim();
    if (m3u8TagString.startsWith('#')) {
      m3u8TagString = m3u8TagString.substr(1);
    }
    if (m3u8TagString.length < 1) {
      // empty line
      return m3u8Tag;
    }
    let colonPos = m3u8TagString.indexOf(':');
    if (colonPos < 0) {
      // just a tag without attributes
      m3u8Tag.name = m3u8TagString.toUpperCase();
      return m3u8Tag;
    }
    if (colonPos == 0) {
      // no tagName since colon is on pos 0
      return m3u8Tag;
    }
    // parse tagName:
    m3u8Tag.name = m3u8TagString.substr(0, colonPos).toUpperCase();
    // parse tagData:
    let tagDataString = m3u8TagString.substr(colonPos + 1);
    // split tagData into lines (second line is then the the uri):
    let tagDataLines = tagDataString.split('\n');
    if (tagDataLines.length > 1) {
      m3u8Tag.uri = tagDataLines[1].trim();
    }
    // parse values/attributes from first line of tagData:
    if (tagDataLines.length > 0) {
      let attributeData = tagDataLines[0].trim();
      let attributes = attributeData.split(',');
      attributes.forEach((attribute) => {
        let attribKvp = attribute.split('=');
        if (attribKvp.length < 2) {
          // just a pure value
          m3u8Tag.values.push(attribute);
        }
        else {
          let attr = {
            "name" : attribKvp[0].toUpperCase(),
            "value" : attribKvp[1],
            "valueUnquoted" : null
          };
          // remove bracing quotes
          attr.valueUnquoted = attr.value;
          if (attr.value && attr.value.startsWith('"') && attr.value.endsWith('"')) {
            attr.valueUnquoted = attr.value.substr(1, attr.value.length-2);
          }
          m3u8Tag.attributes.push(attr);
          // special service for UIR attributes -> copy uri into tag.uri
          if (!m3u8Tag.uri && attr.name == "URI") {
            m3u8Tag.uri = attr.valueUnquoted;
          }
        }
      });
    }
    if (m3u8Tag && m3u8Tag.name && m3u8Tag.name == 'EXTINF' && m3u8Tag.uri && m3u8Tag.values.length > 0) {
      m3u8Tag.isSegment = true;
    }
    return m3u8Tag;
  }

  //async function m3u8MixVideoAndAudioStreamPlaylists(m3u8StreamVideo, m3u8StreamAudio) {
  // return m3u8Stream;
  //}
  //async function m3u8ProcessStreamPlaylist(m3u8Stream) {
  // return m3u8Stream;
  //}
  //async function m3u8LoadStreamPlaylist(m3u8Stream) {
  // return m3u8Stream;
  //}
  //async function m3u8LoadMasterPlaylistAndResolveStreams(m3u8UrlIn) {
  // return m3u8Master;
  //}

  //function m3u8GetAudioCodecFromCodecs() {
  //}

  //class m3u8Data {
  //  "tags": [],
  //  "segments": []
  //};
  //class m3u8Tag = {
  //  "name": null,
  //  "values": [],
  //  "attributes": [],
  //  "uri": null
  //};
  //class m3u8Segment {
  //  "name": null,
  //  "number": 0,
  //  "time": null,
  //  "uri": null
  //};
  //class m3u8Attribute = {
  //  "name": null,
  //  "value": null,
  //  "valueUnquoted": null
  //};
  //
  //class m3u8Master = {
  //  "uri": null,
  //  "live": false,
  //  "streams": [],
  //
  //  "m3u8text": null,
  //  "m3u8data": null,
  //  "downloadblob": null
  //};
  //
  //class m3u8Stream = {
  //  "uri": url,           //https://dms.redbull.tv/dms/media/AP-1XCY6DVFN1W11/1920x1080@7556940/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjYXRlZ29yeSI6InBlcnNvbmFsX2NvbXB1dGVyIiwib3NfZmFtaWx5IjoiaHR0cCIsIm9zX3ZlcnNpb24iOiIiLCJ1aWQiOiIwMmRjMzc1Mi01NjA4LTQ3YWMtOGY3Mi1hNmUwZDE5ZTI3MWYiLCJsYXRpdHVkZSI6MC4wLCJsb25ndGl0dWRlIjowLjAsImNvdW50cnlfaXNvIjoiZGUiLCJhZGRyZXNzIjoiMjAwMzplYTo5NzI4OjIwMDA6YjQ2MDpkZGZhOjJiODg6M2QwMCIsInVzZXItYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzQuMC4zNzI5LjE1NyBTYWZhcmkvNTM3LjM2IiwiZGV2aWNlX3R5cGUiOiIiLCJkZXZpY2VfaWQiOiIiLCJpYXQiOjE1NTgwNDQ3NTJ9.sTG_v7V_mGR2DMsvjVC10fOmvpfJR3T4h78Y5VaFa-w=/playlist.m3u8
  //  "live": false,
  //  "mediatype": null,    //AUDIO|VIDEO|MUXED
  //  "codecs": null,       //mp4a.40.2,avc1.4d001f
  //  "language": null,     //de
  //  "resolution: null,    //1920x1080
  //  "quality": null,      //720|480p|1080p|1920x1080|mp4a.40.2|avc1.4d001f
  //  "type": null,         //mp4|m4a|webm|weba|...
  //
  //  "m3u8text": null,
  //  "m3u8data": null,
  //  "processed": false,
  //  "processedText": null,
  //  "processedData": null
  //};


  async function loadM3U8PlayListQualities(m3u8UrlIn) {
    debug("loadM3U8PlayListQualities()");
    let response = await loadWebResourceAsync(m3u8UrlIn);
    let m3u8Url = response.url;
    let m3u8Text = response.data;
    debug("m3u8UrlIn: " + m3u8UrlIn);
    debug("m3u8Url: " + m3u8Url);
    //debug("m3u8Text: " + m3u8Text);
    //parse:
    // #EXT-X-STREAM-INF:BANDWIDTH=7556940,AVERAGE-BANDWIDTH=5745432,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
    // https://dms.redbull.tv/dms/media/AP-1XCY6DVFN1W11/1920x1080@7556940/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjYXRlZ29yeSI6InBlcnNvbmFsX2NvbXB1dGVyIiwib3NfZmFtaWx5IjoiaHR0cCIsIm9zX3ZlcnNpb24iOiIiLCJ1aWQiOiIwMmRjMzc1Mi01NjA4LTQ3YWMtOGY3Mi1hNmUwZDE5ZTI3MWYiLCJsYXRpdHVkZSI6MC4wLCJsb25ndGl0dWRlIjowLjAsImNvdW50cnlfaXNvIjoiZGUiLCJhZGRyZXNzIjoiMjAwMzplYTo5NzI4OjIwMDA6YjQ2MDpkZGZhOjJiODg6M2QwMCIsInVzZXItYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzQuMC4zNzI5LjE1NyBTYWZhcmkvNTM3LjM2IiwiZGV2aWNlX3R5cGUiOiIiLCJkZXZpY2VfaWQiOiIiLCJpYXQiOjE1NTgwNDQ3NTJ9.sTG_v7V_mGR2DMsvjVC10fOmvpfJR3T4h78Y5VaFa-w=/playlist.m3u8
    //or:
    // #EXT-X-STREAM-INF:BANDWIDTH=1838389,AVERAGE-BANDWIDTH=1461672,RESOLUTION=960x540,CODECS="mp4a.40.2,avc1.4d001f"
    // AA-1Z4QM5U2W1W12_FO-1Z6B52KKN5N11.m3u8
    //and:
    //#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="German",LANGUAGE="de",AUTOSELECT=YES,URI="FO-264JJREMSBH16.m3u8"
    let qualities = [];
    let m3u8Data = m3u8ParseData(m3u8Text);
    m3u8Data.tags.forEach((tag) => {
      if (tag.name == 'EXT-X-STREAM-INF') {
        let url = tag.uri;
        let resolution = "unknown"; 
        tag.attributes.forEach((attribute) => {if (attribute.name == 'RESOLUTION') resolution = attribute.value});
        // complement url if necessary
        if (url && !(url.toLowerCase().startsWith('http'))) {
          let lastSlashPos = m3u8Url.lastIndexOf('/');
          if (lastSlashPos > 0) {
            let baseUrl = m3u8Url.substr(0,lastSlashPos);
            let needSlash = !url.startsWith('/');
            url = baseUrl + (needSlash ? '/' : '') + url;
          }
          // concat baseUrl search if necessary:
          let searchStartPos = m3u8Url.indexOf('?');
          if (searchStartPos > 0 && searchStartPos < m3u8Url.length-1) {
            let queryStartPos = url.indexOf('?');
            if (queryStartPos < 0) {
              url = url + '?' + m3u8Url.substr(searchStartPos+1);
            } else {
              url = url + '&' + m3u8Url.substr(searchStartPos+1);
            }
          }
        }
        // extract videoHeight from resolution parameter
        let videoHeight = 0;
        if (resolution.toLowerCase().indexOf('x') >= 0) {
          let widthHeight = resolution.split('x');
          videoHeight = widthHeight.pop();
        }
        let quality = {
          "url": url,
          "type": getExtensionFromUrl(url),
          "quality": videoHeight,
          "live": false,
          "adfree": false,
          "content": ""
        };
        qualities.push(quality);
      }
    });
    return qualities;
  }
  
  function getUrlListFromM3U8VodPlayList(m3u8Text, m3u8Url) {
    debug("getUrlListFromM3U8VodPlayList()");
    // todo: use m3u8DataParser and ad support for baseUrl
    //
    //parse:
    // #EXT-X-PLAYLIST-TYPE:VOD
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/0.ts
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/1.ts
    let urlList = [];
    let m3u8Data = m3u8ParseData(m3u8Text);
    if (m3u8Data.segments.length < 1) {
      debug("given playlist does not cntain segments -> exit early")
      return null;
    }
    if (!m3u8Data.tags['EXT-X-PLAYLIST-TYPE'] == 'VOD') {
      debug("given playlist is not of VOD playlist type (probably a m3u8 master instead) -> exit early")
      return null;
    }
    for (let i = 0; i < m3u8Data.segments.length; i++) {
      let url = m3u8Data.segments[i].uri;
      // complement url if necessary
      if (url && !(url.toLowerCase().startsWith('http'))) {
        let lastSlashPos = m3u8Url.lastIndexOf('/');
        if (lastSlashPos > 0) {
          let baseUrl = m3u8Url.substr(0, lastSlashPos);
          let needSlash = !url.startsWith('/');
          url = baseUrl + (needSlash ? '/' : '') + url;
        }
        // concat baseUrl search if necessary:
        let searchStartPos = m3u8Url.indexOf('?');
        if (searchStartPos > 0 && searchStartPos < m3u8Url.length - 1) {
          let queryStartPos = url.indexOf('?');
          if (queryStartPos < 0) {
            url = url + '?' + m3u8Url.substr(searchStartPos + 1);
          } else {
            url = url + '&' + m3u8Url.substr(searchStartPos + 1);
          }
        }
        // update segment uri
        m3u8Data.segments[i].uri = url;
      }
      urlList.push(url);
    }
    // return urlList and adapted m3u8PlayList
    let result = {
      "urlList": urlList,
      "vodPlayList": m3u8Text,
      "m3u8Data": m3u8Data
    };
    return result;
  }

  function getAdFreeUrlListFromM3U8VodPlayList(m3u8PlayList, m3u8Url) {
    debug("getAdFreeUrlListFromM3U8VodPlayList()");
    //debug("m3u8PlaylistData: " + m3u8PlayList);
    // todo: rewrite based on m3u8 parser
    // 
    //parse:
    // #EXT-X-PLAYLIST-TYPE:VOD
    // #EXT-X-VERSION:7
    // #EXT-X-MEDIA-SEQUENCE:0
    // #EXT-X-TARGETDURATION:3
    // #EXT-X-MAP:URI="../FO-2671U79W9BH15/init.mp4"
    //
    //parse:
    // #EXTM3U
    // #EXT-X-VERSION:6
    // #EXT-X-TARGETDURATION:3
    // #EXT-X-MEDIA-SEQUENCE:0
    // #EXT-X-PLAYLIST-TYPE:VOD
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/0.ts
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/1.ts
    // ...
    // #EXTINF:2.240,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/486.ts
    // #EXT-X-DISCONTINUITY
    // #EXTINF:3.000,
    // https://cs5.rbmbtnx.net/v1/GAMS/s/1/ST/8N/Z5/QH/21/11/0.ts
    // #EXT-X-DISCONTINUITY
    // #EXTINF:3.000,
    // https://cs.rbmbtnx.net/v1/GAMS/s/1/YX/HB/1S/YW/5N/11/0.ts
    // #EXTINF:3.000,
    // https://cs.rbmbtnx.net/v1/GAMS/s/1/YX/HB/1S/YW/5N/11/1.ts
    // #EXTINF:3.000,
    // ...
    // #EXTINF:2.000,
    // https://cs.rbmbtnx.net/v1/GAMS/s/1/YX/HB/1S/YW/5N/11/15.ts
    // #EXT-X-DISCONTINUITY
    // #EXTINF:3.000,
    // https://cs2.rbmbtnx.net/v1/GAMS/s/1/SV/5P/JV/F1/1W/11/0.ts
    // #EXT-X-DISCONTINUITY
    // #EXTINF:0.760,
    // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/487.ts
    //
    if (m3u8PlayList.toUpperCase().indexOf('#EXT-X-PLAYLIST-TYPE:VOD') < 0) {
      debug("probably a m3u8 master playlist (not a VOD playlist) -> exit early")
      return null;
    }
    let urlList = [];
    let newVodPlayList = '';
    let lastValidSegment = -1;
    let m3u8Lines = m3u8PlayList.split('#');
    m3u8Lines.forEach((line) => {
      let trimedLine = line.trim();
      if (trimedLine.toUpperCase().startsWith('EXT-X-MAP')) {
        let newTrimedLine = trimedLine;
        let newUrl = null;
        let colonPos = trimedLine.indexOf(':');
        if (colonPos > 0) {
          newTrimedLine = 'EXT-X-MAP:';
          let attributeData = trimedLine.substr(colonPos+1);
          let attributes = attributeData.split(',');
          let firstAttribute = true;
          attributes.forEach((attribute) => {
            let newAttribute = attribute;
            let attribKvp = attribute.split('=');
            if (attribKvp.length > 1 && attribKvp[0].toUpperCase() == 'URI' && attribKvp[1]) {
              newUrl = attribKvp[1].trim();
              // remove bracing quotes
              if (newUrl.startsWith('"')) {
                newUrl = newUrl.substr(1);
              }
              if (newUrl.endsWith('"')) {
                newUrl = newUrl.substr(0,newUrl.length-1);
              }
              // complement url if necessary
              if (!(newUrl.toLowerCase().startsWith('http'))) {
                let lastSlashPos = m3u8Url.lastIndexOf('/');
                if (lastSlashPos > 0) {
                  let baseUrl = m3u8Url.substr(0,lastSlashPos);
                  let needSlash = !newUrl.startsWith('/');
                  newUrl = baseUrl + (needSlash ? '/' : '') + newUrl;
                }
                newAttribute = 'URI="' + newUrl + '"';
              }
              else {
                newUrl = null;
              }
            }
            if (!firstAttribute) {
              newAttribute = "," + newAttribute;
            }
            firstAttribute = false;
            newTrimedLine += newAttribute;
          });
        }
        // write modified line
        newVodPlayList += '#' + newTrimedLine + '\n';
        if (newUrl) {
          urlList.push(newUrl);
        }
      }
      else if (trimedLine.toUpperCase().startsWith('EXTINF')) {
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
          if (url.toLowerCase().endsWith('.ts') || url.toLowerCase().endsWith('.m4s')) {
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
                    // write modified line
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
        // write original line (leave out empty lines and 'EXT-X-DISCONTINUITY' lines)
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
  
  async function processQualityToAdFreeAsync(quality) {
    debug("processQualityToAdFreeAsync()");
    let response = await loadWebResourceAsync(quality.url);
    let m3u8Url = response.url;
    let m3u8Text = response.data;
    debug("m3u8UrlIn: " + quality.url);
    debug("m3u8Url: " + m3u8Url);
    //debug("m3u8Text: " + m3u8Text);
    let adFreeResult = getAdFreeUrlListFromM3U8VodPlayList(m3u8Text, m3u8Url);
    if (!adFreeResult || !adFreeResult.vodPlayList) {
      return null;
    }
    //debug(adFreeResult.vodPlayList);
    // create a downloadlink to this blob
    let saveBlob = new Blob([adFreeResult.vodPlayList], { type: "text/html;charset=UTF-8" });
    let saveUrl = window.URL.createObjectURL(saveBlob);
    let quali = {
      "url": saveUrl,
      "type": quality.type, //"m3u8",
      "quality": quality.quality,
      "live": quality.live,
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

  async function saveM3U8LivePlayListAsync(m3u8Url, m3u8Content, resolve, reject, cancel) {
    debug("saveM3U8LivePlayListAsync()");
    // 1) load initial playlist data (will only contain few segments)
    if (!m3u8Content) {
      let response = await loadWebResourceAsync(m3u8Url);
      m3u8Content = response.data;
      m3u8Url = response.url;
    }
    //debug("m3u8UrlIn: " + m3u8UrlIn);
    debug("m3u8Url: " + m3u8Url);
    //debug("m3u8Text: " + m3u8Content);
    //let urlList = getAdFreeUrlListFromM3U8VodPlayList(m3u8Content, m3u8Url);
    let urlList = getUrlListFromM3U8VodPlayList(m3u8Content, m3u8Url);
    if (!urlList || !urlList.vodPlayList || !urlList.m3u8Data) {
      debug("error loading playlist data");
      if (reject) reject("error loading playlist data");
      return null;
    }
    // 2) parse initial playlist data
    //let m3u8Data = m3u8ParseData(urlList.vodPlayList); //m3u8ParseData(m3u8Content);
    let m3u8Data = urlList.m3u8Data;
    if (m3u8Data.segments.length < 1) {
      debug("could not find any VOD segments -> early exit");
      if (reject) reject("could not find any VOD segments -> early exit");
      return null;
    }
    // 3) repeat loading and insert new segments into existing m3u8Data until no changes happen anymore (live stream ends)
    let repeatLoading = true;
    while (repeatLoading) {
      let response = await loadWebResourceAsync(m3u8Url);
      m3u8Content = response.data;
      m3u8Url = response.url;
      //debug("m3u8UrlIn: " + m3u8UrlIn);
      debug("m3u8Url: " + m3u8Url);
      //debug("m3u8Text: " + m3u8Content);
      //let urlList = getAdFreeUrlListFromM3U8VodPlayList(m3u8Content, m3u8Url);
      let urlList = getUrlListFromM3U8VodPlayList(m3u8Content, m3u8Url);
      if (!urlList || !urlList.vodPlayList || !urlList.m3u8Data) {
        debug("loading playlist data failed (live stream ended?)");
        repeatLoading = false;
      }
      else {
        // parse playlist data
        //let newM3u8Data = m3u8ParseData(urlList.vodPlayList); //m3u8ParseData(m3u8Content);
        let newM3u8Data = urlList.m3u8Data;
        if (newM3u8Data.segments.length < 1) {
          repeatLoading = false;
        }
        else {
          newM3u8Data.segments.forEach((newSegment) => {
            let isContained = false;
            m3u8Data.segments.forEach((segment) => {
              if (segment.uri == newSegment.uri) {
                isContained = true;
              }
            });
            if (!isContained) {
              m3u8Data.segments.push(newSegment);
            }
          });
        }
      }
      // check for use cancelation
      if (cancel) {
        if (cancel()) {
          repeatLoading = false;
        }
      }
    }
    debug("loading of async playlist ended");
    // 4) convert the m3u8Data inot a saveable string typed vodPlayList
    let fullList = "";
    m3u8Data.tags.forEach((tag) => {
      if (!tag.isSegment) {
        fullList = fullList + '#' + tag.name + ':';
        tag.values.forEach((value) => {
          fullList = fullList + value + ',';
        });
        tag.attributes.forEach((attr) => {
          fullList = fullList + attr.name + '=' + attr.value + ',';
        });
        if (fullList.endsWith(',')) {
          fullList = fullList.substr(0, fullList.length - 1);
        }
        fullList = fullList + '\n';
      }
    });
    m3u8Data.segments.forEach((segment) => {
      fullList = fullList + '#EXTINF:' + segment.time + ',\n' + segment.uri;  
      fullList = fullList + '\n';
    });
    // 5) create a blob and return
    let saveBlob = new Blob([fullList], { type: "text/html;charset=UTF-8" });
    if (resolve) {
      resolve(saveBlob);
    }
    return saveBlob;
  }

  async function saveM3U8VideoAsMP4Async(m3u8Url, m3u8Content, resolve, reject, cancel) {
    debug("saveM3U8VideoAsMP4Async()");
    if (!m3u8Content) {
      let response = await loadWebResourceAsync(m3u8Url);
      m3u8Content = response.data;
      m3u8Url = response.url;
    }
    //let playListResult = getAdFreeUrlListFromM3U8VodPlayList(m3u8Content, m3u8Url);
    let playListResult = getUrlListFromM3U8VodPlayList(m3u8Content, m3u8Url);
    let urlList = playListResult.urlList;
    // mux.js
    muxedData = null;
    for (let i=0; i<urlList.length; i++) {
      let tsSegmentUrl = urlList[i];
      debug(tsSegmentUrl);
      let response = await loadWebResourceAsync(tsSegmentUrl);
      let tsSegmentString = response.data;
      let tsSegment = stringToUint8Array(tsSegmentString);
      transmuxSegmentsToCombinedMp4(tsSegment, !i);
    }
    // create a blob and return
    let saveBlob = transmuxSegmentsToCombinedMp4Blob();
    if (resolve) {
      resolve(saveBlob);
    }
    return saveBlob;
  }

  //-------------------------------------------------------------------------------------------------------
  // >> site specific functions:

  async function findRedBullMedia(document, jsonMediaList) {
    let player = null;
    // RedBull:
    if (!player && document.querySelector('div.rbPlyr-container') && 'rbPlyr_rbPlyrwrapper' in window) {
      player = window.rbPlyr_rbPlyrwrapper;     
    }
    if (!player && document.querySelector('div.rbPlyr-rbupEl')) {
      let playerId = document.querySelector('div.rbPlyr-rbupEl').id;
      let playerName = "rbPlyr_" + playerId.replace(/-/g, "");
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
    let videoProps = ('getVidProps' in player) ? player.getVidProps() : null;
    if (videoInfo) {
      let videoTitle = videoInfo.title || videoProps ? videoProps.title : null;
      let videoDescription = videoInfo.subtitle;
      let videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
      let videoType = getExtensionFromUrl(videoUrl);
      let videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "live": false,
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
    let player = null;
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
      let videoInfo = player.getVidMeta();
      let videoTitle = videoInfo.title;
      let videoDescription = videoInfo.subtitle;
      let videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
      let videoType = getExtensionFromUrl(videoUrl);
      let videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "live": false,
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
    let player = null;
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
      let videoInfo = player.videoMetadata;
      let videoTitle = videoInfo.title;
      let videoDescription = videoInfo.description;
      let videoUrl = getAbsoluteUrl(videoInfo.videoUrl);
      let videoType = getExtensionFromUrl(videoUrl);
      let videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "live": false,
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
    let player = null;
    // Vimeo:
    if (!player && document.querySelector('.player video') && 'vimeo' in window) {
      debug("found Vimeo page");
      player = window.vimeo;
    }
    // VimeoPlayer:
    if (!player && document.querySelector('.player video') && 'VimeoPlayer' in window) {
      debug("found VimeoPlayer page");
      player = window.VimeoPlayer;
    }        
    if (!player) {
      return;     
    }
    debug("found Vimeo media page with player object");
    // retrieve media info from active player properties -> this can break if players change
    //debugJson(player.clip_page_config);
    let vimeoConfig = null;
    if (player && player.clip_page_config && player.clips && player.clip_page_config.clip) {
      debug("found Vimeo clips data (direct access to vimeoConfig)");
      vimeoConfig = player.clips[player.clip_page_config.clip.id];
    }
    if (!vimeoConfig) {
      // going the longer way over videoConfig Json info (to be downloaded)
      vimeoConfigUrl = null;
      if (player && player.clip_page_config && player.clip_page_config.player) {
        vimeoConfigUrl = player.clip_page_config.player.config_url;
      }
      if (!vimeoConfigUrl && document.URL.includes('player.vimeo.com')) {
        vimeoConfigUrl = document.URL + '/config';
      }
      if (!vimeoConfigUrl && player.clip_page_config && player.clip_page_config.clip && player.clip_page_config.clip.id) {
        vimeoConfigUrl = 'https://player.vimeo.com/video/' + player.clip_page_config.clip.id + '/config';
      }
      if (vimeoConfigUrl) {
        debug("found Vimeo ConfigUrl");
        //debug("vimeoConfigUrl: " + vimeoConfigUrl);
        let response = await loadWebResourceAsync(vimeoConfigUrl);
        let vimeoConfigJson = response.data;
        vimeoConfig = JSON.parse(vimeoConfigJson);
      }
    }
    if (vimeoConfig) {
      debug("found Vimeo Config");
      //debugJson("vimeoConfig:\n", vimeoConfig);
      let videoTitle = vimeoConfig.video.title;
      let videoDescription = "";
      //if (player && player.clip_page_config && player.clip_page_config.clip && player.clip_page_config.clip.title) {
      //  videoTitle = player.clip_page_config.clip.title;
      //}
      if (player && player.clip_page_config && player.clip_page_config.clip && player.clip_page_config.clip.description) {
        videoDescription = player.clip_page_config.clip.description;
      }
      let mediaEntry = {
        "title": videoTitle,
        "description": videoDescription,
        "qualities": []
      };
      //debugJson("vimeoConfig.request.files.progressive[]:\n", vimeoConfig.request.files.progressive);
      if (vimeoConfig && vimeoConfig.request && vimeoConfig.request.files && vimeoConfig.request.files.progressive) {
        debug("found Vimeo progressive formats");
        //if (mediaEntry.qualities.length < 1)
        {
          // add media download info
          vimeoConfig.request.files.progressive.forEach((format)=>{
            mediaEntry.qualities.push({
              "url": format.url,
              "type": getExtensionFromMimeType(format.mime),
              "quality": format.quality,
              "live": false,
              "adfree": false,
              "content": ""
            });
          });
        }
      }
      //debugJson("vimeoConfig.request.files.hls[]:\n", vimeoConfig.request.files.hls);
      if (vimeoConfig && vimeoConfig.request && vimeoConfig.request.files && vimeoConfig.request.files.hls) {
        debug("found Vimeo hls formats");
        //if (mediaEntry.qualities.length < 1)
        {
          // todo: add media download info
        }
      }
      //debugJson("vimeoConfig.request.files.dash[]:\n", vimeoConfig.request.files.dash);
      if (vimeoConfig && vimeoConfig.request && vimeoConfig.request.files && vimeoConfig.request.files.dash) {
        debug("found Vimeo dash formats");
        //if (mediaEntry.qualities.length < 1)
        {
          // todo: add media download info
        }
      }
      // live video (from hls section)
      if (vimeoConfig && vimeoConfig.request && vimeoConfig.request.files && vimeoConfig.request.files.hls && vimeoConfig.request.files.hls.cdns) {
        let m3u8MasterSrc = vimeoConfig.request.files.hls.cdns.akamai_live || vimeoConfig.request.files.hls.cdns.fastly_skyfire;
        if (m3u8MasterSrc)
        {
          debug("found Vimeo live stream");
          // todo: add media download info
          mediaEntry.qualities.push({
            "url": m3u8MasterSrc.url,
            "type": getExtensionFromUrl(m3u8MasterSrc.url),
            "quality": null,
            "live": true,
            "adfree": false,
            "content": ""
          });
        }  
      }
      // see if we found something:
      if (mediaEntry.qualities.length > 0) {
        jsonMediaList.mediaList.push(mediaEntry);
        return;
      }
    }
    else {
      debug("could not extract Vimeo media"); 
    }
  }
 
  async function findYouTubeMedia(document, jsonMediaList) {
    // YouTube:
    //<ytmusic-player id="player" class="style-scope ytmusic-player-page" mini-player-required_="" video-mode_="" playback-mode="OMV_PREFERRED" player-ui-state_="PLAYER_PAGE_OPEN" player-page-open_="" playable_=""><!--css-build:shady--><dom-if class="style-scope ytmusic-player"><template is="dom-if"></template></dom-if>
    if (!(document.querySelector('#ytd-player') || document.querySelector('ytmusic-player'))) {
      return;
    }
    let player = null;
    if (!player && 'ytplayer' in window) {
      debug('window.ytplayer');
      player = window.ytplayer;
    }
    if (!player || !player.config && 'yt' in window) {
      debug('window.yt.player');
      player = window.yt ? window.yt.player : null;
    }
    //if (!player || !player.config && 'getPlayer' in window) {
    //  debug('window.getPlayer()');
    //  player = window.getPlayer();
    //}
    //if (!player && 'yt' in window) {
    //  debug('window.yt');
    //  player = window.yt;
    //}
    //if (player && !player.config && 'getWebPlayerContextConfig' in window) {
    //  debug('window.getWebPlayerContextConfig()'); 
    //  player.config = window.getWebPlayerContextConfig();
    //}
    if (!player) {
      return;     
    }
    debug("found YouTube media page with player object");  
    debug('player: '+player);
    //for (var prop in window){debug(prop);}
    let ytcfg = player.config || window.ytcfg;// || window.ytInitialPlayerConfig || window.ytglobal;
    debugJson('ytcfg:\n', ytcfg);
    //debugJson('ytInitialPlayerConfig:\n', window.ytInitialPlayerConfig);
    //debugJson('ytglobal:\n', window.ytglobal);
    // retrieve media info from active player properties -> this can break if players change
    if ((ytcfg && ytcfg.args && ytcfg.args.video_id) &&
        (  player.player_response
        || player.playerResponse
        || ytcfg.args.player_response
        || ytcfg.args.raw_player_response)) {

      let plrResponseJson = player.player_response || player.playerResponse || ytcfg.args.player_response;
      let videoPlayerResponse = plrResponseJson ? JSON.parse(plrResponseJson) : null;
      videoPlayerResponse = videoPlayerResponse || ytcfg.args.raw_player_response;

      let videoID = ytcfg.args.video_id;

      let videoTitle=document.title || 'video';
      videoTitle=videoTitle.replace(/\s*\-\s*YouTube$/i, '').replace(/'/g, '\'').replace(/^\s+|\s+$/g, '').replace(/\.+$/g, '');
      videoTitle=videoTitle.replace(/[:"\?\*]/g, '').replace(/[\|\\\/]/g, '_'); //Mac, Linux, Windows
      if (((window.navigator.userAgent || '').toLowerCase()).indexOf('windows') >= 0) {
        videoTitle=videoTitle.replace(/#/g, '').replace(/&/g, '_'); //Windows
      } else {
        videoTitle=videoTitle.replace(/#/g, '%23').replace(/&/g, '%26'); //Mac, Linux
      }
      videoTitle=videoTitle.replace(/^\([0-9][0-9][0-9]\) /, '');

      let videoDescription = "";

      let entry = {
        "title": videoTitle,
        "description": videoDescription,
        "qualities": []
      };
      
      if (videoPlayerResponse.streamingData && videoPlayerResponse.streamingData.hlsManifestUrl) {
        debug("found YouTube live stream");
        let videoUrl = getAbsoluteUrl(videoPlayerResponse.streamingData.hlsManifestUrl);
        let videoType = getExtensionFromUrl(videoUrl);
        let videoQuality = null;
        entry.qualities.push({
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "live": true,
          "adfree": false,
          "content": ""
        });
      }
      else if (videoPlayerResponse.streamingData) {
        videoPlayerResponse.streamingData.formats.forEach( (format) => {
          // add youtube video info for download
          let videoUrl = getAbsoluteUrl(format.url);
          let videoType = getExtensionFromMimeType(format.mimeType);
          let videoQuality = format.qualityLabel; //format.width + 'x' format.height;
          if (format.signatureCipher) {
            let kvps = format.signatureCipher.split('&');
            kvps.forEach((kvp) => {
              parts = kvp.split('=');
              if (parts.length > 1) {
                debug("signature: " + parts[0] + " = " + parts[1]);
                if (parts[0].toLowerCase() == 'url') {
                  videoUrl = decodeURIComponent(parts[1]);
                }
              }
            });
          }
          if (videoUrl) {
            entry.qualities.push({
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality,
              "live": false,
              "adfree": false,
              "content": ""
            });
          }
        });
      }
      if (entry.qualities.length > 0) {
        jsonMediaList.mediaList.push(entry);
      }
    }
    else {
      debug("could not extract YouTube media"); 
    }
  }
 
  async function findArdMedia(document, jsonMediaList) {
    let player = null;
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
      let videoInfo = player._pixelConfig[0];
      let videoTitle = videoInfo.clipTitle;
      let videoDescription = videoInfo.agfMetaDataSDK.title;
      let videoUrl = getAbsoluteUrl(videoInfo.agfMetaDataSDK.assetid);
      let videoType = getExtensionFromUrl(videoUrl);
      let videoQuality = null;
      jsonMediaList.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality,
          "live": false,
          "adfree": false,
          "content": ""
        }]
      });
    }
    else {
      debug("could not extract ARD media"); 
    }
  }

  // << end of site specific functions
  //-------------------------------------------------------------------------------------------------------
  
  function QualityToNumber(quality) {
    if (!quality) {
      return 0;
    }
    if (quality.endsWith('p')) { //video format e.g.'720p' -> derive qnumber from pure value (ignoring progressive mark)
      quality = quality.substr(0, quality.length-1);
    }
    if (quality.lastIndexOf('x') >= 0) { //resolution e.g.'1920x1080' -> derive qnumber from height
      quality = quality.substr(quality.lastIndexOf('x')+1);
    }
    if (quality.startsWith('mp4a.') >= 0) { //audio codec e.g.'mp4a.40.2' -> derive qnumber from product of numbers
      let parts = quality.split('.');
      let number = parts.length > 1 ? parseInt(parts[1]) : 0;
      number *= parts.length > 2 ? parseInt(parts[2]) : 1;
      return number;
    }
    if (quality.startsWith('avc1.') >= 0) { //video codec e.g.'avc1.4d001f' -> derive qnumber from hexnumber
      let parts = quality.split('.');
      let number = parts.length > 1 ?  parseInt(parts[1]) : 0;
      return number;
    }
    return parseInt(quality);
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
      let jsonMediaList = {
        "mediaList": [/*{ 
          "title": "",
          "description": "",
          "qualities": [{
            "url": null,
            "type": "",
            "quality": "",
            "live": false,
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
      for (let i=jsonMediaList.mediaList.length; i>0; i--) {
        let entry = jsonMediaList.mediaList[i-1];
        for (let j=entry.qualities.length; j>0; j--) {
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
      // we need to use Array index operator in order to have a reference to mediaEntry since we are about to modify it
      // therefore we need to use a classical for loop instead of Array.forEach (which would deliver a copy of the mediaEntry)
      for (let i=0; i<jsonMediaList.mediaList.length; i++) {
        let mediaEntry = jsonMediaList.mediaList[i];
        // we need to run backwards over qualities since we add new entries
        for (let j=mediaEntry.qualities.length; j>0; j--) {
          let quality = mediaEntry.qualities[j-1];
          if (quality.type && quality.type.toLowerCase().startsWith("m3u8") && quality.quality == null) {
            //quality.quality = "m3u8-multi";
            let subQualities = await loadM3U8PlayListQualities(quality.url);
            // add the created downloadable quality playlists to mediaEntry for showing up in ui
            subQualities.forEach((subQuality) => {
              subQuality.live = quality.live;
              mediaEntry.qualities.push(subQuality)
            });
          }
        }
      }

      // postprocess m3u8 quality playlists (this adds modified copies of original quality playlists)
      for (let i=0; i<jsonMediaList.mediaList.length; i++) {
        let mediaEntry = jsonMediaList.mediaList[i];
        let subQualities = [];
        for (let j=0; j<mediaEntry.qualities.length; j++) {
          let quality = mediaEntry.qualities[j];
          if (quality.url && quality.type && quality.type.toLowerCase().startsWith("m3u8")) {
            let subQuality = await processQualityToAdFreeAsync(quality);
            if (subQuality) {
              // analyze for specific format without segments but with EXT-X-MAP tag
              let addedSpecificQuality = false;
              let m3u8Data = m3u8ParseData(subQuality.content);
              if (m3u8Data.segments.length < 1) {
                m3u8Data.tags.forEach((tag) => {
                  if (tag.name == 'EXT-X-MAP' && tag.uri) {
                    // todo: add media download info
                    subQualities.push({
                      "url": tag.uri,
                      "type": getExtensionFromUrl(tag.uri),
                      "quality": subQuality.quality,
                      "live": quality.live,
                      "adfree": false,
                      "content": ""
                    });
                    addedSpecificQuality = true;
                  }
                });  
              }
              if (!addedSpecificQuality) {
                subQualities.push(subQuality);
              }
            }
          }
        }
        // add the created downloadable quality playlists to mediaEntry for showing up in ui
        //subQualities.sort((streamA,streamB) => { return streamB.quality - streamA.quality; });
        subQualities.forEach((subQuality) => { mediaEntry.qualities.push(subQuality) });
      }
      
      // sort available qualities
      for (let i=0; i<jsonMediaList.mediaList.length; i++) {
        let mediaEntry = jsonMediaList.mediaList[i];
        mediaEntry.qualities.sort((streamA,streamB) => {
          //debug('qa: '+ QualityToNumber(streamA.quality));
          //debug('qb: '+ QualityToNumber(streamB.quality));
          return QualityToNumber(streamB.quality) - QualityToNumber(streamA.quality);
        });
      }

      // process title infos
      let defaultTitle = document.title || 'video';
      for (let i=0; i<jsonMediaList.mediaList.length; i++) {
        let mediaEntry = jsonMediaList.mediaList[i];
        mediaEntry.title = mediaEntry.title || defaultTitle;
      }
 
      // debug output of retieved media information
      jsonMediaList.mediaList.forEach((entry) => {
        entry.qualities.forEach((quality) => {
          debug("Title       : '" + entry.title + "'");
          debug("Description : '" + entry.description + "'");
          debug("Url         : '" + quality.url + "'");
          debug("Type        : '" + quality.type + "'");
          debug("Quality     : '" + quality.quality + "'");
          debug("Live        : '" + quality.live + "'");
          debug("AdFree      : '" + quality.adfree + "'");
          debug("Content     : '" + (quality.content.length > 0) ? quality.content.substr(0,7) + "...'" : "'");
          debug("------------------------------");
        });
      });

      // inject download ui
      jsonMediaList.mediaList.forEach((entry) => {
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
    var live = downloadInfo.live;

    // make valid filename from title and url
    var fileName = convertTitleToValidFilename(fileTitle);
    if (quality) {
      var qualiName = quality + (adfree ? '-AdFree' : '');
      fileName = fileName + " (" + qualiName + ")";
    }
    var mediaFileName = fileName + '.' + mediaType

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
      if (live) {
        var span = document.createElement("span");
        span.innerHTML = "&nbsp;&nbsp;";
        eldiv.appendChild(span);
        var videoFileName = fileName + ".m3u8";
        var spanSave = document.createElement("span");
        //spanSave.id = "i2d-popup-save" + fileName;
        spanSave.style = "font-size: 100%; cursor: pointer; color: rgb(153, 0, 0); float: right; display: inline; text-decoration: underline; padding-right: 10px;";
        spanSave.innerHTML = '[save m3u8]';
        spanSave.onclick = () => {
          //alert('async download of live stream into full m3u8 blob is already running');
          let isCanceled = false;
          spanSave.onclick = () => { alert('stop download of live stream and prepare saving'); isCanceled = true;};
          spanSave.innerHTML = '[save m3u8...]';
          spanSave.style.color = "rgb(80, 80, 80)";
          saveM3U8LivePlayListAsync(fileUrl, downloadInfo.content,
            (saveBlob) => {
              //alert("saveBlob created");
              //window.saveAs(videoBlob, videoFileName);
              spanSave.innerHTML = '[save m3u8 done]';
              spanSave.onclick = () => { }; //() => {alert('async download of live stream into full m3u8 blob completed'); };
              // add download anchor to the document:
              let saveUrl = window.URL.createObjectURL(saveBlob);
              let anc = document.createElement("a");
              anc.href = saveUrl;
              anc.target = '_blank';
              anc.download = saveUrl;
              anc.title = 'Download: "' + videoFileName + '"';
              anc.innerHTML = videoFileName;
              anc.style.color = "blue";
              anc.style.textDecoration = "underline";
              anc.style.cursor = "pointer";
              spanSave.appendChild(anc);
            },
            (error) => {
              spanSave.innerHTML = '[save m3u8 failed]';
              spanSave.onclick = () => { alert('async download of live stream into full m3u8 blob failed with error ' + error); };
            },
            () => { return isCanceled; }
          );
        };
        eldiv.appendChild(spanSave);
      }
      else {
        var span = document.createElement("span");
        span.innerHTML = "&nbsp;&nbsp;";
        eldiv.appendChild(span);
        var videoFileName = fileName + ".mp4";
        var spanSave = document.createElement("span");
        //spanSave.id = "i2d-popup-save" + fileName;
        spanSave.style = "font-size: 100%; cursor: pointer; color: rgb(153, 0, 0); float: right; display: inline; text-decoration: underline; padding-right: 10px;";
        spanSave.innerHTML = '[save mp4]';
        spanSave.onclick = () => {
          spanSave.onclick = () => { alert('async download of live stream into full mp4 blob is already running'); };
          spanSave.innerHTML = '[save mp4...]';
          spanSave.style.color = "rgb(80, 80, 80)";
          saveM3U8VideoAsMP4Async(fileUrl, downloadInfo.content,
            (saveBlob) => {
              //alert("saveBlob created");
              //let saveUrl = window.URL.createObjectURL(saveBlob);
              //window.saveAs(videoBlob, videoFileName);
              spanSave.innerHTML = '[save mp4 done]';
              spanSave.onclick = () => { alert('async download of live stream into full mp4 blob completed'); };
              // add download anchor to the document:
              let saveUrl = window.URL.createObjectURL(saveBlob);
              let anc = document.createElement("a");
              anc.href = fileUrl;
              anc.target = '_blank';
              anc.download = saveUrl;
              anc.title = 'Download: "' + videoFileName + '"';
              anc.innerHTML = videoFileName;
              anc.style.color = "blue";
              anc.style.textDecoration = "underline";
              anc.style.cursor = "pointer";
              spanSave.appendChild(anc);
            },
            (error) => {
              spanSave.innerHTML = '[save m3u8 failed]';
              spanSave.onclick = () => { alert('async download of live stream into full mp4 blob failed with error ' + error); };
            }
          );
        };
        eldiv.appendChild(spanSave);
      }
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
  // @source https://github.com/eligrey/FileSaver.js
  //... removed since it makes trouble with IOS Safari
  // see also: https://github.com/eligrey/canvas-toBlob.js
  // see also: https://github.com/eligrey/Blob.js
 
  debug('userAgent: ' + navigator.userAgent);
  debug('docUrl: '+ document.URL)
  // detect Apple OS Safari browser: https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
  //let isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));
  //debug('isSafari: ' + isSafari);  
  
  // start page analysis:
  if (muxjsUrl) {
    // load mux.js script and start analysing page defered  
    injectScript(muxjsUrl, ()=>{
      debug("analysePage - OnMuxJsLoad()");
      //muxJs = window['muxjs'];
      analysePageAndCreateUiAsync();
    });
  }
  else {
    // start analysing page immediately
    debug("analysePage - OnMainStart()");
    analysePageAndCreateUiAsync();      
  }
}


  console.log("[Media Download] MAINSTART on page: " + window.location.href);
  // define the id for this script
  // this is reqired for detecting/tagging the injected script code 
  // this name pattern is also used by the IOS Safari ProcessWebPage applet (based on Scriptable app/engine)
  let ThisScriptId = 'ProcessWebPage_Main';

  // we bypass injection if we run under ProcessWebPage control (no sandboxing)
  if (document.getElementById(ThisScriptId)) {
     console.log("[Media Download] starting");   
     //we run in page (ProcessWebPage) > no further injection required
     CodeToInject('');
     return;
  }
  
  function injectCode() {
    console.log("[Media Download] injectCode");
    // inject script into page in order to run in page context
    var chromeExtensionScriptUrl = (chrome && chrome.runtime) ? chrome.runtime.getURL('') : null;
    var setupScriptCode = CodeToInject.toString();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = ThisScriptId;
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

})(); //(function content() {
