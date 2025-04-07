// IWRDTY - Improve Web Readability
// "https://*.de/*"
// "https://www.klettern.de/*"
// "https://www.rockandice.com/*"
// "https://www.adac.de/*"

(function content() {

    //--------------------------------------------------------------------------------------------------
    // basic script functions

    let alertMode = false;
    let verboseMode = true;
    let appendToDom = false;
    let DEBUG_ID = "DEBUG_IWRDTY";

    function debug(vipLevel, msg) {
      if (vipLevel && alertMode) {
        alert(msg);
      }
      if (vipLevel || verboseMode) {
        console.log("[Improve Web Readability] " + msg);
        if (appendToDom) {
          let debugElem = document.getElementById(DEBUG_ID);
          if (!debugElem) {
            debugElem = createHiddenElem('div', DEBUG_ID);
          }
          debugElem.appendChild(document.createTextNode(msg + ' '));
        }
      }
    }

    let domLoaded = function (callback) {
        //* Internet Explorer *
        //@cc_on
        //@if (@_win32 || @_win64)
        //  document.write('<script id="ieScriptLoad" defer src="//:"><\/script>');
        //  document.getElementById('ieScriptLoad').onreadystatechange = function () {
        //    if (this.readyState == 'complete') {
        //      callback();
        //    }
        //  };
        //  return;
        //@end@
        //* Mozilla, Chrome, Opera *
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', callback, false);
            return;
        }
        //* Safari, iCab, Konqueror *
        if (/KHTML|WebKit|iCab/i.test(navigator.userAgent)) {
            let DOMLoadTimer = setInterval(function () {
                if (/loaded|complete/i.test(document.readyState)) {
                    callback();
                    clearInterval(DOMLoadTimer);
                }
            }, 10);
            return;
        }
        //* Other web browsers *
        window.onload = callback;
    };

    const getChildTreeAsNodeList = (node, result = []) => {
      Array.prototype.forEach.call(node.childNodes, function (child) {
        result.push(child);
        getChildTreeAsNodeList(child, result);
      });
      return result;
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
        let div = document.getElementById(MASK_ID_PROCESSING);
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
        let isAnyOfValidPages = false;
        let isKletternDePage = false;
        let isHeiseDePage = false;
        let isGigaDePage = false;
        let isAdacDePage = false;
        let isRockAndIceComPage = false;
        if (!isAnyOfValidPages) {
            if (document.URL.indexOf('.klettern.de') > 0) {
                isKletternDePage = true; isAnyOfValidPages = true;
                debug(true, "IWRDTYmodifyDocument -> isKletternDePage");
            }
        }
        if (!isAnyOfValidPages) {
            if (document.URL.indexOf('.adac.de') > 0) {
                isAdacDePage = true; isAnyOfValidPages = true;
                debug(true, "IWRDTYmodifyDocument -> isAdacDePage");
            }
        }
        if (!isAnyOfValidPages) {
            if (document.URL.indexOf('.heise.de') > 0) {
                isHeiseDePage = true; isAnyOfValidPages = true;
                debug(true, "IWRDTYmodifyDocument -> isHeiseDePage");
            }
        }
        if (!isAnyOfValidPages) {
            if (document.URL.indexOf('.giga.de') > 0) {
                isGigaDePage = true; isAnyOfValidPages = true;
                debug(true, "IWRDTYmodifyDocument -> isGigaDePage");
            }
        }
        if (!isAnyOfValidPages) {
            if (document.URL.indexOf('.rockandice.com') > 0) {
                isRockAndIceComPage = true; isAnyOfValidPages = true;
                debug(true, "IWRDTYmodifyDocument -> isRockAndIceComPage");
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

        debug(true, "IWRDTYmodifyDocument:: start Processing");
        processStart();
        let dochtml = document.documentElement;

        // (1) GENRAL processing
        removeGoogleAnalytics(dochtml);
        //let allChilds = getChildTreeAsNodeList(dochtml); //debug(false, "IWRDTYmodifyGebietPage getChildTreeAsNodeList.length: " + allChilds.length);
        //for (var child of allChilds) {
        //  if (child.tagName == "H3") {
        //    //child.parentElement.removeChild(child);
        //  }
        //}


        // (2) remove specific unwanted content
        if (isAdacDePage) {
            debug(false, "isAdacDePage")
            Array.prototype.forEach.call(dochtml.querySelectorAll("main>div+div"), function (element) {
                debug(false, "found div")
                //element.className = ""
                element.style.maxWidth = ""
            });
            Array.prototype.forEach.call(dochtml.querySelectorAll("main"), function (element) {
                debug(false, "found main")
                element.className = ""
            });
        }
        if (isKletternDePage) {
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
            removeElement(dochtml, "div#div-gpt-ad-banner");
            removeElement(dochtml, "div#div-gpt-ad-sky");
            removeElement(dochtml, "div#div-gpt-ad-posterad");
            removeElement(dochtml, "div#div-gpt-ad-rectangle");
            removeElement(dochtml, "div.sm-screen"); //"teads-inread sm-screen"
            removeElement(dochtml, "footer.mps-footer");
            removeElement(dochtml, "div.scroller");
            // hide Inhaltsverzeichnis oben:
            hideElement(dochtml, "div#pagination-content-top");
            // hide Photoshow Boxes:
            hideElement(dochtml, "div.photo-show"); //"mps-ce box photo-show"
        }
        if (isHeiseDePage) { 
            removeElement(dochtml, "a-ad");
            removeElement(dochtml, "div#wtma_teaser");
            removeElement(dochtml, "div#mitte_rechts");
            removeElement(dochtml, "aside.akwa-ad-container");
            removeElement(dochtml, "aside.recommendations");
            removeElement(dochtml, "div.teads-inread");
            removeElement(dochtml, "div.ho-stage-container");
            removeElement(dochtml, "div.bottom_up");
            removeElement(dochtml, "footer.main-footer");
        }
        if (isGigaDePage) { 
            removeElement(dochtml, "div.u-shape");
            removeElement(dochtml, "div.u-shape-top");
            removeElement(dochtml, "div.section"); //section spacer-md
            removeElement(dochtml, "div.ed-container");
            removeElement(dochtml, "div.social-media-bar");
            removeElement(dochtml, "footer.main-footer");
            removeElement(dochtml, "div#sdgAdServerContainer-posterad");
            removeElement(dochtml, "div#sdgAdServerContainer-banner");
            removeElement(dochtml, "div#sdgAdServerContainer-sky");
        }
        if (isRockAndIceComPage) { 
            removeElement(dochtml, "div.topAdsBanner");
            removeElement(dochtml, "div.googleAdds");
            removeElement(dochtml, "div.minibanner");
            removeElement(dochtml, "section.boxed");
            removeElement(dochtml, "footer.site-footer");
            // removeElement(dochtml, "div.row"); // removes News from right side
            removeElement(dochtml, "div.dynamicoffset"); // removes News from right side and bottom
            Array.prototype.forEach.call(dochtml.querySelectorAll("div.content-area"), function (element) {
                element.style.width = '90%';
            });
            Array.prototype.forEach.call(dochtml.querySelectorAll("div.col-md-10"), function (element) {
                element.style.width = '100%';
            });
        }

        debug(true, "IWRDTYmodifyDocument:: finished Processing");
        processEnd();
    }
    

    //----------------------------------------------------------------------------------------------------
    // START of document processing
    debug(true, "START of document processing");
    //let topWindow = window == top;
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
