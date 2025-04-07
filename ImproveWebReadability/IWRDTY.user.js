// IWRDTY - Improve Web Readability

(function content() {

    //--------------------------------------------------------------------------------------------------
    // basic script functions

    var alertMode = false;
    var verboseMode = false; //true;

    function debug(doAlert, str) {
      if (doAlert && alertMode) {
        alert(str);
      }
      if (doAlert || verboseMode) {
        console.log(str);
      }
      //var debugElem=document.getElementById(DEBUG_ID);
      //if (!debugElem) {
      //  debugElem=createHiddenElem('div', DEBUG_ID);
      //}
      //debugElem.appendChild(document.createTextNode(str+' '));
    }

    var domLoaded = function (callback) {
        /* Internet Explorer */
        /*
        @cc_on
        @if (@_win32 || @_win64)
          document.write('<script id="ieScriptLoad" defer src="//:"><\/script>');
          document.getElementById('ieScriptLoad').onreadystatechange = function () {
            if (this.readyState == 'complete') {
              callback();
            }
          };
          return;
        @end@
        */
        /* Mozilla, Chrome, Opera */
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', callback, false);
            return;
        }
        /* Safari, iCab, Konqueror */
        if (/KHTML|WebKit|iCab/i.test(navigator.userAgent)) {
            var DOMLoadTimer = setInterval(function () {
                if (/loaded|complete/i.test(document.readyState)) {
                    callback();
                    clearInterval(DOMLoadTimer);
                }
            }, 10);
            return;
        }
        /* Other web browsers */
        window.onload = callback;
    };

    const getChildTreeAsNodeList = (node, result = []) => {
      Array.prototype.forEach.call(node.childNodes, function (child) {
        result.push(child);
        getChildTreeAsNodeList(child, result);
      });
      return result;
    } 

    function removeUrlParameter(uri, name) {
      var newUri = uri.trim();
      var paramsIdx = newUri.indexOf("?");
      debug(false, "removeUrlParameter -> paramsIdx=" + paramsIdx);
      if (paramsIdx > 0) {
        var paramIdx = newUri.indexOf(name + "=");
        debug(false, "removeUrlParameter -> paramIdx=" + paramIdx);
        if (paramIdx > paramsIdx) {
          // replace existing param value
          var finalUri = newUri.substr(paramIdx);
          debug(false, "removeUrlParameter -> finalUri=" + finalUri);
          var paramEndIdx = finalUri.indexOf("&");
          if (paramEndIdx > 0) {
            newUri = newUri.substr(0,paramIdx) + newUri.substr(paramEndIdx);
          }
          else {
            newUri = newUri.substr(0,paramIdx);
          }
        }
      }
      debug(false, "removeUrlParameter -> newUri=" + newUri);
      return newUri;
    }

    function addUrlParameter(uri, name, value) {
      var newUri = uri.trim();
      var paramsIdx = newUri.indexOf("?");
      if (paramsIdx > 0) {
        var paramIdx = newUri.indexOf(name + "=");
        if (paramIdx > paramsIdx) {
          // replace existing param value
          // ...todo...
        }
        else {
          // add param to param list
          if (newUri.endsWith("?") || newUri.endsWith("&")) {
            newUri = newUri + name + "=" + value;
          }
          else {
            newUri = newUri + "&" + name + "=" + value;
          }
        }
      }
      else {
        // add new param list
        var newUri = uri.trim();
        if (newUri.endsWith("/")) {
          newUri = newUri + "?" + name + "=" + value;
        }
        else {
          newUri = newUri + "/?" + name + "=" + value;
        }
      }
      return newUri;
    }
    
    function getAllUrlParams(url) {
      // https://www.sitepoint.com/get-url-parameters-with-javascript/
      // get query string from url (optional) or window
      var queryString = url ? url.split('?')[1] : window.location.search.slice(1);
    
      // we'll store the parameters here
      var obj = {};
    
      // if query string exists
      if (queryString) {
    
        // stuff after # is not part of query string, so get rid of it
        queryString = queryString.split('#')[0];
    
        // split our query string into its component parts
        var arr = queryString.split('&');
    
        for (var i=0; i<arr.length; i++) {
          // separate the keys and the values
          var a = arr[i].split('=');
    
          // in case params look like: list[]=thing1&list[]=thing2
          var paramNum = undefined;
          var paramName = a[0].replace(/\[\d*\]/, function(v) {
            paramNum = v.slice(1,-1);
            return '';
          });
    
          // set parameter value (use 'true' if empty)
          var paramValue = typeof(a[1])==='undefined' ? true : a[1];
    
          // (optional) keep case consistent
          paramName = paramName.toLowerCase();
          paramValue = paramValue.toLowerCase();
    
          // if parameter name already exists
          if (obj[paramName]) {
            // convert value to array (if still string)
            if (typeof obj[paramName] === 'string') {
              obj[paramName] = [obj[paramName]];
            }
            // if no array index number specified...
            if (typeof paramNum === 'undefined') {
              // put the value on the end of the array
              obj[paramName].push(paramValue);
            }
            // if array index number specified...
            else {
              // put the value at that index number
              obj[paramName][paramNum] = paramValue;
            }
          }
          // if param name doesn't exist yet, set it
          else {
            obj[paramName] = paramValue;
          }
        }
      }
      return obj;
    }

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        var cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        debug(false, "setCookie -> '" + cookie + "'");
        document.cookie = cookie;
    }
    
    function getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        debug(false, "getCookie -> decodedCookie = '" + decodedCookie + "'");
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                var cookieValue = c.substring(name.length, c.length);
                debug(false, "getCookie -> " + cname + " = '" + cookieValue + "'");
                return cookieValue;
            }
        }
        return "";
    }

    //--------------------------------------------------------------------------------------------------
    // functions for process state marking

    var MASK_ID_PREPROCESSED = "__IWRDTY_mask_preprocessed__";
    var MASK_ID_PROCESSING = "__IWRDTY_mask_processing__";
    var MASK_ID_PROCESSED = "__IWRDTY_mask_processed__";

    function setProcessPages(processPages) {
        return setCookie("IWRDTYProcessPages", processPages, 7);
    }

    function getProcessPages() {
        return getCookie("IWRDTYProcessPages");
    }

    function isPreProcessed() {
        var div = document.getElementById(MASK_ID_PREPROCESSED);
        if (div) {
            return true;
        }
        return false;
    }

    function isProcessing() {
        var div = document.getElementById(MASK_ID_PROCESSING);
        if (div) {
            return true;
        }
        return false;
    }

    function isProcessed() {
        var div = document.getElementById(MASK_ID_PROCESSED);
        if (div) {
            return true;
        }
        return false;
    }

    function markAsPreProcess() {
        var div = document.getElementById(MASK_ID_PREPROCESSED);
        if (!div) {
            div = document.createElement("div");
            div.id = MASK_ID_PREPROCESSED;
            div.style.position = "fixed";
            div.style.top = "0px";
            div.style.left = "0px";
            div.style.height = "0%";
            div.style.width = "0%";
            div.style.backgroundColor = "black";
            div.style.zIndex = 0;
            div.style.opacity = 0;
            document.body.appendChild(div);
            //div.offsetWidth;
        }
    }

    function unmarkAsPreProcessed() {
        var div = document.getElementById(MASK_ID_PREPROCESSED);
        if (div) {
            document.body.removeChild(div);
        }
    }

    function processStart() {
        debug(false, "processStart");
        var div = document.getElementById(MASK_ID_PROCESSING);
        debug(false, "processStart:: found div MASK_ID_PROCESSING : " + div);

        if (!div) {
            debug(false, "adding div MASK_ID_PROCESSING");
            div = document.createElement("div");
            div.id = MASK_ID_PROCESSING;
            div.style.position = "fixed";
            div.style.top = "0px";
            div.style.left = "0px";
            div.style.height = "100%";
            div.style.width = "100%";
            div.style.backgroundColor = "black";
            div.style.zIndex = 2147483647;
            div.style.opacity = 0;
            div.style["-webkit-transition"] = "opacity 250ms";
            document.body.appendChild(div);
            div.offsetWidth;
            div.style.opacity = .3;
        }
    }

    function processEnd() {
        var div = document.getElementById(MASK_ID_PROCESSING);
        if (div)
            document.body.removeChild(div);

        div = document.getElementById(MASK_ID_PROCESSED);
        if (!div) {
            div = document.createElement("div");
            div.id = MASK_ID_PROCESSED;
            div.style.position = "fixed";
            div.style.top = "0px";
            div.style.left = "0px";
            div.style.height = "0%";
            div.style.width = "0%";
            div.style.backgroundColor = "black";
            div.style.zIndex = 0;
            div.style.opacity = 0;
            document.body.appendChild(div);
            //div.offsetWidth;
        }

        //unmarkAsPreProcessed();
    }

    //--------------------------------------------------------------------------------------------------
    // functions for IWRDTY modifications...

    function removeGoogleAnalytics(html) {
        debug(true, "removeGoogleAnalytics");
        Array.prototype.forEach.call(html.querySelectorAll("script"), function (element) {
            var matches = element.textContent.match(/GoogleAnalytics/gi);
            if (matches != null && matches.length > 0) {
                debug(false, "removing script: \n" + element.textContent);
                element.parentElement.removeChild(element); //identisch mit: element.remove();
            }
            else {
                var srcArrrib = element.getAttribute("src");
                if (srcArrrib) {
                    var matches = srcArrrib.match(/google.*analytics/gi);
                    if (matches != null && matches.length > 0) {
                        debug(false, "removing script: \n" + srcArrrib);
                        element.parentElement.removeChild(element);
                    }
                }
            }
        });
    }

    function kickoutDivBetweenBodyAndDiv(html, divToShiftToBody) {
        debug(true, "kickoutDivBetweenBodyAndDiv");
        //var bgdiv = html.querySelectorAll("#bg:nth-of-type(1)")[0];
        var divToShift = html.querySelectorAll("#" + divToShiftToBody + ":nth-of-type(1)")[0];
        var divToKickout = divToShift.parentElement;

        debug(false, "moving div under body (" + divToKickout.getAttribute("id") + "-> " + divToShift.getAttribute("id") + ")");
        divToShift.parentElement.removeChild(divToShift);
        divToKickout.parentElement.insertBefore(divToShift, divToKickout);
        debug(false, "removing div: " + divToKickout.getAttribute("id"));
        divToKickout.parentElement.removeChild(divToKickout);
    }

    function removeElement(html, selector) {
        debug(false, "removeElement '" + selector + "'");
        Array.prototype.forEach.call(html.querySelectorAll(selector), function (element) {
            debug(false, "removeElement - removing element '" + element + "'");
            element.parentElement.removeChild(element);
        });
    }

    function hideElement(html, selector) {
        debug(false, "hideElement '" + selector + "'");
        Array.prototype.forEach.call(html.querySelectorAll(selector), function (element) {
            debug(false, "removeElement - removing element '" + element + "'");
            element.style.display = "none";
        });
    }

    function modifyDivWithClassName(html, classname, newClassName) {
        debug(false, "modifyDivWithClassName");
        Array.prototype.forEach.call(html.querySelectorAll("div." + classname), function (element) {
            debug(false, "modifing div class name from: " + element.attributes.getNamedItem("class").value + " to: " + newClassName);
            element.attributes.getNamedItem("class").value = newClassName;
        });
    }

    // something about arrays:
    //var replaceFromTo = [,]; //[[]]; //new Array(matches.length, 2);
    //replaceFromTo[i][0] = matches[i].toString();
    //replaceFromTo[i][1] = matches[i].toString().replace(/$/i, "<b>").replace(/$/i, "</b>");

    // END OF GENERAL FUNCTIONS
    //--------------------------------------------------------------------------------------------------

    function IWRDTYadaptElementStyles(html) {
        debug(true, "IWRDTYadaptElementStyles");

        // adapt body style
        Array.prototype.forEach.call(html.querySelectorAll("body"), function (element) {
            debug(false, "modifying body");
            element.style = "";
            element.style.marginLeft = "70px";
            element.style.backgroundColor = "#ffffff";
            element.style.fontSize = "15px";
            //element.style.margin = "30";
            element.insertBefore(document.createElement("br"), element.firstChild);
        });

        // adapt font size of headers
        Array.prototype.forEach.call(html.querySelectorAll("h1"), function (element) {
            debug(false, "modifying h1");
            //element.style = "";
            element.style.margin = "4px 0px 4px 0px";
            element.style.backgroundColor = "#ffffff";
            element.style.fontSize = "28px";
        });
        Array.prototype.forEach.call(html.querySelectorAll("h2"), function (element) {
            debug(false, "modifying h2");
            //element.style = "";
            element.style.margin = "4px 0px 4px 0px";
            element.style.backgroundColor = "#ffffff";
            element.style.fontSize = "26px";
        });
        Array.prototype.forEach.call(html.querySelectorAll("h3"), function (element) {
            debug(false, "modifying h3");
            //element.style = "";
            element.style.margin = "4px 0px 3px 0px";
            element.style.backgroundColor = "#ffffff";
            element.style.fontSize = "20px";
        });
        Array.prototype.forEach.call(html.querySelectorAll("h4"), function (element) {
            debug(false, "modifying h4");
            //element.style = "";
            element.style.margin = "4px 0px 3px 0px";
            element.style.backgroundColor = "#ffffff";
            element.style.fontSize = "20px";
        });

        var topoPageWidth = "1100px"; //-> table with + maxWith of TopImage must not exceed 1200px
        
        Array.prototype.forEach.call(html.querySelectorAll("div#content"), function (element) {
            element.style.borderStyle = "hidden";
            element.style.width = topoPageWidth;
        });
        
        Array.prototype.forEach.call(html.querySelectorAll("div#content-center"), function (element) {
            element.style.borderStyle = "hidden";
            element.style.padding = "0 0 0 0";
            element.style.width = topoPageWidth;
            element.style.color = "#202020"; //"#777777";
        });

        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section"), function (element) {
            element.style.borderStyle = "hidden";
            element.style.padding = "0 0 0 0";
            element.style.margin = "0 0 0 0";
            element.style.width = topoPageWidth;
            element.style.color = "#202020"; //"#777777";
        });

        Array.prototype.forEach.call(html.querySelectorAll("div#content-center p"), function (element) {
            element.style.width = topoPageWidth;
            element.style.color = "#202020"; //"#777777";
        });

        Array.prototype.forEach.call(html.querySelectorAll("div#content-center>div.poi-section-sectors>p"), function (element) {
            element.style.width = topoPageWidth;
            element.style.color = "#202020"; //"#777777";
        });

        // adapt table style
        Array.prototype.forEach.call(html.querySelectorAll("table.poi-table-small"), function (element) {
            element.style.lineHeight = "";
            element.style.marginBottom = "5px";
            //element.style.borderStyle = "1px solid black";
            // adapt floating and width to meet topoPageWidth:
            element.style.float = "left";
            element.style.width = "439px"; //table with + maxWith of TopImage must not exceed topoPageWidth
        });
        // adapt topo image style
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>table.poi-table-small>img"), function(element) {
            // adapt floating and width to meet topoPageWidth:
            element.style.margin = "0 0 0 0";
            //element.style.float = "right";
            element.style.width    = "600px"; //table with + maxWith of TopImage must not exceed topoPageWidth
            element.style.maxWidth = "660px"; //table with + maxWith of TopImage must not exceed topoPageWidth
        });

        // adapt stars image style
        Array.prototype.forEach.call(html.querySelectorAll("img"), function (element) {
            if (element.className.startsWith("stars")) {
              debug(false, "moving crag stars: " + element.textContent);
              element.className = "stars";
              element.style.margin = "0 0 0 0";
            }
        });

        // adapt th style
        Array.prototype.forEach.call(html.querySelectorAll("th"), function (element) {
            element.style.width = "150px";
            element.style.lineHeight = "";
        });

        // adapt ul style
        Array.prototype.forEach.call(html.querySelectorAll("ul"), function (element) {
            element.style.margin = "0 0 0px 0";
            element.style.lineHeight = "";
            element.style.color = "#202020"; //"#777777";
        });

        // adapt p style
        Array.prototype.forEach.call(html.querySelectorAll("p"), function (element) {
            //element.style.margin = "0 0 0px 0";
            element.style.margin = "0 0 10px 0";
            element.style.lineHeight = "";
        });

        // adapt h4 style
        Array.prototype.forEach.call(html.querySelectorAll("h4"), function (element) {
            //element.style.margin = "6px 0 6px 0";
            element.style.margin = "0px 0 6px 0";
            element.style.lineHeight = "";
        });

        // adapt route-list ol style
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list"), function (element) {
            element.style.width = topoPageWidth;
            element.style.margin = "0 0 0px 0";
            element.style.lineHeight = "";
        });
        // adapt route-list li style
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li"), function (element) {
            element.style.padding = "0 0 6px 0";
        });
        // adapt route-list li style
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li>p"), function (element) {
            element.style.padding = "0 0 0px 0";
            element.style.lineHeight = "";
        });
    }

    //----------------------------------------------------------------------------------------------------
    // START of main routine (IWRDTYmodifyDocument)

    function IWRDTYmodifyDocument(document) {
        debug(true, "IWRDTYmodifyDocument");
        
        if (isProcessing()) {
            debug(true, "IWRDTYmodifyDocument:: is Processing");
            return;
        }

        if (isProcessed()) {
            debug(true, "IWRDTYmodifyDocument:: is Processed");
            return;
        }

        // decide page type
        var isAnyOfValidPages = false;
        var isKletternDePage = false; 
        var isGigaDePage = false;
        if (!isAnyOfValidPages) {
          if (document.URL.indexOf('klettern.de') > 0) {
            isKletternDePage = true; isAnyOfValidPages = true;
            debug(true, "IWRDTYmodifyDocument -> isKletternDePage");
          }
        }
        if (!isAnyOfValidPages) {
          if (document.URL.indexOf('giga.de') > 0) {
            isGigaDePage = true; isAnyOfValidPages = true;
            debug(true, "IWRDTYmodifyDocument -> isGigaDePage");
          }
        }
        //if (!isAnyOfValidPages) {
        //  Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>div#current-topo-wrapper"), function (element) {
        //    isRoutePage = true; isAnyOfValidPages = true;
        //    debug(true, "IWRDTYmodifyDocument -> isRoutePage");
        //  });
        //}

        // do not process specific page types
        if (!isAnyOfValidPages) {
          return;
        }

        // do preprocessing
        /*
        if (!isPreProcessed()) {
            debug(true, "IWRDTYmodifyDocument:: start PreProcessing");
            // on first processing, we just add a clickable element for toggling Raw<>Processed
            markAsPreProcess();
          
            Array.prototype.forEach.call(document.documentElement.querySelectorAll("h2:nth-of-type(1)"), function (element) {
                debug(false, "manipulating crag name: " + element.textContent);

                // misuse crag name as anchor for backward link to overview page
                element.onclick = function () {
                    // toggle current page processing on every click
                    if (isProcessed()) {
                        setProcessPages(false);
                        location.reload();
                        return;
                    } else if (isPreProcessed()) {
                        setProcessPages(true);
                        IWRDTYmodifyDocument(document);
                        return;
                    }
                };
            });

            var processPages = getProcessPages();
            debug(true, "IWRDTYmodifyDocument -> processPages = " + processPages);
            if (processPages != "true") {
                debug(true, "IWRDTYmodifyDocument:: end PreProcessing -> wait for user input to start Processing");
                return;
            }
            debug(true, "IWRDTYmodifyDocument:: end PreProcessing -> start Processing");
        }*/

        debug(true, "IWRDTYmodifyDocument:: start Processing");

        processStart();

        var dochtml = document.documentElement;

        // (1) GENRAL processing
        removeGoogleAnalytics(dochtml);

        var allChilds = getChildTreeAsNodeList(dochtml); //debug(false, "IWRDTYmodifyGebietPage getChildTreeAsNodeList.length: " + allChilds.length);
        for (var child of allChilds) {
          if (child.tagName == "H3") {
            //child.parentElement.removeChild(child);
          }
        }

        // (4) remove general unwanted content 
        if (isKletternDePage) {
 	        removeElement(dochtml, "aside.mps-aside");
	        removeElement(dochtml, "nav.mps-article-topics");
	        removeElement(dochtml, "section.mps-partner");
	        removeElement(dochtml, "div#topBanner");
	        removeElement(dochtml, "div#rightBanner");
	        removeElement(dochtml, "div#taboola-below-article-thumbnails");
	        removeElement(dochtml, "div#div-gpt-ad-pubperform");
					removeElement(dochtml, "div#div-gpt-ad-idx_con_oben");
	        removeElement(dochtml, "div#div-gpt-ad-art_con_oben");
	        removeElement(dochtml, "div#div-gpt-ad-art_con_mitte");
	        removeElement(dochtml, "div#div-gpt-ad-art_pic");
	        removeElement(dochtml, "div.sm-screen"); //"teads-inread sm-screen"
	        removeElement(dochtml, "footer.mps-footer");
	        removeElement(dochtml, "div.scroller");
	        // hide Inhaltsverzeichnis oben:
	        hideElement(dochtml, "div#pagination-content-top");
	        // hide Photoshow Boxes:
	        hideElement(dochtml, "div.photo-show"); //"mps-ce box photo-show"
	      } 
	      f
        
        
        
        

        debug(true, "IWRDTYmodifyDocument:: finished Processing");
        processEnd();
    }
    
    //----------------------------------------------------------------------------------------------------
    // START of document processing

    debug(true, "START of document processing");

    //var topWindow = window == top;
    //debug(false, "this.url: " + this.url);
    //debug(false, "document.URL: " + document.URL);

    // here we do things after DOM loaded (e.g. kickout scripts we do not want to run or modify configurations)
    // for our scenario the current implementation is to early (with CHROME)
    //domLoaded(function () {
    //    debug(true, "domLoaded");
    //    IWRDTYmodifyDocument(document);
    //});

    // here we do further processings (to get all in a single file) after document completely loaded (and modified)
    window.onload = function () {
        debug(false, "onload");
        IWRDTYmodifyDocument(document);
    };
    
})();
