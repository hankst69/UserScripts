﻿// ==UserScript==
// @name        WebSite Media Download
// @namespace   savnt
// @description Adds a download button to video player pages
// @copyright   2019-2022, savnt
// @license     MIT
// @version     0.5.10
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

    function transmuxSegmentsToCombinedMp4(nextSegmentData, resetTransmuxer, progress) {
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
          injectScript(muxjsUrl, () => {
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
          transmuxer = new muxjs.mp4.Transmuxer({ remux: false });
        }

        transmuxer.on('data', function (event) {
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

          let muxedSegments = remuxedSegments.length;
          for (let j = 0, i = offset; j < remuxedSegments.length; j++) {
            bytes.set(remuxedSegments[j].data, i);
            i += remuxedSegments[j].byteLength;
          }
          muxedData = bytes;
          remuxedSegments = [];
          remuxedBytesLength = 0;
          if (progress) progress(muxedSegments);
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

    function stringToUint8Array(str) {
      //let buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
      //let srcBufView = new Uint16Array(buf);
      //let tgtBufView = new Uint8Array(buf);
      //for (let i=0, strLen=str.length; i < strLen; i++) {
      //  srcBufView[i] = str.charCodeAt(i);
      //}
      //return tgtBufView;
      let ui8buf = new Uint8Array(str.length);
      for (let i = 0, strLen = str.length; i < strLen; i++) {
        ui8buf[i] = str.charCodeAt(i);
      }
      return ui8buf;
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
        lines.forEach((line) => {
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

    function injectScript(url, cb, variable = null) {
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
          url = url.substr(lastSlashPos + 1);
        }
        let extPos = url.lastIndexOf('.');
        let extStr = extPos < 0 ? 'blob' : url.substr(extPos + 1);
        let qustnmrkPos = extStr.indexOf('?');
        if (qustnmrkPos > 0) {
          extStr = extStr.substr(0, qustnmrkPos);
        }
        if (extStr.length > 4) {
          extStr = extStr.substr(0, 4);
        }
        if (extStr.endsWith('#')) {
          extStr = extStr.substr(0, extStr.length - 1);
        }
        return extStr.toLowerCase();
      }
      return null;
    }

    function getExtensionFromMimeType(mime) {
      if (mime) {
        let firstSlashPos = mime.indexOf('/');
        if (firstSlashPos > 0) {
          //let mediaType = mime.substr(0,firstSlashPos);
          let firstSemicolonPos = mime.indexOf(';');
          if (firstSemicolonPos < 0) {
            firstSemicolonPos = mime.length;
          }
          let extType = mime.substr(firstSlashPos + 1, firstSemicolonPos - firstSlashPos - 1);
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

    async function sleep(ms) {
      let sleepPromise = new Promise(resolve => setTimeout(resolve, ms));
      await sleepPromise;
    }

  //-------------------------------------------------------------------

  class HttpRequest {
    constructor() {
      if (window.XMLHttpRequest) {
        // code for modern browsers
        this.xhr = new XMLHttpRequest();
      } else {
        // code for old IE browsers
        xhr = new ActiveXObject("Microsoft.XMLHTTP");
      }
    }

    async downloadHeaderAsyncSafe(url) {
      try {
        let response = await this.downloadHeaderAsync(url);
        return response;
      }
      catch (error) {
         return null;
      }
    }

    async downloadAsyncSafe(url) {
      try {
        let response = await this.downloadAsync(url);
        return response;
      }
      catch (error) {
         return null;
      }
    }

    async downloadAsync(url) {
      let promise = new Promise((resolve, reject) => {
        let method = 'GET';
        let xhr = this.xhr;
        if (!xhr) {
          reject('XHR not supported');
          return;
        }
        if ("withCredentials" in xhr) {
          xhr.open(method, url, /*async*/true /*, username, password*/);
        } else {
          xhr.open(method, url);
        }
        //xhr.overrideMimeType('text/xml');
        //xhr.setRequestHeader('Content-Type', 'application/xml');
        //xhr.setRequestHeader('Content-Type', 'application/json');
        //xhr.setRequestHeader('Content-Type', 'application/' + type);
        //xhr.setRequestHeader('Content-Type', 'text/xml');
        xhr.setRequestHeader('Content-Type', 'text/plain');
        // it might be necessary to enable CORS (in chrome by patching request/response headers)
        //if (url.startsWith('https://live-api.cloud.vimeo.com')) { xhr.setRequestHeader("Origin", 'vimeocdn.com'); }
        xhr.onloadstart = function () {
        }
        xhr.onload = function () {
          let response = {
            "url": xhr.responseURL,
            "status": xhr.status,
            "data": xhr.responseText
          };
          resolve(response);
        }
        xhr.onerror = function () {
          reject('XHR request failed with readyState:' + xhr.readyState + ' status:' + xhr.status + ' statusText:' + xhr.statusText);
        }
        xhr.send();
      });
      return promise;
    }

    async downloadHeaderAsync(url) {
      let promise = new Promise((resolve, reject) => {
        let method = 'HEAD';
        let xhr = this.xhr;
        if (!xhr) {
          reject('XHR not supported');
          return;
        }
        if ("withCredentials" in xhr) {
          xhr.open(method, url, /*async*/true /*, username, password*/);
        } else {
          xhr.open(method, url);
        }
        xhr.setRequestHeader('Content-Type', 'text/plain');
        // it might be necessary to enable CORS (in chrome by patching request/response headers)
        //if (url.startsWith('https://live-api.cloud.vimeo.com')) { xhr.setRequestHeader("Origin", 'vimeocdn.com'); }
        xhr.onloadstart = function () {
        }
        xhr.onload = function () {
          let response = {
            "url": xhr.responseURL,
            "status": xhr.status,
            "data": xhr.responseText
          };
          resolve(response);
        }
        xhr.onerror = function () {
          reject('XHR request failed with readyState:' + xhr.readyState + ' status:' + xhr.status + ' statusText:' + xhr.statusText);
        }
        xhr.send();
      });
      return promise;
    }

    // it might be necessary to enable CORS (in chrome by patching request/response headers)
    // for following url patterns:
    //   *://*/*
    //   https://rbmn-live.akamaized.net/*
    //   https://live-api.cloud.vimeo.com/*
    //   'vimeocdn.com';
  
    //  var accessControlRequestHeaders;
    //  var exposedHeaders;

    //  var requestListener = function (details) {
    //    var flag = false;
    //    // Specify a `name` and `value` property within `rule` to
    //    // customize a request header. For instance, the commented
    //    // out values will include in the header "Origin: 'https://my_changed_origin.com'"
    //    var rule = null;
    //    // var rule = {
    //    //   name: "Origin",
    //    //   value: "https://my_changed_origin.com"
    //    // };	
    //    var i;
    //    for (i = 0; i < details.requestHeaders.length; ++i) {
    //      if (rule && details.requestHeaders[i].name.toLowerCase() === rule.name.toLowerCase()) {
    //        flag = true;
    //        details.requestHeaders[i].value = rule.value;
    //        break;
    //      }
    //    }
    //    if (!flag) details.requestHeaders.push(rule);

    //    for (i = 0; i < details.requestHeaders.length; ++i) {
    //      if (details.requestHeaders[i].name.toLowerCase() === "access-control-request-headers") {
    //        accessControlRequestHeaders = details.requestHeaders[i].value
    //      }
    //    }

    //    return { requestHeaders: details.requestHeaders };
    //  };

    //  var responseListener = function (details) {
    //    var flag = false,
    //      rule = {
    //        "name": "Access-Control-Allow-Origin",
    //        "value": "*"
    //      };

    //    for (var i = 0; i < details.responseHeaders.length; ++i) {
    //      if (details.responseHeaders[i].name.toLowerCase() === rule.name.toLowerCase()) {
    //        flag = true;
    //        details.responseHeaders[i].value = rule.value;
    //        break;
    //      }
    //    }
    //    if (!flag) details.responseHeaders.push(rule);

    //    if (accessControlRequestHeaders) {

    //      details.responseHeaders.push({ "name": "Access-Control-Allow-Headers", "value": accessControlRequestHeaders });

    //    }

    //    if (exposedHeaders) {
    //      details.responseHeaders.push({ "name": "Access-Control-Expose-Headers", "value": exposedHeaders });
    //    }

    //    details.responseHeaders.push({ "name": "Access-Control-Allow-Methods", "value": "GET, PUT, POST, DELETE, HEAD, OPTIONS" });

    //    return { responseHeaders: details.responseHeaders };

    //  };

    //  /*On install*/
    //  chrome.runtime.onInstalled.addListener(function () {
    //    chrome.storage.local.set({ 'active': false });
    //    chrome.storage.local.set({ 'urls': ["<all_urls>"] });
    //    chrome.storage.local.set({ 'exposedHeaders': '' });
    //    reload();
    //  });

    //  /*Reload settings*/
    //  function reload() {
    //    chrome.storage.local.get({ 'active': false, 'urls': ["<all_urls>"], 'exposedHeaders': '' }, function (result) {

    //      exposedHeaders = result.exposedHeaders;

    //      /*Remove Listeners*/
    //      chrome.webRequest.onHeadersReceived.removeListener(responseListener);
    //      chrome.webRequest.onBeforeSendHeaders.removeListener(requestListener);

    //      if (result.active) {
    //        chrome.browserAction.setIcon({ path: "on.png" });

    //        if (result.urls.length) {

    //          /*Add Listeners*/
    //          chrome.webRequest.onHeadersReceived.addListener(responseListener, {
    //            urls: result.urls
    //          }, ["blocking", "responseHeaders"]);

    //          chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, {
    //            urls: result.urls
    //          }, ["blocking", "requestHeaders"]);
    //        }
    //      } else {
    //        chrome.browserAction.setIcon({ path: "off.png" });
    //      }
    //    });
    //  }
  }

  //-------------------------------------------------------------------

  class M3U8Tag {
    constructor(tagName, tagValues, tagAttributes, tagUri) {
      this.name = tagName;
      this.values = tagValues;
      this.attributes = tagAttributes;
      this.uri = tagUri;
    }
    //get name() { return this.name; }
    //set name(value) { this.name = value; }
    //get values() { return this.values; }
    //set values(value) { this.values = value; }
    //get attributes() { return this.attributes; }
    //set attributes(value) { this.attributes = value; }
    //get uri() { return this.uri; }
    //set uri(value) { this.uri = value; }

    get value() {
      if (this.values && this.values.length > 0) {
        return this.values[0];
      }
      return null;
    }

    is(tagName) {
      return (this.name == tagName.toUpperCase());
    }

    attribute(name) {
      for (let i = 0; i < this.attributes.length; i++) {
        if (this.attributes[i].name == name.toUpperCase()) {
          //return this.attributes[i].value;
          return this.attributes[i];
        }
      }
      return null;
    }

    valueOf(name) {
      let attrib = this.attribute(name);
      return attrib ? attrib.value : null;
    }

    unquotedValueOf(name) {
      let attrib = this.attribute(name);
      return attrib ? attrib.valueUnquoted : null;
    }
  }

  class M3U8Data {
    //m3u8Data {
    //  "tags": [],
    //  "segments": []
    //};
    //m3u8Tag {
    //  "name": null,
    //  "values": [],
    //  "attributes": [],
    //  "uri": null,
    //  "segment" : null
    //};
    //m3u8Segment {
    //  "name": null,
    //  "number": 0,
    //  "time": null,
    //  "uri": null
    //};
    //m3u8Attribute {
    //  "name": null,
    //  "value": null,
    //  "valueUnquoted": null
    //};
    constructor(m3u8StringOrData = null) {
      this.tags = [];
      this.segments = [];
      if (m3u8StringOrData == null) {
        return;
      }
      if (m3u8StringOrData instanceof M3U8Data) {
        this.tags = m3u8StringOrData.tags;
        this.segments = m3u8StringOrData.segments;
        return;
      }
      if (typeof m3u8StringOrData == 'string') {
        this.initFromString(m3u8StringOrData);
        return;
      }
    }
    //get tags() { return this.tags; }
    //set tags(value) { this.tags = value; }
    //get segments() { return this.segments; }
    //set segments(value) { this.segments = value; }

    initFromString(m3u8DataString) {
      this.tags = [];
      this.segments = [];
      if (typeof m3u8DataString != 'string') {
        return null;
      }
      let m3u8Data = this.parseData(m3u8DataString);
      if (m3u8Data == null) {
        return null;
      }
      this.tags = m3u8Data.tags;
      this.segments = m3u8Data.segments;
      return this;
    }

    async initFromUrl(m3u8Url) {
      this.tags = [];
      this.segments = [];
      if (typeof m3u8Url != 'string') {
        return null;
      }
      let m3u8Data = await M3U8Data.loadAsync(m3u8Url);
      if (m3u8Data == null) {
        return null;
      }
      this.tags = m3u8Data.tags;
      this.segments = m3u8Data.segments;
      return this;
    }

    equals(m3u8Data) {
      if (m3u8Data instanceof M3U8Data) {
        return this.toString() == m3u8Data.toString();
      }
      return false;
    }

    get segmentUris() {
      let urlList = [];
      this.segments.forEach((segment) => {
        urlList.push(segment.uri);
      });
      return urlList;
    }

    containsTag(name) {
      for (let i = 0; i < this.tags.length; i++) {
        if (this.tags[i].name == name.toUpperCase()) {
          return true;
        }
      }
      return false;
    }

    tag(name) {
      for (let i = 0; i < this.tags.length; i++) {
        if (this.tags[i].name == name.toUpperCase()) {
          return this.tags[i];
        }
      }
      return null;
    }

    valueOf(name) {
      // returns first value of given tag
      if (this.containsTag(name)) {
        return this.tag(name).value;
      }
      return null;
    }

    tagAsSegment(tag) {
      if (tag && tag.name && tag.name == 'EXTINF' && tag.uri && tag.values.length > 0) {
        let name = tag.uri;
        let slashPos = name.lastIndexOf('/');
        if (slashPos > 0) {
          name = name.substr(slashPos + 1);
        }
        let dotPos = name.lastIndexOf('.');
        if (dotPos > 0) {
          name = name.substr(0, dotPos);
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

    parseTag(m3u8TagString) {
      if (typeof m3u8TagString != 'string') {
        return null;
      }
      m3u8TagString = m3u8TagString.trim();
      if (m3u8TagString.startsWith('#')) {
        m3u8TagString = m3u8TagString.substr(1);
      }
      if (m3u8TagString.length < 1 || m3u8TagString == 'EXT') {
        // empty line
        return null;
      }
      // we have some kind of a valid tag:
      let m3u8Tag = new M3U8Tag(null, [], [], null);
      //// dailymotion '#CELL' fix:
      //m3u8TagString = m3u8TagString.replace('\n#','#');
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
          if (!attribute || attribute.length < 1) {
            return;
          }
          let attribKvp = attribute.split('=');
          if (attribKvp.length < 2) {
            // just a pure value
            let value = attribute;
            // dailymotion fix: quote if not quoted completely
            if (value && value.startsWith('"') && !value.endsWith('"')) { value = value + '"'; }
            if (value && !value.startsWith('"') && value.endsWith('"')) { value = '"' + value; }
            m3u8Tag.values.push(value);
          }
          else {
            let name = attribKvp[0].toUpperCase(); 
            let value = attribKvp[1];
            if (attribKvp.length > 2 && value.startsWith('"') && !value.endsWith('"') && attribKvp[attribKvp.length - 1].endsWith('"')) {
              // we split unwillingly the attribute argument since it contained '=' characters
              for (let i = 2; i < attribKvp.length; i++) {
                value += '=' + attribKvp[i];
              }
            }
            //// dailymotion fix: quote if not quoted completely
            //if (value && value.startsWith('"') && !value.endsWith('"')) { value = value + '"'; }
            //if (value && !value.startsWith('"') && value.endsWith('"')) { value = '"' + value; }
            //let attr = new m3u8Attribute(name, value, null);
            let attr = {
              "name": name,
              "value": value,
              "valueUnquoted": null
            };
            // remove bracing quotes
            attr.valueUnquoted = attr.value;
            if (attr.value && attr.value.startsWith('"') && attr.value.endsWith('"')) {
              attr.valueUnquoted = attr.value.substr(1, attr.value.length - 2);
            }
            m3u8Tag.attributes.push(attr);
            // special service for UIR attributes -> copy uri into tag.uri
            if (!m3u8Tag.uri && attr.name == "URI") {
              m3u8Tag.uri = attr.valueUnquoted;
            }
          }
        });
      }
      return m3u8Tag;
    }

    parseData(m3u8DataString) {
      if (typeof m3u8DataString != 'string') {
        return null;
      }
      let m3u8Data = new M3U8Data();
      m3u8DataString = m3u8DataString.trim();
      let m3u8TagStrings = m3u8DataString.split('#EXT');
      m3u8TagStrings.forEach((tagString) => {
        let tag = this.parseTag('EXT'+tagString);
        if (tag && tag.name) {
          // we parsed a valid tag -> we try to convert it into an segment
          let segment = this.tagAsSegment(tag);
          if (segment) {
            m3u8Data.segments.push(segment);
            tag.segment = segment;
          }
          m3u8Data.tags.push(tag);
        }
      });
      return m3u8Data;
    }

    complementUri(urlIn, baseUrlIn) {
      // complement url if necessary
      if (!urlIn || urlIn.toLowerCase().startsWith('http') || urlIn.toLowerCase().startsWith('blob')) {
        return urlIn;
      }
      let baseUrl = baseUrlIn;
      let lastSlashPos = baseUrlIn.lastIndexOf('/');
      if (lastSlashPos > 0) {
        baseUrl = baseUrlIn.substr(0, lastSlashPos);
      }
      let needSlash = !urlIn.startsWith('/');
      let url = baseUrl + (needSlash ? '/' : '') + urlIn;
      // concat baseUrl search if necessary:
      let searchStartPos = baseUrlIn.indexOf('?');
      if (searchStartPos > 0 && searchStartPos < baseUrlIn.length - 1 && searchStartPos > lastSlashPos) {
        let queryStartPos = url.indexOf('?');
        if (queryStartPos < 0) {
          url = url + '?' + baseUrlIn.substr(searchStartPos + 1);
        } else {
          url = url + '&' + baseUrlIn.substr(searchStartPos + 1);
        }
      }
      return url;
    }

    complementUris(baseUrl) {
      for (let i = 0; i < this.tags.length; i++) {
        this.tags[i].uri = this.complementUri(this.tags[i].uri, baseUrl);
        for (let j = 0; j < this.tags[i].attributes.length; j++) {
          if (this.tags[i].attributes[j].name == "URI") {
            let newUri = this.complementUri(this.tags[i].attributes[j].valueUnquoted, baseUrl);
            this.tags[i].attributes[j].valueUnquoted = newUri;
            this.tags[i].attributes[j].value = '"' + newUri + '"';
          }
        }
      }
      for (let i = 0; i < this.segments.length; i++) {
        this.segments[i].uri = this.complementUri(this.segments[i].uri, baseUrl);
      }
    }

    toString() {
      let fullList = "";
      let appendEndList = false;
      this.tags.forEach((tag) => {
        if (!tag) {
          return;
        }
        if (tag.name == 'EXTINF') {
          return;
        }
        if (tag.name == 'EXT-X-ENDLIST') {
          appendEndList = true;
          return;
        }
        fullList += '#' + tag.name;
        if (tag.values.length > 0 || tag.attributes.length > 0) {
          fullList += ':';
          tag.values.forEach((value) => {
            fullList += value + ',';
          });
          tag.attributes.forEach((attr) => {
            fullList += attr.name + '=' + attr.value + ',';
          });
          if (fullList.endsWith(',')) {
            fullList = fullList.substr(0, fullList.length - 1);
          }
        }
        fullList += '\n';
      });
      this.segments.forEach((segment) => {
        if (!segment.uri || segment.uri.length < 1) {
          return;
        }
        fullList += '#EXTINF:' + segment.time + ',\n' + segment.uri;
        fullList += '\n';
      });
      if (appendEndList) {
        fullList += '#EXT-X-ENDLIST\n';
      }
      return fullList;
    }

    static async loadAsync(url) {
      try {
        let httpRequest = new HttpRequest();
        let response = await httpRequest.downloadAsync(url);
        let m3u8Data = new M3U8Data(response.data);
        m3u8Data.complementUris(response.url);
        return m3u8Data;
      }
      catch (error) {
        // log the error
        console.error("M3U8Data::loadAsync exception occured: '" + error + "'");
        // return empty instance
        return new M3U8Data();
      }
    }
  };

  //-------------------------------------------------------------------
  // CLASS M3u8Playlist

  class M3u8Playlist {
    //m3u8Master = {
    //  "uri": null,
    //  "islive": false,
    //  "streams": [],
    //
    //  "m3u8text": null,
    //  "m3u8data": null,
    //  "downloadblob": null
    //};
    //m3u8Stream = {
    //  "uri": url,           //https://dms.redbull.tv/dms/media/AP-1XCY6DVFN1W11/1920x1080@7556940/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjYXRlZ29yeSI6InBlcnNvbmFsX2NvbXB1dGVyIiwib3NfZmFtaWx5IjoiaHR0cCIsIm9zX3ZlcnNpb24iOiIiLCJ1aWQiOiIwMmRjMzc1Mi01NjA4LTQ3YWMtOGY3Mi1hNmUwZDE5ZTI3MWYiLCJsYXRpdHVkZSI6MC4wLCJsb25ndGl0dWRlIjowLjAsImNvdW50cnlfaXNvIjoiZGUiLCJhZGRyZXNzIjoiMjAwMzplYTo5NzI4OjIwMDA6YjQ2MDpkZGZhOjJiODg6M2QwMCIsInVzZXItYWdlbnQiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzQuMC4zNzI5LjE1NyBTYWZhcmkvNTM3LjM2IiwiZGV2aWNlX3R5cGUiOiIiLCJkZXZpY2VfaWQiOiIiLCJpYXQiOjE1NTgwNDQ3NTJ9.sTG_v7V_mGR2DMsvjVC10fOmvpfJR3T4h78Y5VaFa-w=/playlist.m3u8
    //  "islive": false,
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
    //constructor(m3u8StringOrData = null) {
    //}
    //function m3u8GetAudioCodecFromCodecs() {
    //}
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
    //parse:
    //#EXTM3U
    //#EXT-X-INDEPENDENT-SEGMENTS
    //#EXT-X-VERSION:6
    //#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="Subtitles",NAME="German",FORCED=NO,LANGUAGE="ger",URI="playlist.m3u8"
    //#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="German",LANGUAGE="de",AUTOSELECT=YES,URI="FO-26WQ2N6ESBH16.m3u8"
    //#EXT-X-STREAM-INF:BANDWIDTH=7570689,AVERAGE-BANDWIDTH=6110867,CODECS="avc1.640028,mp4a.40.2",RESOLUTION=1920x1080,AUDIO="audio",FRAME-RATE=25.0
    //FO-26WQ2N6ESBH15.m3u8
    //#EXT-X-STREAM-INF:BANDWIDTH=1963711,AVERAGE-BANDWIDTH=1576374,CODECS="avc1.4D401F,mp4a.40.2",RESOLUTION=960x540,AUDIO="audio",FRAME-RATE=25.0
    //FO-26WQ2N6ESBH13.m3u8
    //#EXT-X-STREAM-INF:BANDWIDTH=1058492,AVERAGE-BANDWIDTH=889347,CODECS="avc1.4D401E,mp4a.40.2",RESOLUTION=640x360,AUDIO="audio",FRAME-RATE=25.0
    //FO-26WQ2N6ESBH12.m3u8
    //#EXT-X-STREAM-INF:BANDWIDTH=3734151,AVERAGE-BANDWIDTH=2991914,CODECS="avc1.4D401F,mp4a.40.2",RESOLUTION=1280x720,AUDIO="audio",FRAME-RATE=25.0
    //FO-26WQ2N6ESBH14.m3u8
    //#EXT-X-STREAM-INF:BANDWIDTH=610169,AVERAGE-BANDWIDTH=536072,CODECS="avc1.4D401E,mp4a.40.2",RESOLUTION=426x240,AUDIO="audio",FRAME-RATE=25.0
    //FO-26WQ2N6ESBH11.m3u8
    // return m3u8Stream;
    //}
  };

  // --------------------------------------------------------------------

  async function cleanM3u8FromBadSegments(m3u8Data) {
    debug("cleanM3u8FromBadSegments()");
    let cleanedData = new M3U8Data(m3u8Data);
    cleanedData.segments = [];
    for (const seg of m3u8Data.segments) {    
      let httpRequest = new HttpRequest();
      let response = await httpRequest.downloadHeaderAsyncSafe(seg.uri);
      if (response && response.status == 200) {
        cleanedData.segments.push(seg);
      } else {
        let response = await httpRequest.downloadAsyncSafe(seg.uri);
        if (response && response.status == 200) {
          cleanedData.segments.push(seg);
        }
      }
    }
    return cleanedData;
  }

  async function loadM3U8PlayListQualities(m3u8Url, isLive) {
    debug("loadM3U8PlayListQualities()");

    // 1) analyse master playlist and detect stream qualities
    let streamQualities = [];
    let m3u8MasterData = null;
    {
      debug("loadM3U8MasterPlayListAsync()");
      let m3u8Data = await M3U8Data.loadAsync(m3u8Url);
      for (const tag of m3u8Data.tags) {
        if (tag.is('EXT-X-STREAM-INF')) {
          m3u8MasterData = m3u8Data;
          //#EXT-X-STREAM-INF:BANDWIDTH=7570689,AVERAGE-BANDWIDTH=6110867,CODECS="avc1.640028,mp4a.40.2",RESOLUTION=1920x1080,AUDIO="audio",FRAME-RATE=25.0
          streamQualities.push({
            "url": tag.uri,
            "type": 'm3u8',//getExtensionFromUrl(tag.uri),
            "quality": tag.unquotedValueOf('RESOLUTION'),
            "islive": isLive
          });
          if (tag.valueOf('PROGRESSIVE-URI') != null) {
            let uri = tag.attribute('PROGRESSIVE-URI').valueUnquoted;
            streamQualities.push({
              "url": uri,
              "type": getExtensionFromUrl(uri),
              "quality": tag.unquotedValueOf('RESOLUTION'),
              "islive": false
            });
          }
        }
        if (tag.is('EXT-X-MEDIA') && tag.unquotedValueOf('TYPE') == 'AUDIO' && tag.uri != null) {
          m3u8MasterData = m3u8Data;
          //#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="German",LANGUAGE="de",AUTOSELECT=YES,URI="FO-26WQ2N6ESBH16.m3u8"
          let quality = tag.unquotedValueOf('LANGUAGE');
          if (!quality) {
            let quname1 = tag.unquotedValueOf('GROUP-ID');
            let quname2 = tag.unquotedValueOf('NAME');
            let channels = tag.unquotedValueOf('CHANNELS');
            quality = quname1;
            if (quname1 && quname2 && quname2.length > quname1.length) {
              quality = quname2;
            }
            if (channels) {
              quality += '-' + channels;
            }
          }
          streamQualities.push({
            "url": tag.uri,
            "type": 'm3u8',//getExtensionFromUrl(tag.uri),
            "quality": quality,
            "islive": isLive,
            "isaudio": true
          });
        }
        if (tag.is('EXT-X-MEDIA') && tag.unquotedValueOf('TYPE') == 'SUBTITLES' && tag.uri != null) {
          m3u8MasterData = m3u8Data;
          //#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="Subtitles",NAME="German",FORCED=NO,LANGUAGE="ger",URI="playlist.m3u8"
          let quality = tag.unquotedValueOf('LANGUAGE');
          if (!quality) {
            let quname1 = tag.unquotedValueOf('GROUP-ID');
            let quname2 = tag.unquotedValueOf('NAME');
            let channels = tag.unquotedValueOf('CHANNELS');
            quality = quname1;
            if (quname1 && quname2 && quname2.length > quname1.length) {
              quality = quname2;
            }
            if (channels) {
              quality += '-' + channels;
            }
          }
          streamQualities.push({
            "url": tag.uri,
            "type": 'm3u8',//getExtensionFromUrl(tag.uri),
            "quality": quality,
            "islive": isLive,
            "issubtitle": true
          });
        }
        if (tag.is('EXT-X-PLAYLIST-TYPE') && tag.value == 'VOD') {
          //m3u8MasterData = m3u8Data;
          streamQualities.push({
            "url": m3u8Url,
            "type": 'm3u8',
            "quality": 'VOD',
            "islive": isLive
          });
          let cleanedData = await cleanM3u8FromBadSegments(m3u8Data);
          let saveBlob = new Blob([cleanedData.toString()], { type: "text/html;charset=UTF-8" });
          let saveUrl = window.URL.createObjectURL(saveBlob);
          streamQualities.push({
            "url": saveUrl,
            "type": 'm3u8',
            "quality": 'CLEANED',
            "islive": isLive
          });
        }
      }
      //return streamQualities;
    }

    // 2) load data of master playlist and stream playlists and create downloadable blobs
    let loadedStreamQualities = [];
    {
      debug("loadM3U8StreamQualitiesAsync()");
      if (m3u8MasterData) {
        // create a downloadable blob
        let saveBlob = new Blob([m3u8MasterData.toString()], { type: "text/html;charset=UTF-8" });
        let saveUrl = window.URL.createObjectURL(saveBlob);
        loadedStreamQualities.push({
          "url": saveUrl,
          "type": 'm3u8',
          "quality": 'master',
          "islive": isLive,
          "isloaded": true,
          "content": m3u8MasterData
        });
      }
      if (!isLive) {
        // live stream playlist are 'dynamic' -> it makes no sense to load the current data and provide as blob
        for (let i = 0; i < streamQualities.length; i++) {
          let streamQuality = streamQualities[i];
          debug("loadM3U8StreamQualityAsync()");
          if (!streamQuality.type.startsWith('m3u8')) {
            //return null;
            continue;
          }
          let m3u8Data = await M3U8Data.loadAsync(streamQuality.url);
          if (m3u8Data.segments.length < 1) {
            debug("given stream playlist does not contain segments -> exit early")
            //return null;
            continue;
          }
          let blobData = m3u8Data.toString();
          let blobType = 'm3u8';//streamQuality.type;
          // special handling for subtitles
          if (streamQuality.issubtitle && m3u8Data.segments.length == 1) {
            let url = m3u8Data.segments[0].uri;
            try {
              let httpRequest = new HttpRequest();
              let response = await httpRequest.downloadAsync(url);
              blobData = response.data;
              blobType = getExtensionFromUrl(url);
            }
            catch (error) {
              // log the error
              console.error("loadM3U8StreamQualitiesAsync() exception occured: '" + error + "'");
              // return empty values
              blobData = 'error';
              blobType = 'error';
            }
          }
          // create a downloadable blob
          let saveBlob = new Blob([blobData], { type: "text/html;charset=UTF-8" });
          let saveUrl = window.URL.createObjectURL(saveBlob);
          let loadedQuality = {
            "url": saveUrl,
            "type": blobType,
            "quality": streamQuality.quality,
            "islive": streamQuality.islive,
            "isaudio": streamQuality.isaudio,
            "issubtitle": streamQuality.issubtitle,
            "isloaded": true,
            "content": m3u8Data
          };
          loadedStreamQualities.push(loadedQuality);
        }
      }
      //return loadedQuality;
    }

    // 3) process the loaded streams (e.g. remove advertisement segments)
    let processedStreamQualities = [];
    {
      debug("processM3U8StreamQualities()");
      loadedStreamQualities.forEach((loadedStreamQuality) => {
        debug("processM3U8StreamQuality()");
        let m3u8Data = loadedStreamQuality.content;
        if (!m3u8Data) {
          debug("m3u8Data is null")
          return null;
        }
        if (m3u8Data.segments.length < 1) {
          debug("given stream playlist does not contain segments -> exit early")
          return null;
        }
        // create a copy of the original playlist data where interfering segments have been removed...
        //
        //parse:
        // #EXT-X-PLAYLIST-TYPE:VOD
        // #EXTINF:3.000,
        // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/0.ts
        // #EXTINF:3.000,
        // https://cs5.rbmbtnx.net/v1/RBTV/s/1/Y6/UD/8H/D1/5N/11/1.ts
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
        //let processedM3U8Data = new M3U8Data();
        //m3u8Data.segments.forEach(...
        let processedM3U8Data = new M3U8Data(m3u8Data);
        if (processedM3U8Data.equals(m3u8Data)) {
          debug("processing of given stream playlist did not lead to any change -> exit early")
          return null;
        }
        // create a downloadable blob
        let saveBlob = new Blob([processedM3U8Data.toString()], { type: "text/html;charset=UTF-8" });
        let saveUrl = window.URL.createObjectURL(saveBlob);
        let processedQuality = {
          "url": saveUrl,
          "type": 'm3u8',//loadedStreamQuality.type,
          "quality": loadedStreamQuality.quality,
          "islive": loadedStreamQuality.islive,
          "isaudio": loadedStreamQuality.isaudio,
          "isloaded": true,
          "processed": true,
          "content": processedM3U8Data
        };
        processedStreamQualities.push(processedQuality);
        //return processedQuality;
      });
      //return processedStreamQualities;
    }

    // 4) mux pure audio and video pplaylists into muxed playlists
    let muxedStreamQualities = [];
    {
      debug("muxM3U8StreamQualitiesAsync()");
      let audioStreamQuality = null;
      loadedStreamQualities.forEach((loadedStreamQuality) => {
        if (loadedStreamQuality && loadedStreamQuality.isaudio && loadedStreamQuality.content && loadedStreamQuality.content.segments.length > 0) {
          // init with first available audio stream
          if (!audioStreamQuality) {
            audioStreamQuality = loadedStreamQuality;
            return;
          }
          // but favor german and/or higher quality if there are more audio streams
          if (loadedStreamQualities.quality == 'de' && audioStreamQuality.quality != 'de') {
            audioStreamQuality = loadedStreamQuality;
            return;
          }
        }
      });
      let m3u8AudioData = audioStreamQuality ? audioStreamQuality.content : null;
      if (m3u8AudioData) {
        loadedStreamQualities.forEach((loadedStreamQuality) => {
          if (!loadedStreamQuality || loadedStreamQuality.isaudio || !loadedStreamQuality.content || loadedStreamQuality.content.segments.length < 1) {
            return;
          }
          debug("muxing audio and video stream");
          let muxedPlaylist = '';
          let m3u8VideoData = loadedStreamQuality.content;
          let videoSegmentIdx = 0;
          let audioSegmentIdx = 0;
          let audioSegmentStepWidth = m3u8VideoData.segments.length / m3u8AudioData.segments.length;
          if (audioSegmentStepWidth < 1) {
            audioSegmentStepWidth = 1;
          }
          for (let i = 0; i < m3u8VideoData.tags.length; i++) {
            let tag = m3u8VideoData.tags[i];
            if (!tag) {
              continue;
            }
            if (!tag.segment) {
              muxedPlaylist += '#' + tag.name;
              if (tag.values.length > 0 || tag.attributes.length > 0) {
                muxedPlaylist += ':';
                tag.values.forEach((value) => {
                  muxedPlaylist += value + ',';
                });
                tag.attributes.forEach((attr) => {
                  muxedPlaylist += attr.name + '=' + attr.value + ',';
                });
                if (muxedPlaylist.endsWith(',')) {
                  muxedPlaylist = muxedPlaylist.substr(0, muxedPlaylist.length - 1);
                }
              }
              muxedPlaylist += '\n';
            }
            else if (tag.segment.uri && tag.segment.uri.length > 0) {
              if (videoSegmentIdx < 1 && m3u8AudioData.containsTag('EXT-X-MAP')) {
                let tag = m3u8AudioData.tag('EXT-X-MAP');
                muxedPlaylist += '#' + tag.name;
                if (tag.values.length > 0 || tag.attributes.length > 0) {
                  muxedPlaylist += ':';
                  tag.values.forEach((value) => {
                    muxedPlaylist += value + ',';
                  });
                  tag.attributes.forEach((attr) => {
                    muxedPlaylist += attr.name + '=' + attr.value + ',';
                  });
                  if (muxedPlaylist.endsWith(',')) {
                    muxedPlaylist = muxedPlaylist.substr(0, muxedPlaylist.length - 1);
                  }
                }
                muxedPlaylist += '\n';
              }
              // write video segment
              muxedPlaylist += '#EXTINF:' + tag.segment.time + ',\n' + tag.segment.uri;
              muxedPlaylist += '\n';
              // write matching audio segment(s)
              for (let j = 0; j < audioSegmentStepWidth; j++) {
                if (audioSegmentIdx < m3u8AudioData.segments.length) {
                  let audioSegment = m3u8AudioData.segments[audioSegmentIdx];
                  audioSegmentIdx++;
                  if (audioSegment.uri && audioSegment.uri.length > 0) {
                    muxedPlaylist += '#EXTINF:' + audioSegment.time + ',\n' + audioSegment.uri;
                    muxedPlaylist += '\n';
                  }
                }
              }
              videoSegmentIdx++;
            }
          }
          if (muxedPlaylist.length > 0) {
            let saveBlob = new Blob([muxedPlaylist], { type: "text/html;charset=UTF-8" });
            let saveUrl = window.URL.createObjectURL(saveBlob);
            let muxedQuality = {
              "url": saveUrl,
              "type": 'm3u8',//loadedStreamQuality.type,
              "quality": loadedStreamQuality.quality,
              "islive": loadedStreamQuality.islive,
              "isloaded": true,
              "processed": true,
              "ismuxed": true,
              "muxedAudioQuality": audioStreamQuality.quality,
              "content": new M3U8Data(muxedPlaylist)
            };
            muxedStreamQualities.push(muxedQuality);
            //return muxedQuality;
          }
          //return null;
        });
      }
      //return muxedStreamQualities;
    }

    // 5) sort qualities
    sortQualities(streamQualities);
    sortQualities(loadedStreamQualities);
    sortQualities(processedStreamQualities);
    sortQualities(muxedStreamQualities);

    // 6) append qualties
    loadedStreamQualities.forEach((subQuality) => { streamQualities.push(subQuality) });
    processedStreamQualities.forEach((subQuality) => { streamQualities.push(subQuality) });
    muxedStreamQualities.forEach((subQuality) => { streamQualities.push(subQuality) });
    return streamQualities;
  }

  function sortQualities(qualities) {
    function qualityToNumber(quality) {
      //debug("qualityToNumber()");
      if (!quality) {
        return 0;
      }
      if (quality.endsWith('p')) { //video format e.g.'720p' -> derive qnumber from pure value (ignoring progressive mark)
        quality = quality.substr(0, quality.length - 1);
      }
      if (quality.lastIndexOf('x') >= 0) { //resolution e.g.'1920x1080' -> derive qnumber from height
        quality = quality.substr(quality.lastIndexOf('x') + 1);
      }
      if (quality.toLowerCase().startsWith('mp4a.')) { //audio codec e.g.'mp4a.40.2' -> derive qnumber from product of numbers
        let parts = quality.split('.');
        let number = parts.length > 1 ? parseInt(parts[1]) : 0;
        number *= parts.length > 2 ? parseInt(parts[2]) : 1;
        return number;
      }
      if (quality.toLowerCase().startsWith('avc1.')) { //video codec e.g.'avc1.4d001f' -> derive qnumber from hexnumber
        let parts = quality.split('.');
        let number = parts.length > 1 ? parseInt(parts[1]) : 0;
        return number;
      }
      return parseInt(quality);
    }
    debug("sortQualities()");
    if (qualities == undefined || qualities == null) {
      debug("qualities is null");
      return;
    }
    qualities.sort((streamA, streamB) => { return qualityToNumber(streamB.quality) - qualityToNumber(streamA.quality); });
    return qualities;
  }
     
  async function saveM3U8LivePlayListAsync(m3u8Url, resolve, reject, cancel) {
    debug("saveM3U8LivePlayListAsync()");
    debug("m3u8Url: " + m3u8Url);
    // 1) load initial playlist data (will only contain few segments)
    let m3u8Data = await M3U8Data.loadAsync(m3u8Url);
    if (m3u8Data.segments.length < 1) {
      debug("could not find any VOD segments -> early exit");
      if (reject) reject("could not find any VOD segments -> early exit");
      return null;
    }
    // 2) repeat loading and insert new segments into existing m3u8Data until no changes happen anymore (live stream ends)
    let initialSegmentsCount = m3u8Data.segments.length;
    let repeatCount = 0;
    let repeatLoading = true;
    let sleepTime = 500;
    while (repeatLoading) {
      await sleep(sleepTime);
      // load playlist again
      repeatCount++;
      let newM3u8Data = await M3U8Data.loadAsync(m3u8Url);
      if (newM3u8Data.segments.length < 1) {
        debug("loading playlist data failed (live stream ended?)");
        repeatLoading = false;
        continue;
      }
      // look for new segments
      let addedSegments = 0;
      newM3u8Data.segments.forEach((newSegment) => {
        let isContained = false;
        m3u8Data.segments.forEach((segment) => {
          if (segment.uri == newSegment.uri) {
            isContained = true;
          }
        });
        if (!isContained) {
          m3u8Data.segments.push(newSegment);
          addedSegments++;
        }
      });
      if (addedSegments > 0) {
        debug('added ' + addedSegments + ' new segment(s) to the playlist');
      }
      // check for final static state (not a live playlist after all?)
      if (repeatCount > 10 && newM3u8Data.segments.length == m3u8Data.segments.length && m3u8Data.segments.length == initialSegmentsCount) {
        repeatLoading = false;
        continue;
      }
      // dynamic adaption of sleepTime (after first 10 repeats with sleeptime of 0.5sec)
      if (repeatCount > 10) {
        let segmentsPerRepeat = (m3u8Data.segments.length - initialSegmentsCount) / repeatCount;
        let desiredSegmentsPerRepeat = 3;
        if (segmentsPerRepeat > 0) {
          sleepTime = sleepTime * desiredSegmentsPerRepeat / segmentsPerRepeat;
          // limit sleep to 30sec
          if (sleepTime > 30000) {
            sleepTime = 30000;
          }
        }
      }
      // check for user cancelation
      if (cancel && cancel()) {
        repeatLoading = false;
        continue;
      }
    }
    debug("loading of async playlist ended");
    // 4) convert the m3u8Data into a m3u8 playlist string and create a downloadable blob out of it
    let saveBlob = new Blob([m3u8Data.toString()], { type: "text/html;charset=UTF-8" });
    if (resolve) {
      resolve(saveBlob);
    }
    return saveBlob;
  }

  async function saveM3U8VideoAsMP4Async(m3u8Url, m3u8Content, resolve, reject, cancel) {
    debug("saveM3U8VideoAsMP4Async()");
    debug("m3u8Url: " + m3u8Url);
    //debug("m3u8Content: " + m3u8Content);
    // 1) load playlist data
    let m3u8Data = m3u8Content ? new M3U8Data(m3u8Content) : await M3U8Data.loadAsync(m3u8Url);
    let httpRequest = new HttpRequest();
    // mux.js
    muxedData = null;
    let segmentId = 0;
    for (const tsSegmentUrl of m3u8Data.segmentUris) {
      debug(tsSegmentUrl);
      // todo: make more save aganinst failures
      let response = await httpRequest.downloadAsync(tsSegmentUrl);
      let tsSegmentString = response.data;
      let tsSegment = stringToUint8Array(tsSegmentString);
      transmuxSegmentsToCombinedMp4(tsSegment, (segmentId == 0));
      // 5) check for user cancelation
      if (cancel && cancel()) {
        break;
      }
      segmentId++;
    }
    // create a blob and return
    let saveBlob = transmuxSegmentsToCombinedMp4Blob(segmentId);
    if (resolve) {
      resolve(saveBlob);
    }
    return saveBlob;
  }

  //-------------------------------------------------------------------------------------------------------
  // >> site specific functions:

  async function findAirmeetMedia(document, resultContainer) {
    // Airmeet:
    if (document.location.host.startsWith('www.airmeet.com') && document.querySelector('video')) {
      debug("found Airmeet media page with video object");
      let videoUrl = document.querySelector('video').src;
      // retrieve media info from active player properties -> this can break if players change
      if (videoUrl && videoUrl.length > 0) {
        videoUrl = getAbsoluteUrl(videoUrl);
        let videoTitle = document.querySelector('p[title]').innerText;
        let videoDescription = videoTitle; //document.querySelector('p[title]').innerText;
        let videoType = getExtensionFromUrl(videoUrl);
        let videoQuality = null;
        resultContainer.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality
          }]
        });
      }
      else {
        debug("could not extract Airmeet media");
      }
    }
  }

  async function findRedBullMedia(document, resultContainer) {
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
      // we have to go the long way - but the new episodes playinfo is much harder to fetch
      //<rbup-video-rbcom id="RBUP-c6b35349-7246-44ad-8a86-f6a1b2a69d55" asset-id="rrn:content:episode-videos:15cf56a0-c4c0-4f56-8c61-9de64527d403:de-INT" autoplay="true" cornerbug="default" details="hidden" product-placement="visible" environment="PRODUCTION" multi-channel-switcher="hidden" locale-mixing="de-DE>de-INT" override-translation-language="de"></rbup-video-rbcom>
      //-> asset-id="rrn:content:episode-videos:15cf56a0-c4c0-4f56-8c61-9de64527d403:de-INT"
      //-> https://api-player.redbull.com/rbcom/videoresource?videoId=rrn%3Acontent%3Aepisode-videos%3A15cf56a0-c4c0-4f56-8c61-9de64527d403%3Ade-INT&localeMixing=de-DE%3Ede-INT
      let rbPlayerCfg = document.querySelector('rbup-video-rbcom');
      if (!rbPlayerCfg) {
        return;
      }
      let videoId = rbPlayerCfg["asset-id"];
      if (!videoId) {
        return;
      }
      let videoConfigUrl = 'https://api-player.redbull.com/rbcom/videoresource?videoId=' + videoId;
      let httpRequest = new HttpRequest();
      let response = await httpRequest.downloadAsync(videoConfigUrl);
      let videoConfigJson = response.data;
      let videoConfig = JSON.parse(videoConfigJson);
      if (videoConfig) {
        debug("found RedBull media page with m3u8 video info");
        let videoTitle = document.querySelector('meta[property="og:title"]').content || videoConfig.title || document.querySelector('title').innerText;
        let videoDescription = document.querySelector('meta[property="og:description"]').content || document.querySelector('meta[name="description"]').content;
        let videoUrl = getAbsoluteUrl(videoConfig.videoUrl);
        let videoType = getExtensionFromUrl(videoUrl);
        let videoQuality = null;
        resultContainer.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality
          }]
        });
      }
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
      resultContainer.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality
        }]
      });
    } 
    else {
      debug("could not extract RedBull media"); 
    }
  }

  async function findBergweltenMedia(document, resultContainer) {
    // Bergwelten:
    //https://www.bergwelten.com/a/shangri-la-das-verborgene-kletterparadies
    //<rbup-video-bergwelten id="rbx-player-container" asset-id="AA-1GSG6RGJS2114" cornerbug="bergwelten" autoplay="false"></rbup-video-bergwelten>
    //-> asset-id="AA-1GSG6RGJS2114"
    //-> https://api-player.redbull.com/bergwelten?videoId=AA-1GSG6RGJS2114
    //-> https://cs.liiift.io/v1/STV/pd/E4/8B/9F/8E/FO-2BXH2PMM61111/master.m3u8
    let rbPlayerCfg = document.querySelector('rbup-video-bergwelten');
    if (!rbPlayerCfg) {
      debug("could not extract Bergwelten player config");
      return;
    }
    let videoId = rbPlayerCfg.getAttribute('asset-id');
    if (!videoId) {
      debug("could not extract Bergwelten media info");
      return;
    }
    let videoConfigUrl = 'https://api-player.redbull.com/bergwelten?videoId=' + videoId;
    let httpRequest = new HttpRequest();
    let response = await httpRequest.downloadAsync(videoConfigUrl);
    let videoConfigJson = response.data;
    let videoConfig = JSON.parse(videoConfigJson);
    if (videoConfig) {
      debug("found ServusTV media page with m3u8 video info");
      let videoTitle = document.querySelector('meta[property="og:title"]').content || videoConfig.title || document.querySelector('title').innerText;
      let videoDescription = document.querySelector('meta[property="og:description"]').content || document.querySelector('meta[name="description"]').content;
      let videoUrl = getAbsoluteUrl(videoConfig.videoUrl);
      let videoType = getExtensionFromUrl(videoUrl);
      let videoQuality = null;
      resultContainer.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality
        }]
      });
    }
    return;
  }

  async function findServusTVMedia(document, resultContainer) {
    // ServusTV:
    //<rbup-video-stv id="H5fbebce4-62e5-40c4-a365-8c21596238ef" video-title="Anna Gasser – Der Funke in mir" enable-data-zoom="ACTIVE" cookie-consent="true" asset-id="AA-294F1JR1W2111" autoplay="false" ads-enabled="ACTIVE" cornerbug="stv-on" details="visible" poster="https://backend.servustv.com/tachyon/sites/12/2022/02/FO-299MK1MM61511-stv_cover_landscape-scaled.jpg?resize=1250,702&amp;crop_strategy=smart"><span class="sr-only">no STV WebComponent</span></rbup-video-stv>
    //-> asset-id="AA-294F1JR1W2111"
    //-> https://api-player.redbull.com/stv/servus-tv?timeZone=Europe/Berlin&videoId=AA-294F1JR1W2111
    //-> https://dms.redbull.tv/v5/destination/stv/AA-294F1JR1W2111/personal_computer/http/de/de_DE/playlist.m3u8
    let rbPlayerCfg = document.querySelector('rbup-video-stv');
    if (!rbPlayerCfg) {
      debug("could not extract ServusTV player config"); 
      return;
    }
    let videoId = rbPlayerCfg.getAttribute('asset-id');
    if (!videoId) {
      debug("could not extract ServusTV media info"); 
      return;
    }
    let videoConfigUrl = 'https://api-player.redbull.com/stv/servus-tv?timeZone=Europe/Berlin&videoId=' + videoId;
    let httpRequest = new HttpRequest();
    let response = await httpRequest.downloadAsync(videoConfigUrl);
    let videoConfigJson = response.data;
    let videoConfig = JSON.parse(videoConfigJson);
    if (videoConfig) {
      debug("found ServusTV media page with m3u8 video info");
      let videoTitle = document.querySelector('meta[property="og:title"]').content || videoConfig.title || document.querySelector('title').innerText;
      let videoDescription = document.querySelector('meta[property="og:description"]').content || document.querySelector('meta[name="description"]').content;
      let videoUrl = getAbsoluteUrl(videoConfig.videoUrl);
      let videoType = getExtensionFromUrl(videoUrl);
      let videoQuality = null;
      resultContainer.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality
        }]
      });
    }
    return;     
  }

  async function findDailymotionMedia(document, resultContainer) {
    let documentUrl = document.URL;
    if (!documentUrl.includes('dailymotion.com/video/')) {
      return;
    }
    debug("found Dailymotion media page");
    // retrieve media info from active player properties -> this can break if players change
    let videoId = documentUrl.substr(documentUrl.indexOf('dailymotion.com/video/')+'dailymotion.com/video/'.length);
    let videoConfigUrl = 'https://www.dailymotion.com/player/metadata/video/' + videoId;
    let httpRequest = new HttpRequest();
    let response = await httpRequest.downloadAsync(videoConfigUrl);
    let videoConfigJson = response.data;
    let videoConfig = JSON.parse(videoConfigJson);
 
    if (videoConfig) {
      debug("found Dailymotion video config");
      //debugJson("videoConfig:\n", videoConfig);
      let videoTitle = videoConfig.title;
      let videoDescription = videoConfig.tags.join(', ');
      let mediaEntry = {
        "title": videoTitle,
        "description": videoDescription,
        "qualities": []
      };
      if (videoConfig && videoConfig.qualities && videoConfig.qualities.auto && videoConfig.qualities.auto.length > 0) {
        debug("found Dailymotion qualities");
        // add media download info
        videoConfig.qualities.auto.forEach((format)=>{
          mediaEntry.qualities.push({
            "url": format.url,
            "type": getExtensionFromUrl(format.url), //getExtensionFromType(format.type), 
            "quality": null
          });
        });
      }
      // see if we found something:
      if (mediaEntry.qualities.length > 0) {
        resultContainer.mediaList.push(mediaEntry);
        return;
      }
    }
    else {
      debug("could not extract Dailymotion media"); 
    }
  }

  async function findMySpassMedia(document, resultContainer) {
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
      resultContainer.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality
        }]
      });
    }
    else {
      debug("could not extract MySpass media"); 
    }
  }
 
  async function findVimeoMedia(document, resultContainer) {
    let player = null;
    let vimeoConfigUrl = null;
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
    // redirect to VimeoPlayer in case of vimeo page and no videos found
    if (!player && 'vimeo' in window && !document.URL.includes('player.vimeo.com/video/')) {
      debug("found Vimeo page without player - trying to redirect to VimeoPlayer");
      if (window.vimeo && window.vimeo.clip_page_config && window.vimeo.clip_page_config.clip && window.vimeo.clip_page_config.clip.id) {
        let vimeoVideoId = window.vimeo.clip_page_config.clip.id;
        vimeoPlaybackUrl = 'https://player.vimeo.com/video/' + vimeoVideoId;
        // add redirection linkt to downloadui
        
        let redirectEntry = {
          "title": "open in video VimeoPlayer",
          "description": "",
          "qualities": [{
              "url": vimeoPlaybackUrl,
              "type": "",
              "quality": "",
              "islive": false
            }
          ]
        };
        resultContainer.mediaList.push(redirectEntry);
        //return;
      }
    }
    if (!player && document.URL.startsWith('https://player.vimeo.com/video/')) {
      vimeoConfigUrl = document.URL + '/config';
    }
    if (!player && !vimeoConfigUrl) {
      return;     
    }
    debug("found Vimeo media page with player object or valid vimeoConfigUrl");
    // retrieve media info from active player properties -> this can break if players change
    //debugJson(player.clip_page_config);
    let vimeoConfig = null;
    if (player && player.clip_page_config && player.clips && player.clip_page_config.clip) {
      debug("found Vimeo clips data (direct access to vimeoConfig)");
      vimeoConfig = player.clips[player.clip_page_config.clip.id];
    }
    if (!vimeoConfig && !vimeoConfigUrl) {
      // going the longer way over videoConfig Json info (to be downloaded)
      if (player && player.clip_page_config && player.clip_page_config.player) {
        vimeoConfigUrl = player.clip_page_config.player.config_url;
      }
      if (!vimeoConfigUrl && document.URL.includes('player.vimeo.com')) {
        vimeoConfigUrl = document.URL + '/config';
      }
      if (!vimeoConfigUrl && player.clip_page_config && player.clip_page_config.clip && player.clip_page_config.clip.id) {
        vimeoConfigUrl = 'https://player.vimeo.com/video/' + player.clip_page_config.clip.id + '/config';
      }
    }
    if (vimeoConfigUrl) {
      debug("found Vimeo ConfigUrl");
      //debug("vimeoConfigUrl: " + vimeoConfigUrl);
      let httpRequest = new HttpRequest();
      let response = await httpRequest.downloadAsync(vimeoConfigUrl);
      let vimeoConfigJson = response.data;
      vimeoConfig = JSON.parse(vimeoConfigJson);
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
              "quality": format.quality
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
      // hls video (from hls section)
      if (vimeoConfig && vimeoConfig.request && vimeoConfig.request.files && vimeoConfig.request.files.hls && vimeoConfig.request.files.hls.cdns) {
        let m3u8MasterSrc = vimeoConfig.request.files.hls.cdns.akamai_live || vimeoConfig.request.files.hls.cdns.fastly_skyfire;
        let isLive = vimeoConfig.video && vimeoConfig.video.live_event && vimeoConfig.video.live_event.status && !(vimeoConfig.video.live_event.status.toLowerCase() == "ended"); /*&& vimeoConfig.video.live_event.status == "started"*/;
        if (m3u8MasterSrc)
        {
          debug("found Vimeo live stream");
          // todo: add media download info
          mediaEntry.qualities.push({
            "url": m3u8MasterSrc.url,
            "type": getExtensionFromUrl(m3u8MasterSrc.url),
            "quality": null,
            "islive": isLive
          });
        }  
      }
      // see if we found something:
      if (mediaEntry.qualities.length > 0) {
        resultContainer.mediaList.push(mediaEntry);
        return;
      }
    }
    else {
      debug("could not extract Vimeo media"); 
    }
  }

  async function findYouTubeMedia(document, resultContainer) {
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
          "islive": true
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
              "quality": videoQuality
            });
          }
        });
      }
      if (entry.qualities.length > 0) {
        resultContainer.mediaList.push(entry);
      }
    }
    else {
      debug("could not extract YouTube media"); 
    }
  }
 
  async function findArdMedia(document, resultContainer) {
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
      resultContainer.mediaList.push({
        "title": videoTitle,
        "description": videoDescription,
        "qualities": [{
          "url": videoUrl,
          "type": videoType,
          "quality": videoQuality
        }]
      });
    }
    else {
      debug("could not extract ARD media"); 
    }
  }

  async function findMediathekViewPlayerMedia(document, resultContainer) {
    // https://srf-vod-amd.akamaized.net/ch/hls/film/2022/10/film_20221011_153158_15680421_v_webcast_h264_,q40,q10,q20,q30,q50,q60,.mp4.csmil/index-f6-v1-a1.m3u8
    if (document.location.host.endsWith('mediathekviewweb.de') && document.querySelector('div#videocontent>div')) {
      debug("found MediathekviewWeb page with video object");
      let videoUrl = document.querySelector('div#videocontent>div>video>source').src;
      // retrieve media info from active player properties -> this can break if players change
      if (videoUrl && videoUrl.length > 0) {
        videoUrl = getAbsoluteUrl(videoUrl);
        let anchor = document.querySelector('td>a[href="' + videoUrl + '"]');
        let videoTitle = anchor.parentNode.parentNode.querySelector('td:nth-child(3)').innerText;
        let videoDescription = videoTitle;
        let videoType = getExtensionFromUrl(videoUrl);
        let videoQuality = null;
        resultContainer.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality
          }]
        });
      }
      else {
        debug("could not extract Mediathekview media");
      }
    }
  }

  async function findMtvMedia(document, resultContainer) {
    //https://www.mtv.de/musikvideos/z7vyzk/mariposa-traicionera
    //<script type="application/ld+json">{"@context":"https://schema.org","@type":"VideoObject","@id":"6f3df3b0-7ba7-4302-ac6b-3c16eac09dc9","name":"Mana • Mariposa traicionera","duration":"PT0H4M31S","thumbnailUrl":"https://images.paramount.tech/uri/mgid:arc:imageassetref:mtv.de:ee867056-6eb8-11e8-881b-70df2f866ace?quality=0.7&gen=ntrn&legacyStatusCode=true","url":"https://www.mtv.de/musikvideos/z7vyzk/mana-mariposa-traicionera","contentUrl":"https://www.mtv.de/musikvideos/z7vyzk/mana-mariposa-traicionera","uploadDate":"2020-06-08T12:16:17.000Z"}</script>
    //-> video-id = "@id" = "6f3df3b0-7ba7-4302-ac6b-3c16eac09dc9"
    //-> https://media-utils.mtvnservices.com/services/MediaGenerator/mgid:arc:musicvideo:mtv.intl:<video-id>?arcStage=live&accountOverride=intl.mtvi.com&billingSection=intl&ep=82ac4273&format=json&acceptMethods=hls&tveprovider=null
    //-> json data
    //-> package.video.item[0].rendition[0].src = https://dlvrsvc.mtvnservices.com/api/gen/gsp.mtviestor/_!/intlod/MTVInternational/wmg_int/mxf150/900660/0/,stream_768x576_1931255_2852696635,stream_576x432_998196_2849351006,stream_640x480_1461544_2867250770,stream_320x240_287457_128339406,stream_480x360_504697_242131656/master.m3u8?account=intl.mtvi.com&cdn=ns1&tk=st=1667480145~exp=1667566545~acl=/api/gen/gsp.mtviestor/_*/intlod/MTVInternational/wmg_int/mxf150/900660/0/*~hmac=af810628aef8fa6b7a4b39ecc571eb23f3cc5eff62cb8f3adc0c6977d98282c7
    //-> this is a master.m3u8
    if (document.location.host.endsWith('.mtv.de') && document.location.pathname.startsWith('/musikvideos/')) {
      let mtvVideoConfigs = document.querySelectorAll('script[type="application/ld+json"]');
      for (const config of mtvVideoConfigs) {
        let json = JSON.parse(config.innerHTML);
        if (json["@type"] == "VideoObject" && json["@id"]) {
          debug("found MTV media page with m3u8 video info");
          let videoId = json["@id"];
          let videoConfigUrl = 'https://media-utils.mtvnservices.com/services/MediaGenerator/mgid:arc:musicvideo:mtv.intl:' + videoId + '?arcStage=live&accountOverride=intl.mtvi.com&billingSection=intl&ep=82ac4273&format=json&acceptMethods=hls&tveprovider=null';
          let httpRequest = new HttpRequest();
          let response = await httpRequest.downloadAsync(videoConfigUrl);
          let videoConfigJson = response.data;
          let videoConfig = JSON.parse(videoConfigJson);
          let videoUrl = videoConfig.package.video.item[0].rendition[0].src;
          let videoType = 'm3u8';//getExtensionFromUrl(videoUrl);
          let videoTitle = json.name;
          let videoDescription = ''; //videoTitle;
          let videoQuality = null;
          resultContainer.mediaList.push({
            "title": videoTitle,
            "description": videoDescription,
            "qualities": [{
              "url": videoUrl,
              "type": videoType,
              "quality": videoQuality
              }]
          });
        }
      }
      return;
    }
    debug("could not extract MTV media");
  }

  async function findTedMedia(document, resultContainer) {
    //https://www.ted.com/talks/charles_fleischer_all_things_are_moleeds?language=de
    //<video playsinline="playsinline" class="absolute top-0 left-0 h-full w-full bg-black" id="ted-player-56" 
    //  crossorigin="anonymous" src="blob:https://www.ted.com/b7837149-f5da-40a3-a05a-fba0a6a64742" 
    //  title="Charles Fleischer: Charles Fleischer insistiert: Alle Dinge sind Moleeds">
    //  <track kind="subtitles" label="Arabic" src="https://pubads.g.doubleclick.net/ondemand/hls/content/2503702/vid/consus-pm902-im2346/GRQ/streams/0f4fd44b-98a8-44c2-b50a-5bb05949925a/vtt/f6c40366-d054-4c9e-87ad-ff57a3fae5bb.vtt" srclang="ar">
    //</video>

    //-> video-id = "@id" = "6f3df3b0-7ba7-4302-ac6b-3c16eac09dc9"
    //-> https://media-utils.mtvnservices.com/services/MediaGenerator/mgid:arc:musicvideo:mtv.intl:<video-id>?arcStage=live&accountOverride=intl.mtvi.com&billingSection=intl&ep=82ac4273&format=json&acceptMethods=hls&tveprovider=null
    //-> json data
    //-> package.video.item[0].rendition[0].src = https://dlvrsvc.mtvnservices.com/api/gen/gsp.mtviestor/_!/intlod/MTVInternational/wmg_int/mxf150/900660/0/,stream_768x576_1931255_2852696635,stream_576x432_998196_2849351006,stream_640x480_1461544_2867250770,stream_320x240_287457_128339406,stream_480x360_504697_242131656/master.m3u8?account=intl.mtvi.com&cdn=ns1&tk=st=1667480145~exp=1667566545~acl=/api/gen/gsp.mtviestor/_*/intlod/MTVInternational/wmg_int/mxf150/900660/0/*~hmac=af810628aef8fa6b7a4b39ecc571eb23f3cc5eff62cb8f3adc0c6977d98282c7
    //-> this is a master.m3u8
    if (document.location.host.endsWith('.ted.com') && document.location.pathname.startsWith('/talks/')) {
      let tedMasterVideoTracks = document.querySelectorAll('div>video>track');
      let masterUrl;
      for (const track of tedMasterVideoTracks) {
        if (!track || !track.src || track.src === "") {
          continue;
        }
        if (masterUrl == null && track.src.toLowerCase().endsWith('.vtt')) {
          let idx = track.src.toLowerCase().lastIndexOf('/vtt/');
          if (idx > 0) {
            masterUrl = track.src.substr(0, idx) + '/master.m3u8';
            let httpRequest = new HttpRequest();
            let response = await httpRequest.downloadAsyncSafe(masterUrl);
            if (response && response.status == 200 && response.data) {
              break;
            }
            masterUrl = null;
          }
        }
      }
      if (masterUrl) {
        debug("found TED media page with m3u8 video info");
        let videoUrl = masterUrl;
        let videoElement = document.querySelector('div>video');
        let videoTitle = videoElement.tile;
        let videoDescription = ''; //videoTitle;
        let videoType = 'm3u8';//getExtensionFromUrl(videoUrl);
        let videoQuality = null;
        resultContainer.mediaList.push({
          "title": videoTitle,
          "description": videoDescription,
          "qualities": [{
            "url": videoUrl,
            "type": videoType,
            "quality": videoQuality
          }]
        });
      }
      return;
    }
    debug("could not extract TED media");
  }


  // << end of site specific functions
  //-------------------------------------------------------------------------------------------------------
 
  async function analysePageAndCreateUiAsync(showUiOpen, showAllFormats, retryCount) {
    debug("analysePageAndCreateUiAsync()");
    // when this function is used without arguments, then they are of type undefined
    // here showUiOpen and ahowAllFormats are of expected type boolean -> therefore undefined arguments default to false values witch is already what we need
    // -> no additional code required for default value handling
    //showUiOpen = (showUiOpen == undefined) ? false : showUiOpen;
    //showAllFormats = (showAllFormats == undefined) ? false : showAllFormats;

    // clean up old ui first
    deleteDownloadUi();
    
    // controller object in DOM and video element available?
    if(!window) {
      return;
    }

    // try to get video metadata
    try 
    {
      let resultContainer = {
        "mediaList": [/*{ 
          "title": "",
          "description": "",
          "qualities": [{
            "url": null,
            "type": "",
            "quality": "",
            "isaudio": false,
            "islive": false,
            "isloaded": false,
            "processed": false,
            "ismuxed": false,
            "content": ""
          }] 
        }*/]
      };

      // update mediaList
      await findRedBullMedia(document, resultContainer);
      await findServusTVMedia(document, resultContainer);
      await findBergweltenMedia(document, resultContainer);
      await findMySpassMedia(document, resultContainer);
      await findVimeoMedia(document, resultContainer);
      await findYouTubeMedia(document, resultContainer);
      await findDailymotionMedia(document, resultContainer);
      await findArdMedia(document, resultContainer);
      await findMediathekViewPlayerMedia(document, resultContainer);
      await findMtvMedia(document, resultContainer);
      await findTedMedia(document, resultContainer);
      await findAirmeetMedia(document, resultContainer);
        
      // POSTPROCESS AND DISPLAY retrieved media information
      // remove invalid entries
      for (let i=resultContainer.mediaList.length; i>0; i--) {
        let entry = resultContainer.mediaList[i-1];
        for (let j=entry.qualities.length; j>0; j--) {
          if (entry.qualities[j-1].url == null) {
            entry.qualities.pop();
          }
        }
        if (entry.qualities.length < 1) {
          resultContainer.mediaList.pop();
        }
      }

      // validate mediaList and retry if necessary
      if (resultContainer.mediaList.length < 1) {
        // try again later
        retryCount = (!retryCount || retryCount < 1) ? 1 : ++retryCount;
        let sleepTime = 500 * retryCount * retryCount * retryCount / 2;
        debug("could not retrieve video download url from player, trying again later in retry " + retryCount + ' after sleeping ' + sleepTime + 'ms');
        setTimeout(function () { analysePageAndCreateUiAsync(showUiOpen, showAllFormats, retryCount); }, sleepTime);
        return;
      }

      // create and inject download ui for showing progress
      let canvas = createDownloadUi(showUiOpen, showAllFormats);

      // sort available qualities
      for (let i = 0; i < resultContainer.mediaList.length; i++) {
        sortQualities(resultContainer.mediaList[i].qualities);
      }

      // resolve m3u8 playlists
      // we need to use Array index operator in order to have a reference to mediaEntry since we are about to modify it
      // therefore we need to use a classical for loop instead of Array.forEach (which would deliver a copy of the mediaEntry)
      for (let i=0; i<resultContainer.mediaList.length; i++) {
        let mediaEntry = resultContainer.mediaList[i];
        // we need to run backwards over qualities since we add new entries
        for (let j=mediaEntry.qualities.length; j>0; j--) {
          let quality = mediaEntry.qualities[j-1];
          if (quality.type && quality.type.toLowerCase().startsWith("m3u8")) {
            let subQualities = await loadM3U8PlayListQualities(quality.url, quality.islive);
            if (!quality.quality && subQualities.length > 0) {
              quality.quality = 'master';
            }
            // add the created downloadable quality playlists to mediaEntry for showing up in ui
            subQualities.forEach((subQuality) => {
              mediaEntry.qualities.push(subQuality)
            });
          }
        }
      }

      // process title infos
      let defaultTitle = document.title || 'video';
      for (let i=0; i<resultContainer.mediaList.length; i++) {
        let mediaEntry = resultContainer.mediaList[i];
        mediaEntry.title = mediaEntry.title || defaultTitle;
      }
 
      // debug output of retrieved media information
      resultContainer.mediaList.forEach((entry) => {
        entry.qualities.forEach((quality) => {
          debug("Title       : '" + entry.title + "'");
          debug("Description : '" + entry.description + "'");
          debug("Url         : '" + quality.url + "'");
          debug("Type        : '" + quality.type + "'");
          debug("Quality     : '" + quality.quality + "'");
          debug("Audio       : '" + quality.isaudio + "'");
          debug("Subtitle    : '" + quality.issubtitle + "'");
          debug("Live        : '" + quality.islive + "'");
          debug("Loaded      : '" + quality.isloaded + "'");
          debug("Processed   : '" + quality.processed + "'");
          debug("Muxed       : '" + quality.ismuxed + "'");
          quality.content == undefined ?
            debug("Content     : 'undefined'") :
            debug("Content     : '" + (quality.content.toString().length > 0) ? quality.content.toString().substr(0, 7) + "...'" : "'");
          debug("------------------------------");
        });
      });
      
      // update download ui
      updateDownloadUi(resultContainer.mediaList, showUiOpen, showAllFormats);
    }
    catch (error)
    {
      // log the error
      console.error("[Media Download] Error retrieving video meta data:", error);
    }
  }

  function createDownloadUi(showUiOpen, showAllFormats) {
    return createDownloadUiAndAddUrl(showUiOpen, showAllFormats, null, null, null, false);
  }

  function updateDownloadUi(mediaList, showUiOpen, showAllFormats) {
    let skipped = 0;
    mediaList.forEach((entry) => {
      entry.qualities.forEach(async (quality) => {
        let isM3u8 = quality.type.toLowerCase().startsWith('m3u8');
        let showAlways = !isM3u8 || (isM3u8 && ((quality.islive || quality.isloaded) && !quality.ismuxed));
        skipped += !showAlways;
        if (showAlways || showAllFormats) {
          createDownloadUiAndAddUrl(showUiOpen, showAllFormats, entry.title, entry.description, quality, skipped);
        }
      })
    });
  }

  function deleteDownloadUi() {
    debug("deleteDownloadUi()");
    let el = document.getElementById("i2d-popup");
    if (el) {
      el.parentElement.removeChild(el);
    }
  }

  function createDownloadUiAndAddUrl(showUiOpen, showAllFormats, title, description, downloadInfo, skippedFormats)
  {
    debug("createDownloadUiAndAddUrl()");

    // look which ui elements we have already created before
    let el = document.getElementById("i2d-popup");
    let elCanvas = document.getElementById("i2d-canvas");
    let elDiv = document.getElementById("i2d-popup-div");
    let elDivTopLine = document.getElementById("i2d-popup-eldivtopline");
    let elDivBottomLine = document.getElementById("i2d-popup-eldivbottomline");
    // remove already existing bottom buttons line (get recreated after adding of new download entry)
    if (elDivBottomLine) {
      elDivBottomLine.parentElement.removeChild(elDivBottomLine);
    }

    // create popup dialog elements (if not existing already)
    if (!el) {
      el = document.createElement("div");
      el.id = "i2d-popup";
      el.style = "font-size: 14px; font-family: sans-serif; color: black; max-width: 100%; max-height: 100%; height: auto; width: auto; background: rgb(160, 160, 160); top: 100px; left: 0px; line-height: normal; text-align: left; position: absolute;";
      el.style.cursor = "default";
      el.style.zIndex = Number.MAX_SAFE_INTEGER - 1;
      //el.style.overflow = "scroll";

      elDivTopLine = document.createElement("div");
      elDivTopLine.id = "i2d-popup-eldivtopline";
      elDivTopLine.style = "display: block; overflow: auto; padding-bottom: 0px; padding-left: 5px; padding-right: 5px;";

      let elspan = document.createElement("span");
      elspan.id = "i2d-popup-x";
      elspan.style = "font-size: 105%; color: rgb(153, 0, 0); padding-left: 0px; float: left; display: inline; text-decoration: underline;";
      elspan.style.cursor = "pointer";//'crosshair';
      elspan.innerHTML = '[hide]';
      elDivTopLine.appendChild(elspan);

      let elspan1 = document.createElement("span");
      elspan1.id = "i2d-popup-close";
      elspan1.style = "font-size: 105%; color: rgb(153, 0, 0); padding-right: 0px; float: right; display: inline; text-decoration: underline;";
      elspan1.style.cursor = "pointer";//'crosshair';
      elspan1.innerHTML = '[X]' //'[close]';
      elspan1.onclick = () => { deleteDownloadUi(); };
      elDivTopLine.appendChild(elspan1);

      elDiv = document.createElement("div");
      elDiv.id = "i2d-popup-div";
      elDiv.style = "display: block; padding: 0px;";

      if (showUiOpen) {
        // initially set to 'shown' state
        elspan.innerHTML = '[hide]';
        elDiv.style.display = "block";
        elspan1.style.display = "inline";
      } else {
        // initially set to 'hidden' state
        elspan.innerHTML = '[show]';
        elDiv.style.display = "none";
        elspan1.style.display = "none";
      }

      elspan.onclick = function() {
        //var eldiv = document.getElementById("i2d-popup-div"); var elspan = document.getElementById("i2d-popup-x"); var elspan1 = document.getElementById("i2d-popup-close");
        if (elDiv.style.display === "none") {
          elspan.innerHTML = '[hide]';
          elDiv.style.display = "block";
          elspan1.style.display = "inline";
        } else {
          elspan.innerHTML = '[show]';
          elDiv.style.display = "none";
          elspan1.style.display = "none";
        }
      };

      elCanvas = document.createElement("canvas");
      elCanvas.id = "i2d-canvas";
      elCanvas.width = 53;
      elCanvas.height = 15;

      el.appendChild(elCanvas);
      el.appendChild(elDivTopLine);
      el.appendChild(elDiv);
      document.documentElement.appendChild(el);
    }

    if (downloadInfo == null || downloadInfo.type == null || downloadInfo.quality == null) {
      // exit with canvas progress ui
      elDivTopLine.style.display = "none";
      let canvas = elCanvas;
      var ctx = canvas.getContext("2d");
      //var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      //gradient.addColorStop("0", "magenta");
      //gradient.addColorStop("0.5", "blue");
      //gradient.addColorStop("1.0", "red");
      //ctx.strokeStyle = gradient;
      ctx.textBaseline = 'top';
      ctx.font = elDiv.font;
      ctx.fillStyle = "rgb(160, 160, 160)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      //ctx.strokeText("analysing", 3, 3);
      var progressFunction = function (progress) {
        if (canvas.parentElement) {
          if (progress > 100) {
            ctx.fillStyle = "rgb(160, 160, 160)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            //ctx.strokeText("analysing", 3, 3);
            progress = 0;
          } else {
            ctx.fillStyle = "#FF0000";
            let progressWidth = (canvas.width - 6) * progress / 100;
            ctx.fillRect(3, 3, progressWidth, canvas.height);
            //ctx.strokeText("analysing", 3, 3);
          }
          progress += 5;
          setTimeout(function () { progressFunction(progress); }, 500);
        }
      };
      setTimeout(function () { progressFunction(5); }, 500);
      return elCanvas;
    }

    // switch to normal popup ui
    if (elCanvas && elCanvas.parentElement) {
      elCanvas.parentElement.removeChild(elCanvas);
    }
    elDivTopLine.style.display = "block";

    let mediaType = downloadInfo.type.toLowerCase();
    let quality = downloadInfo.quality.toLowerCase();
    let isLive = downloadInfo.islive;
    let isM3U8 = mediaType.startsWith('m3u8');

    // *** build filename ***
    fileTitle = downloadInfo.title || title;
    // ensure the title info is valid for filenames
    let fileName = convertTitleToValidFilename(fileTitle);
    // add quality info to the file name (unless it was a dedicated quality file title already)
    if (!downloadInfo.title && quality) {
      //"quality": {
      //  "url": null,
      //  "type": "",
      //  "quality": "",
      //  "isaudio": false,
      //  "islive": false,
      //  "isloaded": false,
      //  "processed": false,
      //  "ismuxed": false,
      //  "muxedAudioQuality": null,
      //  "content": ""
      //}] 
      let qualityName = quality;
      qualityName = (downloadInfo.isaudio ? 'audio_' + quality : qualityName);
      qualityName = (downloadInfo.issubtitle ? 'sub_' + quality : qualityName);
      qualityName = (downloadInfo.ismuxed ? 'muxed ' + qualityName + ' ' + downloadInfo.muxedAudioQuality : qualityName);
      qualityName = (downloadInfo.processed && !downloadInfo.ismuxed ? 'processed ' + qualityName : qualityName);
      //qualityName = (downloadInfo.isloaded && !downloadInfo.processed && !downloadInfo.ismuxed ? 'loaded ' + qualityName : qualityName);
      qualityName = (downloadInfo.islive ? 'live ' + qualityName : qualityName);
      qualityName = (isM3U8 && !downloadInfo.isloaded ? 'original ' + qualityName : qualityName);
      fileName = fileName + " (" + qualityName + ")";
    }
    // add filextension matching the stream container format (.mp4, .m3u8, ...)
    let mediaFileName = fileName + '.' + mediaType;

    // add download entry line
    eldivdownload = document.createElement("div");
    eldivdownload.id = "i2d-popup-eldivdownload";
    eldivdownload.style = "font-size: 90%; display: block; overflow: auto; padding-top: 1px; padding-bottom: 1px; padding-left: 10px; padding-right: 5px;";
    elDiv.appendChild(eldivdownload);

    // add download entry
    let el_a = document.createElement("a");
    el_a.href = downloadInfo.url;
    el_a.target = '_blank';
    el_a.download = mediaFileName;
    el_a.title = 'Download: "' + mediaFileName + '"';
    el_a.innerHTML = mediaFileName;
    el_a.style = "padding-right: 10px;";
    el_a.style.cursor = "pointer";
    el_a.style.color = "blue";
    el_a.style.textDecoration = "underline";
    eldivdownload.appendChild(el_a);

    if (isM3U8) {
      spanGroup = document.createElement("span");
      //spanGroup.id = "i2d-save-group";
      spanGroup.style = "float: right; display: inline; padding-right: 10px;";
      eldivdownload.appendChild(spanGroup);

      // add specialized buttons for async download operations (in case of m3u8 streaming formats)
      if (isLive && quality != 'master') {
        let videoFileName = fileName + ".m3u8";
        let spanSave = document.createElement("span");
        //spanSave.id = "i2d-popup-save_" + fileName;
        spanSave.style = "color: rgb(153, 0, 0); float: right; display: inline; text-decoration: underline; padding-right: 10px;";
        spanSave.innerHTML = '[save m3u8]';
        spanSave.style.cursor = 'pointer';
        spanGroup.appendChild(spanSave);
        spanSave.onclick = () => {
          let isCanceled = false;
          spanSave.innerHTML = '[save m3u8...]';
          spanSave.style.cursor = 'progress';
          spanSave.onclick = () => { alert('\nconfirm to stop the running download of live stream into full m3u8\n\n(use appearing download link to download the result)'); isCanceled = true; };
          spanSave.style.color = "rgb(80, 80, 80)";
          saveM3U8LivePlayListAsync(downloadInfo.url, 
            (saveBlob) => {
              //alert("saveBlob created");
              //window.saveAs(videoBlob, videoFileName);
              spanSave.innerHTML = '[save m3u8 done]';
              spanSave.style.cursor = 'help';
              spanSave.onclick = () => { alert('\ndownload of live stream into full m3u8 blob completed\n\n(use download link to download the result)'); };
              // add download anchor to the document:
              let saveUrl = window.URL.createObjectURL(saveBlob);
              let anc = document.createElement("a");
              anc.href = saveUrl;
              anc.target = '_blank';
              anc.download = videoFileName;
              anc.title = 'Download: "' + videoFileName + '"';
              anc.innerHTML = videoFileName;
              anc.style = "padding-left: 5px; padding-right: 5px;";
              anc.style.cursor = "pointer";
              anc.style.color = "blue";
              anc.style.textDecoration = "underline";
              anc.onclick = () => { };
              spanSave.parentElement.appendChild(anc);
              //spanSave.insertAdjacentElement('afterend', anc);
            },
            (error) => {
              spanSave.innerHTML = '[save m3u8 failed]';
              spanSave.style.cursor = 'help';//'not-allowed';
              spanSave.onclick = () => { alert('\ndownload of live stream into full m3u8 failed with error ' + error); };
            },
            () => { return isCanceled; }
          );
        };
      }
      else {
        let videoFileName = fileName + ".mp4";
        let spanSave = document.createElement("span");
        //spanSave.id = "i2d-popup-save_" + fileName;
        spanSave.style = "color: rgb(153, 0, 0); float: right; display: inline; text-decoration: underline; padding-right: 10px;";
        spanSave.innerHTML = '[save mp4]';
        spanSave.style.cursor = 'pointer';
        spanGroup.appendChild(spanSave);
        spanSave.onclick = () => {
          let isCanceled = false;
          spanSave.innerHTML = '[save mp4...]';
          spanSave.style.cursor = 'progress';
          spanSave.onclick = () => { alert('\nconfirm to stop the running download of stream into mp4\n\n(use appearing download link to download the result)'); isCanceled = true; };
          spanSave.style.color = "rgb(80, 80, 80)";
          saveM3U8VideoAsMP4Async(downloadInfo.url, downloadInfo.content,
            (saveBlob) => {
              //alert("saveBlob created");
              //window.saveAs(videoBlob, videoFileName);
              spanSave.innerHTML = '[save mp4 done]';
              spanSave.style.cursor = 'help';
              spanSave.onclick = () => { alert('\ndownload of stream into mp4 completed\n\n(use download link to download the result)'); };
              // add download anchor to the document:
              let saveUrl = window.URL.createObjectURL(saveBlob);
              let anc = document.createElement("a");
              anc.href = saveUrl;
              anc.target = '_blank';
              anc.download = videoFileName;
              anc.title = 'Download: "' + videoFileName + '"';
              anc.innerHTML = videoFileName;
              anc.style = "padding-left: 5px; padding-right: 5px;";
              anc.style.cursor = "pointer";
              anc.style.color = "blue";
              anc.style.textDecoration = "underline";
              anc.onclick = () => { };
              spanSave.parentElement.appendChild(anc);
              //spanSave.insertAdjacentElement('afterend', anc);
            },
            (error) => {
              spanSave.innerHTML = '[save mp4 failed]';
              spanSave.style.cursor = 'help';//'not-allowed';
              spanSave.onclick = () => { alert('\ndownload of stream into full mp4 blob failed with error ' + error); };
            },
            () => { return isCanceled; }
          );
        };
      }
    }

    // add bottom button line
    elDivBottomLine = document.createElement("div");
    elDivBottomLine.id = "i2d-popup-eldivbottomline";
    elDivBottomLine.style = "display: block; overflow: auto; padding-top: 2px; padding-bottom: 0px; padding-left: 5px; padding-right: 5px;";
    elDiv.appendChild(elDivBottomLine);

    // add the 'show all' button
    if (skippedFormats) {
      let spanShowAll = document.createElement("span");
      spanShowAll.id = "i2d-popup-showall";
      //spanShowAll.innerHTML = showAllFormats ? '[show less <<]' : '[show all >>]';
      spanShowAll.innerHTML = showAllFormats ? '[<< less <<]' : '[>> show remaining ' + skippedFormats + ' >>]';
      spanShowAll.style = "font-size: 105%; color: rgb(153, 0, 0); padding-left: 0px; float: left; display: inline; text-decoration: underline;";
      spanShowAll.style.cursor = "pointer";
      spanShowAll.onclick = showAllFormats ? () => { analysePageAndCreateUiAsync(true, false); } : () => { analysePageAndCreateUiAsync(true, true); };
      elDivBottomLine.appendChild(spanShowAll);
    }

    // add the 'refesh' button
    let spanRefresh = document.createElement("span");
    spanRefresh.id = "i2d-popup-refresh";
    spanRefresh.style = "font-size: 105%; color: rgb(153, 0, 0); padding-right: 0px; float: right; display: inline; text-decoration: underline;";
    spanRefresh.style.cursor = "pointer";
    spanRefresh.innerHTML = '[refresh]';
    spanRefresh.onclick = showAllFormats ? () => { analysePageAndCreateUiAsync(true, true); } : () => { analysePageAndCreateUiAsync(true, false); };
    elDivBottomLine.appendChild(spanRefresh);
    
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
  
  // we bypass injection if we run under ProcessWebPage control (no sandboxing)
  let ThisScriptId = 'ProcessWebPage_Main';
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
    let scriptId = 'UserScript_CodeToInject_' + 'DLWSMEDIA.js';
    script.type = 'text/javascript';
    script.id = scriptId; //ThisScriptId;
    //script.textContent = '(' + setupScriptCode + ')("' + chromeExtensionScriptUrl.toString() + '");';
    script.textContent = setupScriptCode + ' CodeToInject("' + chromeExtensionScriptUrl.toString() + '");';
    
    // workaround manifest v3 security limitations
    // https://stackoverflow.com/questions/46256983/script-causes-refused-to-execute-inline-script-either-the-unsafe-inline-keyw
    // https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html#Refactoring_inline_code
    // https://developers.google.com/web/fundamentals/security/csp/#if_you_absolutely_must_use_it
    // https://content-security-policy.com/examples/meta/
    // https://content-security-policy.com/nonce/
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
    //<meta http-equiv="Content-Security-Policy" content="default-src 'self';  style-src 'self' 'unsafe-inline';  media-src *;  script-src 'sha256-U/1Cp5Elz9NfczwpPo+2+ttf/q3uGeHkNzfBRlH5crA='">
    let random = 'rAnd0m';
    let csp = document.createElement('meta');
    csp.setAttribute('http-equiv', "Content-Security-Policy");
    //csp.setAttribute('content', "default-src 'self' 'unsafe-inline' *;  media-src 'self' 'unsafe-inline' *;  style-src 'self' 'unsafe-inline' *;  script-src 'self' 'unsafe-inline' 'sha256-U/1Cp5Elz9NfczwpPo+2+ttf/q3uGeHkNzfBRlH5crA='");
    csp.setAttribute('content', "default-src 'self' 'unsafe-inline' *;  media-src 'self' 'unsafe-inline' *;  style-src 'self' 'unsafe-inline' *;  script-src 'nonce-" + random + "' 'self' 'unsafe-inline' *;");
    script.nonce = random;
    document.body.onload = function() { 
      console.log("[Media Download] injectCode - script");
      script.nonce = "";
      document.head.appendChild(script); 
    }
    
    //console.log("[Media Download] injectCode - csp");
    //document.head.appendChild(csp)

    //script.nonce = "";
    //document.head.appendChild(script);
  }


  //window.onload = function () {
  //  console.log("[Media Download] window.onload");
  //  injectCode();
  //};
  //window.onload = injectCode();
  injectCode();

})(); //(function content() {
