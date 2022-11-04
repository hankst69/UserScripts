// FJTP - FrankenJuraTopoPrint (content_20180731)

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

    var MASK_ID_PREPROCESSED = "__FJCTP_mask_preprocessed__";
    var MASK_ID_PROCESSING = "__FJCTP_mask_processing__";
    var MASK_ID_PROCESSED = "__FJCTP_mask_processed__";

    function setProcessPages(processPages) {
        return setCookie("FJCTPProcessPages", processPages, 7);
    }

    function getProcessPages() {
        return getCookie("FJCTPProcessPages");
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
    // functions for FJCTP modifications...

    function FJCTPremoveGoogleAnalytics(html) {
        debug(true, "FJCTPremoveGoogleAnalytics");
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

    function FJCTPremoveAllScriptsExceptOpenLayers(dochtml) {
        debug(true, "FJCTPremoveAllScriptsExceptOpenLayers");
        Array.prototype.forEach.call(dochtml.querySelectorAll("*[onload]"), function (node) {
            node.removeAttribute("onload");
        });

        Array.prototype.forEach.call(dochtml.querySelectorAll("script"), function (element) {
            var nameMatches = element.src.match(/OpenLayers/gi);
            var contentMatches = element.textContent.match(/OpenLayers/gi);
            if ((nameMatches != null && nameMatches.length > 0) || (contentMatches != null && contentMatches.length > 0)) {
                debug(false, "keeping OpenLayers scripts");
            }
            else {
                element.parentElement.removeChild(element);
            }
        });
    }

    function FJCTPkickoutDivBetweenBodyAndDiv(html, divToShiftToBody) {
        debug(true, "FJCTPkickoutDivBetweenBodyAndDiv");
        //var bgdiv = html.querySelectorAll("#bg:nth-of-type(1)")[0];
        var divToShift = html.querySelectorAll("#" + divToShiftToBody + ":nth-of-type(1)")[0];
        var divToKickout = divToShift.parentElement;

        debug(false, "moving div under body (" + divToKickout.getAttribute("id") + "-> " + divToShift.getAttribute("id") + ")");
        divToShift.parentElement.removeChild(divToShift);
        divToKickout.parentElement.insertBefore(divToShift, divToKickout);
        debug(false, "removing div: " + divToKickout.getAttribute("id"));
        divToKickout.parentElement.removeChild(divToKickout);
    }

    function FJCTPremoveElement(html, selector) {
        debug(false, "FJCTPremoveElement '" + selector + "'");
        Array.prototype.forEach.call(html.querySelectorAll(selector), function (element) {
            debug(false, "FJCTPremoveElement - removing element '" + element + "'");
            element.parentElement.removeChild(element);
        });
    }

    function FJCTPhideElement(html, selector) {
        debug(false, "FJCTPhideElement '" + selector + "'");
        Array.prototype.forEach.call(html.querySelectorAll(selector), function (element) {
            debug(false, "FJCTPremoveElement - removing element '" + element + "'");
            element.style.display = "none";
        });
    }

    function FJCTPmodifyDivWithClassName(html, classname, newClassName) {
        debug(false, "FJCTPmodifyDivWithClassName");
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
    // here starts the main FJCTP processing (processsing logic)...

    function FJCTPmodifyPoiTableClassNameToSmall(html) {
        debug(true, "FJCTPmodifyPoiTableClassNameToSmall");
        Array.prototype.forEach.call(html.querySelectorAll("table.poi-table-big"), function (element) {
            debug(false, "modifing class name of table from poi-table-big to poi-table-small");
            element.className = "poi-table-small";
        });
    }

    function FJCTPmodifyHeadlineAndGragTable(html, moveRoutenInfoToGragTable) {
        debug(true, "FJCTPmodifyHeadlineAndGragTable");
        // prepare divs
        //FJCTPmodifyPoiTableClassNameToSmall(html);

        // remove linebreaks in headers
        Array.prototype.forEach.call(html.querySelectorAll(/*"div.poi-section>*/"table.poi-table-small>tbody>tr>th"), function (element) {
            debug(false, "remove linebreaks in table headers");
            element.textContent = element.textContent.replace("- ", "").replace(": ", ":");
        });

        // move crag name and crag stars
        //<tr>
        //    <td colspan="2">
        //        <h2>WeiÃŸenstein 03 - Rechter Teil</h2>
        //        <img class="stars" src="/images/icons/sterne5.gif" alt="Sterne">
        //        <br>
        //        <br>
        //    </td>
        //</tr>
        var td = document.createElement("td");
        td.colSpan = "2";
        Array.prototype.forEach.call(html.querySelectorAll("div#breadcrumb-header>h2:nth-of-type(1)"), function (element) {
            debug(false, "moving crag name: " + element.textContent);
            element.parentElement.removeChild(element);
            td.appendChild(element);

            //// misuse crag name as anchor for backward link to overview page
            //var anchor = document.createElement("a");
            //anchor.onclick = window.history.back();
            ////anchor.href = "https://www.frankenjura.com/klettern/personal/login";
            //anchor.appendChild(element);
            //td.appendChild(anchor);
            
            // move stars to grag name
            var starsImage;
            Array.prototype.forEach.call(html.querySelectorAll("div#breadcrumb-container>ul~img"), function (element2) {
                //if (element.getAttribute("class").id.startsWith("stars")) {
                starsImage = element2;
                starsImage.parentElement.removeChild(starsImage);
                //}
            });
            if (starsImage != undefined) {
                debug(false, "moving crag stars: " + element.textContent);
                // misuse grag stars as anchor for login/logout
                //<a href="/klettern/personal/login">Anmelden</a>
                //<a href="/klettern/personal/logout">Logout</a>
                var anchor = document.createElement("a");
                anchor.href = "https://www.frankenjura.com/klettern/personal/login";
                anchor.target = "_blank";
                anchor.appendChild(starsImage);

                if (!moveRoutenInfoToGragTable) {
                    td.appendChild(anchor); //starsImage);
                    td.appendChild(document.createElement("br"));
                    td.appendChild(document.createElement("br"));
                } 
                else {
                //    element.innerHTML = element.innerHTML + "&nbsp;";
                //    element.appendChild(anchor); //starsImage);
                //    td.appendChild(document.createElement("br"));
                    td.appendChild(anchor); //starsImage);
                    td.appendChild(document.createElement("br"));
                }
            }
        });

        // tag first original table row
        Array.prototype.forEach.call(html.querySelectorAll(/*"div.poi-section>*/"table.poi-table-small>tbody>tr:nth-of-type(1)"), function (element) {
            debug(false, "inserting tr");
            var tr = document.createElement("tr");
            element.id = "first-original-row";
            tr.appendChild(td);
            element.parentElement.insertBefore(tr, element);
        });

        // add GPS position
        var gpsData = FJTCPreadGpsLocations(html);
        if (gpsData != null && gpsData.cragLatLon != null && gpsData.cragLatLon.length > 0) {
            Array.prototype.forEach.call(html.querySelectorAll( /*"div.poi-section>*/"table.poi-table-small>tbody>tr#first-original-row"), function(element) {
                var tr2 = document.createElement("tr");
                var th2 = document.createElement("th");
                var td2 = document.createElement("td");
                th2.textContent = "GPS:";
                //td2.textContent = gpsData.cragLatLon;
                var anchor = document.createElement("a");
                if (gpsData.parkingLatLon != null && gpsData.parkingLatLon.length > 0) {
                  anchor.href = "https://www.google.de/maps/dir/" + gpsData.parkingLatLon + "/" + gpsData.cragLatLon;
                } else {
                  anchor.href = "https://maps.google.de/maps?q=" + gpsData.cragLatLon;
                }
                anchor.target = "_blank";
                anchor.text = gpsData.cragLatLon;
                anchor.style.fontWeight = "normal";
                td2.appendChild(anchor);
                tr2.appendChild(th2);
                tr2.appendChild(td2);
                element.parentElement.insertBefore(tr2, element);
            });
        }

        // add Region and Gebiet
        //<ul id="breadcrumb">
        //    <li>Â»   <a href="/klettern/region/1">Frankenjura</a></li>
        //    <li>Â»  Region <a href="/klettern/region/5">SÃ¼dwest</a></li>
        //    <li>Â»  Gebiet <a href="/klettern/region/39">Stierberg, Leupoldstein und Betzenstein</a></li>
        //</ul>
        var region;
        var gebiet;
        Array.prototype.forEach.call(html.querySelectorAll("ul#breadcrumb>li>a"), function (element) {
            if (region == undefined && element.parentElement.textContent.indexOf("Region") >= 0) {
                region = element;
                region.style.fontWeight = "normal";
                region.target = "_blank";
            }
            if (gebiet == undefined && element.parentElement.textContent.indexOf("Gebiet") >= 0) {
                gebiet = element;
                gebiet.style.fontWeight = "normal";
                gebiet.target = "_blank";
            }
        });
        if (gebiet != undefined) {
            Array.prototype.forEach.call(html.querySelectorAll( /*"div.poi-section>*/"table.poi-table-small>tbody>tr#first-original-row"), function (element) {
                var tr2 = document.createElement("tr");
                var th2 = document.createElement("th");
                var td2 = document.createElement("td");
                th2.textContent = "Gebiet:";
                td2.appendChild(gebiet);
                tr2.appendChild(th2);
                tr2.appendChild(td2);
                element.parentElement.insertBefore(tr2, element);
            });
        }
        if (region != undefined) {
            Array.prototype.forEach.call(html.querySelectorAll( /*"div.poi-section>*/"table.poi-table-small>tbody>tr#first-original-row"), function (element) {
                var tr2 = document.createElement("tr");
                var th2 = document.createElement("th");
                var td2 = document.createElement("td");
                th2.textContent = "Region:";
                td2.appendChild(region);
                tr2.appendChild(th2);
                tr2.appendChild(td2);
                element.parentElement.insertBefore(tr2, element);
            });
        }

        if (moveRoutenInfoToGragTable) {
          // move Routeninformationen (Balkendiagramm) to table
          var routeInfoTable;
          Array.prototype.forEach.call(html.querySelectorAll("table#cssGraph:nth-of-type(1)"), function (element) {
              routeInfoTable = element;
          });
          //Array.prototype.forEach.call(html.querySelectorAll("table#cssGraph:nth-of-type(1)>tbody>tr:nth-of-type(1)"), function (element) {
          //    var firstChild = element.firstChild;
          //    debug(false, "FJCTPmodifyHeadlineAndGragTable - remove first " + firstChild + " from first row from RoutInfoTable");
          //    element.removeChild(firstChild);
          //});
          //Array.prototype.forEach.call(html.querySelectorAll("table#cssGraph:nth-of-type(1)>tbody>tr:nth-of-type(2)"), function (element) {
          //    var firstChild = element.firstChild;
          //    debug(false, "FJCTPmodifyHeadlineAndGragTable - remove first " + firstChild + " from second row from RoutInfoTable");
          //    element.removeChild(firstChild);
          //});
          Array.prototype.forEach.call(html.querySelectorAll("table#cssGraph:nth-of-type(1)>tbody>tr:nth-of-type(1)>td:nth-of-type(1)"), function (element) {
              debug(false, "FJCTPmodifyHeadlineAndGragTable - remove first td from first row from RoutInfoTable");
              element.parentElement.removeChild(element);
          });
          Array.prototype.forEach.call(html.querySelectorAll("table#cssGraph:nth-of-type(1)>tbody>tr:nth-of-type(2)>th:nth-of-type(1)"), function (element) {
              debug(false, "FJCTPmodifyHeadlineAndGragTable - remove first th from second row from RoutInfoTable");
              element.parentElement.removeChild(element);
          });
          Array.prototype.forEach.call(html.querySelectorAll("table#cssGraph:nth-of-type(1)>tbody>tr:nth-of-type(1)>td>span.bar"), function (element) {
              debug(false, "FJCTPmodifyHeadlineAndGragTable - modify height of RoutInfoTable bars");
              var height = NumberFromStyleValue(element.style.height);
              if (height > 1) {
                var newHeight = Math.floor((height - 1) / 2) + 1;
                element.style.height = newHeight + "px";
              }
          });
          if (routeInfoTable != undefined) {
              routeInfoTable.parentElement.removeChild(routeInfoTable);
              Array.prototype.forEach.call(html.querySelectorAll( /*"div.poi-section>*/"table.poi-table-small>tbody:nth-of-type(1)"), function (element) {
                  var br = document.createElement("br");
                  var tr = document.createElement("tr");
                  var td = document.createElement("td");
                  td.colSpan = "2";
                  td.appendChild(routeInfoTable);
                  td.appendChild(br);
                  tr.appendChild(td);
                  element.appendChild(tr);
              });
          }
        }
    }

    function FJCTPremoveGragHeadlineAndNavigationMenu(html) {
        debug(true, "FJCTPremoveGragHeadlineAndNavigationMenu");
        
        //// remove crag location navigation menu from header
        //Array.prototype.forEach.call(html.querySelectorAll("ul#breadcrumb"), function (element) {
        //    debug(false, "removing ul#breadcrumb");
        //    element.parentElement.removeChild(element);
        //});
        
        //// remove FrankenJura crag icon from Header
        //Array.prototype.forEach.call(html.querySelectorAll('img[src*="/images/pages/poi_crag.png"]'), function (element) {
        //    debug(false, "removing img: " + element.attributes.getNamedItem("src").value);
        //    element.parentElement.removeChild(element);
        //});
        
        // remove complete header
        Array.prototype.forEach.call(html.querySelectorAll("div#breadcrumb-container"), function (element) {
            debug(false, "removing ul#breadcrumb");
            element.parentElement.removeChild(element);
        });
    }

    function FJCTPreplaceFrankenJuraPremiumTopoImage(html) {
        debug(true, "FJCTPreplaceFrankenJuraPremiumTopoImage");
        // prepare divs
        //FJCTPmodifyPoiTableClassNameToSmall(html);

        //FROM:
        //<a href="/klettern/premium">
        //<img src="/images/content/topo_premium.png" alt="Premium. Kompletter Topo benÃ¶tigt einen Premium Account" style="margin: 0">
        //</a>
        //<img src="/images/php/topo_db?s=467" alt="Topo" class="border" id="topo_image">
        //
        //TO:
        //<img src="https://www.frankenjura.com/images/php/topo_print_db.php?s=385" alt="Topo" class="border" id="topo_image">

        Array.prototype.forEach.call(html.querySelectorAll('a[href*="/klettern/premium"]'), function (element) {
            debug(false, "removing a: " + element.attributes.getNamedItem("href").value);
            element.parentElement.removeChild(element);
        });
        Array.prototype.forEach.call(html.querySelectorAll('img[src*="/images/php/topo_db"]'), function (element) {
            debug(false, "removing img: " + element.attributes.getNamedItem("src").value);
            element.parentElement.removeChild(element);
        });
        Array.prototype.forEach.call(html.querySelectorAll("div.image-vertical"), function (element) {
            debug(false, "removing div.image-vertical");
            element.parentElement.removeChild(element);
        });
        Array.prototype.forEach.call(html.querySelectorAll("div.image-horizontal"), function (element) {
            debug(false, "removing div.image-vertical");
            element.parentElement.removeChild(element);
        });

        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>h4+p"), function (element) {
            if (element.previousElementSibling.textContent == "Beschreibung") {
                if (element.textContent.length > 0 && element.textContent.indexOf("Foto") >= 0) {
                    debug(false, "removing Beschreibung: " + element.textContent);
                    element.parentElement.removeChild(element.previousElementSibling);
                    element.parentElement.removeChild(element);
                } 
            }
        });

        var poiId = FJCTPreadPoiId(html);
        var poiSrc = "https://www.frankenjura.com/images/php/topo_print_db.php?s=" + poiId;

        var img = document.createElement("img");
        img.src = poiSrc;
        img.alt = "Topo " + poiId;
        img.style.margin = "0";
        //Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>table.poi-table-small"), function(element) {
        Array.prototype.forEach.call(html.querySelectorAll("table.poi-table-small"), function(element) {
            debug(false, "adding div.image-vertical>img behind table.poi-table-small");
            element.parentElement.appendChild(img);
            // adapt floating and width:
            element.style.float = "left";
            element.style.width = "439px";
            //img.style.float = "right";
            img.style.width = "550px";
            img.style.maxWidth = "580px";  //table with + maxWith of TopImage must not exceed 1200px
        });
    }

    function FJCTPtrimText(text) {
        text = text.trim();
        while (text.length >= 6 && text.substring(text.length - 6) == "&nbsp;") {
            text = text.substring(0, text.length - 6);
        }
        text = text.trim();
        while (text.length >= 6 && text.substring(0, 5) == "&nbsp;") {
            text = text.substring(6);
        }
        text = text.trim();
        return text;
    }

    function FJTCPcleanTextContent(text) {
        while (text.indexOf("\r\n") >= 0) {
            text = text.replace("\r\n", " ");
        }
        while (text.indexOf("\r") >= 0) {
            text = text.replace("\r", " ");
        }
        while (text.indexOf("\n") >= 0) {
            text = text.replace("\n", " ");
        }
        while (text.indexOf("  ") >= 0) {
            text = text.replace("  ", " ");
        }
        //Ã¤ -> ä -> &auml;
        //Ã¶ -> ö -> &ouml;
        //Ã¼ -> ü -> &uuml;
        //Ã? -> ß -> &szlig;
        while (text.indexOf("Ã¤") >= 0) {
            text = text.replace("Ã¤", "&auml;");
        }
        while (text.indexOf("Ã¶") >= 0) {
            text = text.replace("Ã¶", "&ouml;");
        }
        while (text.indexOf("Ã¼") >= 0) {
            text = text.replace("Ã¼", "&uuml;");
        }
        while (text.indexOf("Ã?") >= 0) {
            text = text.replace("Ã?", "&szlig;");
        }
        return text;
    }

    function FJCTPmodifyRouteDescriptionElement(element, firstAscenter, routeDescription) {
        debug(true, "FJCTPmodifyRouteDescriptionElement");
        //BEFORE:
        //<li>
        //  <a href="/klettern/poi/4834">MaRo (Marlies-Rolf )</a> 7+&nbsp;
        //  <img src="/images/icons/beschreibung_liste.gif" alt="Beschreibung vorhanden">
        //</li>
        //...
        //
        //BEFORE (with hit info):
        //<li>
        //  <a href="/klettern/poi/4847" class="blue">Vertigo</a> 7&nbsp;
        //  <img src="/images/icons/beschreibung_liste.gif" alt="Beschreibung vorhanden">
        //  <br>
        //  <span>Toprope, 10.05.16</span>
        //</li>
        //...
        //
        //AFTER:
        //<li style="padding: 0px 0px 6px;">
        //  <span style="border-radius: 50%; padding: 2px 5px; border: 1px solid; text-align: center;">2</span> &nbsp;
        //  <a href="/klettern/poi/5293" id="DONE">Schartenrinne</a>
        //  <a href="/klettern/personal/hitliste/eintragen/5293">&nbsp; 2 &nbsp;&nbsp;&nbsp;&nbsp;</a>
        //  <span>(unbekannt etwa 1908)</span>
        //  <br>
        //  In der blockigen Rinne rechts der kleinen Pfeilerwand z. A. Wurde ebenfalls als Abstiegsweg genutzt.
        //</li>
        //
        //AFTER (with hit info):
        //<li style="padding: 0px 0px 6px;">
        //  <span style="border-radius: 50%; padding: 2px 5px; border: 1px solid; text-align: center;">4</span> &nbsp;
        //  <a href="/klettern/poi/5295" class="" id="DONE">LangschlÃ¤ferin</a>
        //  <a href="/klettern/personal/hitliste/eintragen/5295">&nbsp; 7- &nbsp;&nbsp;&nbsp;&nbsp;</a>
        //  <span>(unbekannt vor 1995 | Rotpunkt 17.04.18)</span>
        //  <br>
        //  Ãœber Platte und an kleinem Ãœberhang vorbei zu Band. Dann Ã¼ber abdrÃ¤ngendes WÃ¤ndchen z. UH. Etws eingezwÃ¤ngte RoutenfÃ¼hrung.
        //</li>

        var oldtext = element.parentElement.innerHTML;

        // 1) split oldText into routeName, routeDifficulty and routeHitData:
        oldtext = oldtext.replace("<br>", " ");
        // 1a) extract routeHitData
        var idx = oldtext.indexOf("<span>");
        var routeHitData = (idx >= 0) ? oldtext.substring(idx + "<span>".length) : "";
        oldtext = (idx >= 0) ? oldtext.substring(0, idx) : oldtext;
        idx = routeHitData.indexOf("</span>");
        routeHitData = (idx >= 0) ? routeHitData.substring(0, idx) : routeHitData;
        // 1b) extract routeName and routeDifficulty
        idx = oldtext.indexOf("</a>");
        var routeName = (idx >= 0) ? oldtext.substring(0, idx + "</a>".length) : "";
        var routeDifficulty = (idx >= 0) ? oldtext.substring(idx + "</a>".length) : oldtext;
        // 1c) clean routeName, routeDifficulty and routeHitData:
        routeHitData = routeHitData.replace(", ", " ");
        routeHitData = FJCTPtrimText(routeHitData);
        routeName = FJCTPtrimText(routeName);
        routeDifficulty = FJCTPtrimText(routeDifficulty);

        // 2) prepare FirstAscenterData
        firstAscenter = (firstAscenter == undefined) ? "" : firstAscenter;
        if (firstAscenter.length > 0) {
            firstAscenter = firstAscenter.replace("(", "");
            firstAscenter = firstAscenter.replace(")", "");
            firstAscenter = firstAscenter.trim();
        }

        // 3) build ascentInfo
        var ascentInfo = "";
        if (firstAscenter.length > 0 && routeHitData.length > 0) {
            ascentInfo = "(" + firstAscenter + " | " + routeHitData + ")";
        } else if (firstAscenter.length > 0) {
            ascentInfo = "(" + firstAscenter + ")";
        } else if (routeHitData.length > 0) {
            ascentInfo = "(" + routeHitData + ")";
        }

        // 4) prepare routeDifficulty
        //<a href="/klettern/personal/hitliste/eintragen/14571">&nbsp; 6&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</a>
        // 4a) extract poi from routeName
        var poiIdx = routeName.indexOf("poi/");
        var poi = (poiIdx >= 0) ? routeName.substring(poiIdx + "poi/".length) : "";
        idx = poi.indexOf("\"");
        poi = (idx >= 0) ? poi.substring(0, idx) : poi;
        // 4b) build routeDifficulty
        routeDifficulty = (poi.length > 0)
            ? "<a target=\"_blank\" href=\"/klettern/personal/hitliste/eintragen/" + poi + "\">&nbsp; " + routeDifficulty + " &nbsp;&nbsp;&nbsp;&nbsp;</a>"
            : "&nbsp; " + routeDifficulty + " &nbsp;&nbsp;&nbsp;&nbsp;";

        // 5) add target to routeName anchor
        idx = routeName.indexOf("href=");
        if (idx > 0) {
          var oldRouteName = routeName;
          routeName = oldRouteName.substring(0, idx) + "target=\"_blank\" " + oldRouteName.substring(idx);
        }

        // 6) concatenate elements
        debug(false, poi + " - " + routeName + " - " + routeDifficulty + " - " + routeHitData + " - " + ascentInfo);
        var newtext = (ascentInfo.length > 0) 
            ? routeName + routeDifficulty + "<span>" + ascentInfo + "</span><br>" + routeDescription
            : routeName + routeDifficulty + "<br>" + routeDescription;

        element.parentElement.innerHTML = newtext;
    }

    //function FJCTPmodifyRouteDescriptionsSync(html, callback) {
    //    debug(true, "FJCTPmodifyRouteDescriptionsSync");
    //    FJCTPmodifyRouteDescriptionsPreHook(html);
    //
    //    var xmlhttp;
    //    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
    //        xmlhttp = new XMLHttpRequest();
    //    }
    //    else {// code for IE6, IE5
    //        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    //    }
    //
    //    var receivedDataElement = document.createElement("DIV");
    //
    //    Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li>a:nth-of-type(1)"), function (element) {
    //        var href = element.attributes.getNamedItem("href").value;
    //        if (href.length > 0) {
    //            debug(false, href);
    //
    //            xmlhttp.open("GET", href, /*asynchronous*/false);
    //            xmlhttp.send();
    //
    //            element.attributes.getNamedItem("href").value = "";
    //
    //            receivedDataElement.innerHTML = xmlhttp.responseText;
    //            var firstAscenter = FJCTPreadRouteFirstAscenter(receivedDataElement);
    //            var routeDescription = FJCTPreadRouteDescription(receivedDataElement);
    //
    //            FJCTPmodifyRouteDescriptionElement(element, firstAscenter, routeDescription);
    //        }
    //    });
    //
    //    FJCTPmodifyRouteDescriptionsPostHook(html, callback);
    //}

    function FJCTPmodifyRouteDescriptionsAsync(html, callback) {
        debug(true, "FJCTPmodifyRouteDescriptionsAsync");
        FJCTPmodifyRouteDescriptionsPreHook(html);

        var xmlhttp;
        if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp = new XMLHttpRequest();
        }
        else {// code for IE6, IE5
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }

        var receivedDataElement = document.createElement("DIV");

        var keyInsert = "INSERT";
        var keyDone = "DONE";

        var allCount = 0;
        var firstHref;
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li>a:nth-of-type(1)"), function (element) {
            if (element.id != keyInsert && element.id != keyDone) {
                var href = element.attributes.getNamedItem("href").value;
                if (href.length > 0) {
                    allCount++;
                    if (firstHref == undefined) {
                        firstHref = href;
                    }
                    //debug(false, href);
                }
            }
        });

        //verbose = true;
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

                var pagehtml = xmlhttp.responseText; //.responseText; .response; .responseXML; .responseBody;
                if (pagehtml != null) {

                    var doneCount = 0;
                    var nextAsyncDownloadAlreadyStarted = false;
                    Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li>a:nth-of-type(1)"), function (element) {
                        var href = element.attributes.getNamedItem("href").value;
                        var isValid = href.length > 0;
                        var isInsert = isValid && (element.id == keyInsert);
                        var isDone = isValid && (element.id == keyDone);
                        debug(false, "RouteDescription isValid: " + isValid + "  isInsert: " + isInsert + "  isDone: " + isDone + "  href: " + href);

                        if (isInsert) {
                            // insert details:
                            element.id = keyDone;
                            doneCount++;
                            debug(false, "RouteDescription inserting data of href: " + href);

                            // processing
                            receivedDataElement.innerHTML = pagehtml;
                            var firstAscenter = FJCTPreadRouteFirstAscenter(receivedDataElement);
                            var routeDescription = FJCTPreadRouteDescription(receivedDataElement);

                            FJCTPmodifyRouteDescriptionElement(element, firstAscenter, routeDescription);
                        }
                        else if (isValid && !isDone && !nextAsyncDownloadAlreadyStarted) {
                            // start async downloaad of details of next unprocessed route list entry:
                            nextAsyncDownloadAlreadyStarted = true;
                            element.id = keyInsert;
                            debug(false, "RouteDescription downloading href: " + href);

                            //xmlhttp.responseType = "document";
                            xmlhttp.open("GET", href, /*asynchronous*/true);
                            xmlhttp.send();
                        }
                        else if (isDone) {
                            doneCount++;
                        }
                    });

                    if (doneCount == allCount) {
                        debug(true, "RouteDescription all async downloads done -> final prrocessing");

                        FJCTPmodifyRouteDescriptionsPostHook(html, callback);
                    }
                }
                else {
                    debug(true, "error in received data for url='" + href + "'");
                }
            }
        }

        // start async downloaad of details for first (naturally unprocessed) route list entry:
        if (allCount > 0 && firstHref != undefined) {
            //xmlhttp.responseType = "document";
            xmlhttp.open("GET", firstHref, /*asynchronous*/true);
            xmlhttp.send();
        }
        else {
            FJCTPmodifyRouteDescriptionsPostHook(html, callback);
        }
    }

    function FJCTPmodifyRouteDescriptionsPreHook(html) {
        debug(true, "FJCTPmodifyRouteDescriptionsPreHook");
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li>a:nth-of-type(1)"), function (element) {
            if (element.className == "blue") {
                element.className = "";
            }
        });

        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list"), function (element) {
            element.style.listStyleType = "none";
        });

        var num = 0;
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li"), function (element) {
            num++;
            //border-radius: 50%; width: 12px; height: 12px; padding: 2px; border: 1px solid; text-align: center;
            //border-radius: 50%; padding: 2px 5px; border: 1px solid; text-align: center;
            if (num > 9)
                element.innerHTML = "<span style=\"border-radius: 50%; padding: 2px 3px; border: 1px solid; text-align: center;\">" + num + "</span> &nbsp;" + FJCTPtrimText(element.innerHTML);
            else
                element.innerHTML = "<span style=\"border-radius: 50%; padding: 2px 5px; border: 1px solid; text-align: center;\">" + num + "</span> &nbsp;" + FJCTPtrimText(element.innerHTML);
        });
    }

    function FJCTPmodifyRouteDescriptionsPostHook(html, callback) {
        debug(true, "FJCTPmodifyRouteDescriptionsPostHook");
        callback();
    }

    function FJCTPmodifyRouteDescriptions(html, callback) {
        debug(true, "FJCTPmodifyRouteDescriptions");
        // kickout "Routennamen sind anklickbar"
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>h4+p"), function (element) {
            if (element.previousElementSibling.textContent == "Routen") {
                debug(false, element.textContent);
                if (element.textContent.length > 0 && element.textContent.indexOf("Routennamen sind anklickbar") >= 0) {
                    element.parentElement.removeChild(element);
                }
            }
        });

        // kickout route info images (! or eye)
        Array.prototype.forEach.call(html.querySelectorAll("ol.route-list>li>img"), function (element) {
            debug(false, "removing a: " + element.attributes.getNamedItem("src").value);
            element.parentElement.removeChild(element);
        });

        FJCTPmodifyRouteDescriptionsAsync(html, callback);
        //FJCTPmodifyRouteDescriptionsSync(html, callback);
    }

    function FJCTPreadRouteFirstAscenter(html) {
        debug(true, "FJCTPreadRouteFirstAscenter");
        var firstAscenter = "";
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>table>tbody>tr>th+td"), function (element) {
            if (element.previousElementSibling.textContent == "Erstbegehung:") { 
                var text = FJTCPcleanTextContent(element.textContent);
                if (text.length > 0) {
                    debug(false, text);
                    firstAscenter = text;
                }
            }
        });
        return firstAscenter;
   }

    function FJCTPreadRouteDescription(html) {
        debug(true, "FJCTPreadRouteDescription");
        var routeDescription = "";
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>h4+p"), function (element) {
            if (element.previousElementSibling.textContent == "Beschreibung") {
                var text = FJTCPcleanTextContent(element.textContent);
                if (text.length > 0) {
                    debug(false, text);
                    routeDescription = text;
                }
            }
            if (element.previousElementSibling.textContent == "Anmerkungen") {
                var text = FJTCPcleanTextContent(element.textContent);
                if (text.length > 0) {
                    debug(false, text);
                    if (routeDescription.length > 0) {
                        routeDescription = routeDescription + " ";
                    }
                    routeDescription = routeDescription + text;
                }
            }
        });
        if (routeDescription.length < 1) {
          var firstComment = html.querySelector("div.poi-comment>h5+p:first-of-type");
          if (firstComment != null) {
              var text = FJTCPcleanTextContent(firstComment.textContent);
              if (text.length > 0) {
                  debug(false, text);
                  if (routeDescription.length > 0) {
                      routeDescription = routeDescription + " ";
                  }
                  routeDescription = routeDescription + text;
              }
          }
        }
        return routeDescription;
    }

    function FJCTPreadPoiId(html) {
        debug(true, "FJCTPreadPoiId");
        //<ul id="poi-menu">
        //    <li>    <a href="/klettern/premium" target="_blank">
        //            <img src="/images/menu/print-premium.png" border="0" alt="Druckausgabe nur bei Premium" title="Druckausgabe  nur bei Premium" align="absmiddle"><br>
        //            Drucken
        //        </a>
        //        </li>
        //    <li>
        //        <a href="/klettern/senden/448">
        //            <img src="/images/menu/send.png" alt="Felsen versenden" title="Felsen versenden"><br>
        //            Felsen versenden
        //        </a>
        //    </li>
        //    <li>
        //        <a href="/klettern/vorschlag/felsBearbeiten/448">
        //...
        var poi;
        var poiKey = "/felsBearbeiten/"
        Array.prototype.forEach.call(html.querySelectorAll("ul#poi-menu>li>a"), function (element) {
            debug(false, "inspecting poi-menu: " + element.href);
            if (poi == undefined) {
                var href = element.href;
                var idx = href.indexOf(poiKey);
                if (idx >= 0) {
                    var poiStr = href.substring(idx + poiKey.length);
                    poi = parseInt(poiStr);
                }
            }
        });

        if (poi == undefined) {
            //<div class="box" id="box-current-topo">
            //  <a href="/klettern/poi/1290"><h3 style="margin-bottom: 8px;">JubilÃ¤umswand 02 - Rechter Teil</h3></a>
            //...
            var poiKey = "/klettern/poi/"
            Array.prototype.forEach.call(html.querySelectorAll('a[href*="' + poiKey + '"]'), function (element) {
                debug(false, "inspecting poi-anchor: " + element.href);
                if (poi == undefined) {
                    var href = element.href;
                    var idx = href.indexOf(poiKey);
                    if (idx >= 0) {
                        var poiStr = href.substring(idx + poiKey.length);
                        poi = parseInt(poiStr);
                    }
                }
            });
        }
        debug(false, "FJCTPreadPoiId -> " + poi);
        return poi;
    }

    function FJCTPadaptElementStyles(html) {
        debug(true, "FJCTPadaptElementStyles");
        // prepare divs
        //FJCTPmodifyPoiTableClassNameToSmall(html);

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

    function FJCTPmodifyRockEventsSection(html) {
        debug(true, "FJCTPmodifyRockEventsSection");
        
        var rockEventSection = FJCTPgetPoiSectionNode(html, "Rock-Events");
        if (rockEventSection == undefined) {
          debug(true, "FJCTPmodifyRockEventsSection -> section 'Rock-Events' not found");
          return;
        }

        debug(false, "FJCTPmodifyRockEventsSection -> start with modifications of section 'Rock-Events'");
        var allChilds = getChildTreeAsNodeList(rockEventSection);
        //debug(false, "FJCTPmodifyRockEventsSection getChildTreeAsNodeList.length: " + allChilds.length);

        for (var child of allChilds) {
          //debug(false, "FJCTPmodifyRockEventsSection -> tagName='" + child.tagName + "' id='" + child.id + "'" + "' className='" + child.className + "' textContent='" + child.textContent.substr(0,10) + "'");
          if (child.textContent.startsWith("FÃ¼r diesen Fels gibt es derzeit kein Rock-Event")) {
            debug(false, "FJCTPmodifyRockEventsSection --> removing empty RockEvent section");
            rockEventSection.parentElement.removeChild(rockEventSection);
            return;
          }
          if (child.textContent.startsWith("FÃ¼r diese Route gibt es derzeit kein Rock-Event.")) {
            debug(false, "FJCTPmodifyRockEventsSection --> removing empty RockEvent section");
            rockEventSection.parentElement.removeChild(rockEventSection);
            return;
          }
          if (child.tagName == "P" && child.id == "send-rock-event") {
            debug(false, "FJCTPmodifyRockEventsSection --> removing P(id='send-rock-event')");
            child.parentElement.removeChild(child);
          }
          if (child.tagName == "IMG" && child.id == "rock-event") {
            debug(false, "FJCTPmodifyRockEventsSection --> removing IMG(id='rock-event')");
            child.parentElement.removeChild(child);
          }
          if (child.tagName == "IMG" && child.alt == "Rock Event") {
            debug(false, "FJCTPmodifyRockEventsSection --> removing IMG(alt='Rock Event')");
            child.parentElement.removeChild(child);
          }
        }
        
        debug(false, "FJCTPmodifyRockEventsSection -> continue with jquery modifications");
        //Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>div.reverse-row-order>div.column"), function (element) {
        //  var section = element.parentElement.parentElement;
        //  if (rockEventSection == section) {
        //    Array.prototype.forEach.call(element.children, function (child) {
        //      if (child.textContent.startsWith("FÃ¼r diesen Fels gibt es derzeit kein Rock-Event")) {
        //        debug(false, "FJCTPmodifyRockEventsSection -> removing empty RockEvent section");
        //        rockEventSection.parentElement.removeChild(rockEventSection);
        //        return;
        //      }
        //    });
        //  }
        //});
        //FJCTPremoveElement(html, "div.poi-section>p#send-rock-event");      //Rock-Event melden
        //FJCTPremoveElement(html, "div.poi-section>img#rock-event");         //Rock-Event icon
        //FJCTPremoveElement(html, "div.poi-section>ul>li>br:last-of-type");  //tailing br in Rock-Event
        //FJCTPremoveElement(html, "div.poi-section>ul>li>br:last-of-type");  //tailing br in Rock-Event
        //Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>div.reverse-row-order>div.column>img"), function (element) {
        //  var section = element.parentElement.parentElement.parentElement;
        //  if (rockEventSection == section) {
        //    if (element.alt == "Rock Event") {
        //      debug(false, "FJCTPmodifyRockEventsSection -> removing RockEvent icon");
        //      element.parentElement.removeChild(element); 
        //    }
        //  }
        //});
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>div.columns>div.column>ul.rock-event-list"), function (element) {
          var section = element.parentElement.parentElement.parentElement;
          if (rockEventSection == section) {
            debug(false, "FJCTPmodifyRockEventsSection -> reformating Rock-Events section (1)");
            //Array.prototype.forEach.call(element.children, function (child) {
            //  rockEventSection.appendChild(child);
            //});
            rockEventSection.appendChild(element);
          }
        });
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section>div.columns"), function (element) {
          var section = element.parentElement;
          if (rockEventSection == section) {
            debug(false, "FJCTPmodifyRockEventsSection -> reformating Rock-Events section (2)");
            rockEventSection.removeChild(element);
          }
        });
        if (rockEventSection.childNodes.length == 1 && rockEventSection.firstChild.textContent == "Rock-Events") {
          debug(false, "FJCTPmodifyRockEventsSection --> removing empty RockEvent section");
          rockEventSection.parentElement.removeChild(rockEventSection);
        }
        FJCTPremoveElement(html, "div.poi-section>ul>li>br:last-of-type");  //tailing br in Rock-Event
        //FJCTPremoveElement(html, "div.poi-section>ul>li>br:last-of-type");  //tailing br in Rock-Event
    }

    function FJCTPcleanListEntries(html) {
        debug(true, "FJCTPcleanListEntries -> removing free content icons and changing link targéts");
        var allChilds = getChildTreeAsNodeList(html);
        debug(false, "FJCTPcleanListEntries getChildTreeAsNodeList.length: " + allChilds.length);
        for (var child of allChilds) {
          if (child.tagName == "IMG" && (child.alt == "Freier Inhalt" || child.src.endsWith("/free.png"))) {
            debug(false, "FJCTPcleanListEntries --> removing IMG(alt='Freier Inhalt')");
            child.parentElement.removeChild(child);
          }
          if (child.tagName == "IMG" && (child.alt == "Neu" || child.src.endsWith("/neu_liste.gif"))) {
            debug(false, "FJCTPcleanListEntries --> removing IMG(alt='Freier Inhalt')");
            child.parentElement.removeChild(child);
          }
          if (child.tagName == "A" && child.href.indexOf("/poi/") > 0) {
            debug(false, "FJCTPcleanListEntries --> modify poi url target)");
            child.target = "_blank";
          }
        }
    }

    //----------------------------------------------------------------------------------------------------
    // START of POI section handling stuff ...

    function FJCTPgetPoiSectionId(element) {
        debug(false, "FJCTPgetPoiSectionId");
        var sectionIsEmpty = element.childNodes.length < 1;
        //if (sectionIsEmpty) {
        //  debug(false, "FJCTPgetPoiSectionId -> element.childNodes.length < 1");
        //  sectionIsEmpty = (element.firstElementChild == undefined) ? true : false;
        //}
        //if (sectionIsEmpty) {
        //  debug(false, "FJCTPgetPoiSectionId -> element.firstElementChild == undefined");
        //  sectionIsEmpty = element.innerHTML.trim().length < 1;
        //}
        //if (sectionIsEmpty) {
        //  debug(false, "FJCTPgetPoiSectionId -> element.innerHTML.trim().length < 1");
        //}
        if (sectionIsEmpty) {
          debug(false, "FJCTPgetPoiSectionId -> element is empty");
          return "sectionIsEmpty";
        }
        var sectionId = "unknown";
        if (!sectionIsEmpty) {
          if (element.firstElementChild != null) {
            var firstElementTagName = element.firstElementChild.tagName;
            if (firstElementTagName.startsWith("H")) {
              sectionId = element.firstElementChild.textContent;
            }
            else if (firstElementTagName == "TABLE") {
              sectionId = element.firstElementChild.className;
            }
            else if (firstElementTagName == "DIV") {
              sectionId = element.firstElementChild.id;
            }
          }
          if (sectionId.length < 1) {
            sectionId = element.firstElementChild.textContent.substr(0,20);
          }
        }
        return sectionId;
    }

    function FJCTPgetPoiSectionNode(html, sectionId) {
        debug(true, "FJCTPgetPoiSectionNode '" + sectionId + "'");
        var section; 
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section"), function (element) {
          if (FJCTPgetPoiSectionId(element) == sectionId) {
            debug(false, "FJCTPgetPoiSectionNode -> found section");
            section = element;
          }
        });
        return section;
    }

    function FJCTPlistPoiSections(html) {
        debug(true, "FJCTPlistPoiSections");
        var num = 1;
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section"), function (element) {
          debug(true, "FJCTPlistPoiSections -> section " + num + " '" + FJCTPgetPoiSectionId(element) + "'");
          num++;
        });
    }

    function FJCTPremovePoiSection(html, sectionId) {
        debug(true, "FJCTPremovePoiSections -> removing section: " + sectionId);
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section"), function (element) {
          if (FJCTPgetPoiSectionId(element) == sectionId) {
            debug(true, "FJCTPremovePoiSections -> section removed");
            element.parentElement.removeChild(element);
          }
        });
    }

    function FJCTPmovePoiSectionToEnd(html, sectionId) {
        debug(true, "FJCTPmovePoiSectionToEnd -> moving section: " + sectionId);
        Array.prototype.forEach.call(html.querySelectorAll("div.poi-section"), function (element) {
          if (FJCTPgetPoiSectionId(element) == sectionId) {
            debug(true, "FJCTPremovePoiSections -> section removed");
            var parent = element.parentElement;
            parent.removeChild(element);

            element.style.pageBreakBefore = "always";
            element.style.pageBreakAfter = "always";
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.insertBefore(document.createElement("br"), element.childNodes[0]);
            element.style.marginBottom = "100px";
            parent.appendChild(element);
            /* var div = document.createElement("div");
            div.style.pageBreakBefore = "always";
            div.style.pageBreakAfter = "always";
            //div.style.marginTop = "100px";
            div.appendChild(document.createElement("br"));
            div.appendChild(document.createElement("br"));
            div.appendChild(document.createElement("br"));
            div.appendChild(document.createElement("br"));
            div.appendChild(element);
            div.style.marginBottom = "100px";
            parent.appendChild(div); */
          }
        });
    }

    //----------------------------------------------------------------------------------------------------
    // START of Google TILE MAP handling ...

    function FJTCPgoogleMapsTileCoordsToLonDegree(zoom, xtile, ytile) {
        debug(false, "FJTCPgoogleMapsTileCoordsToLonDegree");
        //tileproxy.php
        //http://www.drweb.de/magazin/tipps-tricks-mit-openstreetmap/      

        //OSM tiles server
        //http://wiki.openstreetmap.org/wiki/Tiles

        //coordinates <> OSM tiles
        //http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Lon..2Flat._to_tile_numbers
        //
        //Tile numbers to lon./lat.
        //n = 2 ^ zoom
        //lon_deg = xtile / n * 360.0 - 180.0
        //lat_rad = arctan(sinh(Ï€ * (1 - 2 * ytile / n)))
        //lat_deg = lat_rad * 180.0 / Ï€

        if (zoom == undefined || xtile == undefined || ytile == undefined) {
            return undefined;
        }

        var n = Math.pow(2, zoom);
        var lon_deg = xtile / n * 360.0 - 180.0;
        //var lat_rad = Math.atan(MathSinh(Math.PI * (1 - 2 * ytile / n)));
        //var lat_deg = lat_rad * 180.0 / Math.PI;
        return lon_deg;
    }

    function FJTCPgoogleMapsTileCoordsToLatDegree(zoom, xtile, ytile) {
        debug(false, "FJTCPgoogleMapsTileCoordsToLatDegree");
        if (zoom == undefined || xtile == undefined || ytile == undefined) {
            return undefined;
        }
        var n = Math.pow(2, zoom);
        //var lon_deg = xtile / n * 360.0 - 180.0;
        var lat_rad = Math.atan(MathSinh(Math.PI * (1 - 2 * ytile / n)));
        var lat_deg = lat_rad * 180.0 / Math.PI;
        return lat_deg;
    }

    function MathSinh(x) {
        return (Math.exp(x) - Math.exp(x * -1)) / 2;
    }

    function NumberFromStyleValue(styleValue) {
        if (styleValue == undefined) {
            return undefined;
        }
        var idx = styleValue.indexOf("%");
        if (idx > 0) {
            return parseFloat(styleValue.substring(0, idx));
        }
        var idx = styleValue.indexOf("px");
        if (idx > 0) {
            return parseFloat(styleValue.substring(0, idx));
        }
        return undefined;
    }
        
    function FJTCPreadGpsLocationFromCenterOfMapTiles(html) {
        debug(true, "FJTCPreadGpsLocationFromCenterOfMapTiles");
        //tileproxy.php
        //http://www.drweb.de/magazin/tipps-tricks-mit-openstreetmap/      

        //OSM tiles server
        //http://wiki.openstreetmap.org/wiki/Tiles

        //coordinates <> OSM tiles
        //http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Lon..2Flat._to_tile_numbers
        //
        //Tile numbers to lon./lat.
        //n = 2 ^ zoom
        //lon_deg = xtile / n * 360.0 - 180.0
        //lat_rad = arctan(sinh(Ï€ * (1 - 2 * ytile / n)))
        //lat_deg = lat_rad * 180.0 / Ï€

        //WeiÃŸenstein: 
        // https://www.frankenjura.com/klettern/poi/992
        //
        // after page load:
        //   <div id="map" style="width: 570px; height: 240px;" class="olMap">
        //     <div id="OpenLayers.Map_4_OpenLayers_ViewPort" class="olMapViewport olControlDragPanActive olControlZoomBoxActive olControlPinchZoomActive olControlNavigationActive" style="position: relative; overflow: hidden; width: 100%; height: 100%;">
        //       <div id="OpenLayers.Map_4_OpenLayers_Container" style="position: absolute; width: 100px; height: 100px; z-index: 749; left: 0px; top: 0px;">
        //         <div id="OpenLayers.Layer.OSM_15" dir="ltr" class="olLayerDiv olLayerGrid" style="position: absolute; width: 100%; height: 100%; z-index: 100; left: 0%; top: 0%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4358/2791.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: 182%; top: 78%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4358/2790.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: 182%; top: -178%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4357/2791.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: -74%; top: 78%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4357/2790.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: -74%; top: -178%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4359/2791.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: 438%; top: 78%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4359/2790.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: 438%; top: -178%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4360/2791.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: 694%; top: 78%; width: 256%; height: 256%;">
        //           <img class="olTileImage" src="/osm/tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4360/2790.png" crossorigin="anonymous" style="visibility: inherit; opacity: 1; position: absolute; left: 694%; top: -178%; width: 256%; height: 256%;">
        //         </div>
        //         <div id="OpenLayers.Layer.Markers_25" dir="ltr" class="olLayerDiv" style="position: absolute; width: 100%; height: 100%; z-index: 330;">
        //           <div id="OL_Icon_27" style="position: absolute; width: 21px; height: 26px; left: 274.5px; top: 94px;">
        //             <img id="OL_Icon_27_innerImage" class="olAlphaImg" src="/images/poi/poi_crag.png" style="position: relative; width: 21px; height: 26px;">
        //           </div>
        //         </div>
        //       </div>
        //     </div>
        //   </div>
        // -> https://www.frankenjura.com/osm/tileproxy.php?layer=OSM_MAPNIK&path=13/4358/2791.png
        // -> zoom = 13
        // -> xtile = 4358
        // -> ytile = 2791
        // -> calculated: 49.639177, 11.513672
        //          real: 49.634616, 11.531333

        var cragLeft;
        var cragTop;
        var cragWidth;
        var cragHeight;
        Array.prototype.forEach.call(html.querySelectorAll("img.olAlphaImg"), function (element) {
            cragLeft = NumberFromStyleValue(element.parentElement.style.left);
            cragTop = NumberFromStyleValue(element.parentElement.style.top);
            cragWidth = NumberFromStyleValue(element.parentElement.style.width);
            cragHeight = NumberFromStyleValue(element.parentElement.style.height);
        });
        if (cragLeft == undefined || cragTop == undefined) {
            //return null;
            return {longitude: null, latitude: null};
        }

        var lon;
        var lat;
        Array.prototype.forEach.call(html.querySelectorAll("img.olTileImage:nth-of-type(1)"), function (element) {
            var firstTileLeft = NumberFromStyleValue(element.style.left);
            var firstTileTop = NumberFromStyleValue(element.style.top);
            var firstTileWidth = NumberFromStyleValue(element.style.width);
            var firstTileHeight = NumberFromStyleValue(element.style.height);

            var imgSrc = element.src;
            // ...tileproxy.php?layer=OSM_MAPNIK&amp;path=13/4358/2791.png

            var tileCoords = imgSrc.substring(imgSrc.indexOf("path") + 5);
            var tileCoords = tileCoords.substring(0, tileCoords.indexOf("."/*".png"*/));
            // 13/4358/2791
            debug(false, "imgSrc: " + imgSrc);
            debug(false, "tileCoords: " + tileCoords);

            var zoomString = tileCoords.substring(0, tileCoords.indexOf("/"));
            tileCoords = tileCoords.substring(zoomString.length + 1);
            var tileXString = tileCoords.substring(0, tileCoords.indexOf("/"));
            tileCoords = tileCoords.substring(tileXString.length + 1);
            var tileYString = tileCoords; //tileCoords.substring(0, tileCoords.indexOf("."));
            var firstTileZoom = parseFloat(zoomString);
            var firstTileX = parseFloat(tileXString);
            var firstTileY = parseFloat(tileYString);

            var rightTileX = firstTileX + 1;
            var bottomTileY = firstTileY + 1;

            var firstTileLon = FJTCPgoogleMapsTileCoordsToLonDegree(firstTileZoom, firstTileX, firstTileY);
            var firstTileLat = FJTCPgoogleMapsTileCoordsToLatDegree(firstTileZoom, firstTileX, firstTileY);
            var rightTileLon = FJTCPgoogleMapsTileCoordsToLonDegree(firstTileZoom, rightTileX, firstTileY);
            var bottomTileLat = FJTCPgoogleMapsTileCoordsToLatDegree(firstTileZoom, firstTileX, bottomTileY);

            debug(false, "firstTileZoom: " + firstTileZoom);
            debug(false, "firstTileX: " + firstTileX);
            debug(false, "firstTileY: " + firstTileY);
            debug(false, "rightTileX: " + rightTileX);
            debug(false, "bottomTileY: " + bottomTileY);
            debug(false, "cragLeft: " + cragLeft);
            debug(false, "cragTop: " + cragTop);
            debug(false, "firstTileWidth: " + firstTileWidth);
            debug(false, "firstTileHeight: " + firstTileHeight);
            debug(false, "firstTileLon: " + firstTileLon);
            debug(false, "firstTileLat: " + firstTileLat);
            debug(false, "rightTileLon: " + rightTileLon);
            debug(false, "bottomTileLat: " + bottomTileLat);

            if (cragLeft != undefined && firstTileLon != undefined && rightTileLon != undefined && firstTileLeft != undefined && firstTileWidth != undefined &&
                cragTop != undefined && firstTileLat != undefined && bottomTileLat != undefined && firstTileTop != undefined && firstTileHeight != undefined) {

                var leftCrag = cragLeft;
                var topCrag = cragTop;
                if (cragWidth != undefined) {
                    leftCrag += cragWidth / 2.0;
                }
                if (cragHeight != undefined) {
                    topCrag += cragHeight;
                }

                debug(false, "leftCrag: " + leftCrag);
                debug(false, "topCrag: " + topCrag);
                //verbose = false;

                lon = firstTileLon + (leftCrag - firstTileLeft) * (rightTileLon - firstTileLon) / firstTileWidth;
                lat = firstTileLat + (topCrag - firstTileTop) * (bottomTileLat - firstTileLat) / firstTileHeight;
            }
        });

        return {longitude: lon, latitude: lat};
    }

    //----------------------------------------------------------------------------------------------------
    // START of MAP manipulation stuff ...

    function FJTCPformatLocationToLatLonCoords(location) {
        return location != null && location.latitude != null && location.longitude != null 
          ? location.latitude.toFixed(6) + ", " + location.longitude.toFixed(6) 
          : "";
    }
    
    function FJTCPreadLocationfromCreateMarkerCommand(commandstring) {
        //commandstring = "createMarker(11.376929,49.6532,"
        var stripped = commandstring.substring(commandstring.indexOf("(")+1);
        var lon = stripped.substring(0, stripped.indexOf(","));
        stripped = stripped.substring(stripped.indexOf(",")+1);
        var lat = stripped.substring(0, stripped.indexOf(","));
        return {longitude: parseFloat(lon), latitude: parseFloat(lat)};
    }

    function FJTCPreadGpsLocations(html) {
        debug(true, "FJTCPreadGpsLocations");
        //createMarker(11.376929,49.6532,'crag');
        //createMarker(11.380327,49.650933,'parkplatz');
        var cragLocation = {longitude: null, latitude: null};
        var parkingLocation = {longitude: null, latitude: null};
        Array.prototype.forEach.call(html.querySelectorAll("script"), function (element) {
          var gragMatches = element.textContent.match(/createMarker\s*\(.*(?='crag')/g);
          if (gragMatches != null && gragMatches.length > 0) {
            cragLocation = FJTCPreadLocationfromCreateMarkerCommand(gragMatches[0]);
          }
          var parkingMatches = element.textContent.match(/createMarker\s*\(.*(?='parkplatz')/g);
          if (parkingMatches != null && parkingMatches.length > 0) {
            parkingLocation = FJTCPreadLocationfromCreateMarkerCommand(parkingMatches[0]);
          }
        });

        if (cragLocation.longitude == null || cragLocation.latitude == null) {
          cragLocation = FJTCPreadGpsLocationFromCenterOfMapTiles(html);
        }
        
        return {
          cragLat: cragLocation.latitude, 
          cragLon: cragLocation.longitude, 
          cragLatLon: FJTCPformatLocationToLatLonCoords(cragLocation),
          parkingLat: parkingLocation.latitude,  
          parkingLon: parkingLocation.longitude, 
          parkingLatLon: FJTCPformatLocationToLatLonCoords(parkingLocation) };
    }
    
    function FJCTPcontainsMapParkingPosition(dochtml) {
        var hasParking = false;
        Array.prototype.forEach.call(dochtml.querySelectorAll("script"), function (element) {
          var contentMatches = element.textContent.match(/OpenLayers/gi);
          if (contentMatches != null && contentMatches.length > 0) {
            debug(false, "FJCTPcontainsMapParkingPosition --> analysing script that creates OpenLayers map");
            if (element.textContent.indexOf("'parkplatz'") > 0) {
              hasParking = true;
            }
          }
        });
        return hasParking;
    }

    function FJCTPMapCreation() {
      // this is code for OpenLayers Release 2.12
      var map;
      var markerLayer;
      var polygonLayer;
      var mapHover;
      var iconNumber = 1;
      var numberedIcons = true;
      var currentHighlightedFeature;

      OpenLayers.ImgPath = '/images/openLayers/';

      function createPolygon(points, id, name, type) {
        var site_points = new Array();
        for(var i = 0; i < points.length; i++) {
          site_points.push(new OpenLayers.Geometry.Point(points[i][0], points[i][1]));
        }
        var linear_ring = new OpenLayers.Geometry.LinearRing(site_points);
        var centroid = linear_ring.getCentroid();
        createMarker(centroid.x,centroid.y,'/klettern/region/'+id,name,'region/region_'+type);
        linear_ring.transform(new OpenLayers.Projection('EPSG:4326'), map.getProjectionObject());
        var polygonFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon([linear_ring]), null);
        polygonLayer.addFeatures([polygonFeature]);
      }

      function createMarker(lon, lat, href, name, type) {
        var markerPoint = new OpenLayers.Geometry.Point(lon,lat).transform(
          new OpenLayers.Projection('EPSG:4326'), 
          map.getProjectionObject()
        );
        var width = 21;
        var height = 26;
        var xOffset = -width/2;
        var yOffset = -height/2;
        var numberIcon;
        if(numberedIcons) {
          numberIcon = '/images/number/'+iconNumber+'.png';
        } else {
          numberIcon = '/images/number/blank.png';
        }
        iconNumber = iconNumber + 1;

        //handle createMarker polymorphism (grag page vs overview page)
        //createMarker(11.376929,49.6532,'crag');
        //createMarker(11.380327,49.650933,'parkplatz');
        //createMarker(11.55159,49.54212,'/klettern/poi/1115','Bodenbergwand','crag');
        var highlightedBackgroundGraphicUrl;
        var unhighlightedBackgroundGraphicUrl;
        if (typeof name === 'undefined' && typeof type === 'undefined') {
          // grag page:
          var latlon = lat + ", " + lon;
          type = href;
          name = href + " (" + latlon + ")";
          href = "https://maps.google.de/maps?q=" + latlon;
          numberIcon = '/images/number/blank.png';
          highlightedBackgroundGraphicUrl = '/images/poi/poi_' + type + '.png';
          unhighlightedBackgroundGraphicUrl = highlightedBackgroundGraphicUrl;
        } else {
          // overview page:
          highlightedBackgroundGraphicUrl = '/images/poi/poi_' + type + '.png';
          unhighlightedBackgroundGraphicUrl = '';
        }
        var backgroundGraphicUrl = unhighlightedBackgroundGraphicUrl;

        var markerAttributes = {title: name, href: href};
        var markerImage = {externalGraphic: numberIcon, graphicWidth: width, graphicHeight: height, graphicXOffset: xOffset, graphicYOffset: yOffset, backgroundGraphic: backgroundGraphicUrl, backgroundWidth: width, backgroundHeight: height, backgroundXOffset: xOffset, backgroundYOffset: yOffset, highlightedBackgroundGraphicUrl: highlightedBackgroundGraphicUrl, unhighlightedBackgroundGraphicUrl: unhighlightedBackgroundGraphicUrl};
        var markerFeature = new OpenLayers.Feature.Vector(markerPoint, markerAttributes, markerImage);
        markerLayer.addFeatures(markerFeature);
      }

      function onMarkerSelected(evt) {
        //alert("onMarkerSelected:\n " + evt.feature.attributes.title + " \n" + evt.feature.attributes.href + " \nbackgroundUnhighlighted: " + evt.feature.style.unhighlightedBackgroundGraphicUrl + " \nbackgroundHighlighted: " + evt.feature.style.highlightedBackgroundGraphicUrl + " \nbackground: " + evt.feature.style.backgroundGraphic);
        //window.location.href = evt.feature.attributes.href;
        window.open(evt.feature.attributes.href);
        onMarkerUnhighlighted(evt);
      }

      function highlightFeature(title) {
        if (title == null) {
          return;
        }
        var features = markerLayer.getFeaturesByAttribute('title', title);
        var feature = null;
        Array.prototype.forEach.call(features, function (feat) {
          feature = feat;
        });
        if (feature == null) {
          return;
        }
        if (currentHighlightedFeature != feature) {
          hideFeaturePopup(currentHighlightedFeature);
          hideFeatureBackgroundImage(currentHighlightedFeature);
        }
        currentHighlightedFeature = feature;
        showFeaturePopup(feature); setTimeout(function(){hideFeaturePopup(feature);}, 1000);
        showFeatureBackgroundImage(feature);
      }

      function showFeatureBackgroundImage(feature) {
        if (feature == null) {
          return;
        }
        if (feature.style.backgroundGraphic != feature.style.highlightedBackgroundGraphicUrl)
        {
          var extGraphicUrl = feature.style.externalGraphic;
          feature.style.externalGraphic = "";
          feature.style.backgroundGraphic = feature.style.highlightedBackgroundGraphicUrl;
          markerLayer.drawFeature(feature);
          feature.style.externalGraphic = extGraphicUrl;
          markerLayer.drawFeature(feature);
          setTimeout(function(){hideFeatureBackgroundImage(feature);}, 2500);
        }
      }

      function hideFeatureBackgroundImage(feature) {
        if (feature == null) {
          return;
        }
        if (feature.style.backgroundGraphic != feature.style.unhighlightedBackgroundGraphicUrl)
        {
          //var extGraphicUrl = feature.style.externalGraphic;
          //feature.style.externalGraphic = "";
          feature.style.backgroundGraphic = feature.style.unhighlightedBackgroundGraphicUrl;
          markerLayer.drawFeature(feature);
          //feature.style.externalGraphic = extGraphicUrl;
          //markerLayer.drawFeature(feature);
        }
      }

      function showFeaturePopup(feature) {
        if (feature.popup) {
          return;
        }
        var popup = new OpenLayers.Popup('popup',
          OpenLayers.LonLat.fromString(feature.geometry.toShortString()),
          null,
          "<div style='white-space: nowrap'>" + feature.attributes.title + "</div>", //"<div style='white-space: nowrap'><a href='" + feature.attributes.href + "'target='_blank'>" + feature.attributes.title + '</a></div>', //"<div style='white-space: nowrap' onClick='(function(){window.open(" + feature.attributes.href + ");})();'>" + feature.attributes.title + "</div>",
          false,
          null
        );
        popup.autoSize = true;
        feature.popup = popup;
        map.addPopup(popup);
        setTimeout(function(){hideFeaturePopup(feature);}, 1500);
      }

      function hideFeaturePopup(feature) {
        if (feature == null) {
          return;
        }
        if (feature.popup == null) {
          return;
        }
        map.removePopup(feature.popup);
        feature.popup.destroy();
        feature.popup = null;
      }

      function onMarkerHighlighted(evt) {
        //alert("onMarkerHighlighted: " + evt.feature.attributes.title + "  " + evt.feature.attributes.href);
        var feature = evt.feature;
        if (currentHighlightedFeature != feature) {
          hideFeaturePopup(currentHighlightedFeature);
          hideFeatureBackgroundImage(currentHighlightedFeature);
        }
        currentHighlightedFeature = feature;
        showFeaturePopup(feature);
        showFeatureBackgroundImage(feature);
      }

      function onMarkerUnhighlighted(evt) {
        //alert("onMarkerUnhighlighted: " + evt.feature.attributes.title + "  " + evt.feature.attributes.href);
        setTimeout(function(){hideFeaturePopup(evt.feature);/*hideFeatureBackgroundImage(evt.feature);*/}, 1500);
      }

      function drawMap() {
        var mapControls = [ 
          new OpenLayers.Control.Navigation({
            'zoomWheelEnabled': false, 
          }),
          new OpenLayers.Control.Zoom()
        ];

        map = new OpenLayers.Map('map-64', { controls: mapControls, theme: null });
        var mapnik = new OpenLayers.Layer.OSM('Mapnik','/osm/tileproxy.php?layer=OSM_MAPNIK&path=${z}/${x}/${y}.png');
        map.addLayer(mapnik);

        polygonLayer = new OpenLayers.Layer.Vector('Vector Layer');
        var style = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
        style.fillColor = '#ee9900';
        style.fillOpacity = 0.5;
        style.strokeWidth = 2; 
        style.strokeColor = '#f5b300';
        style.strokeOpacity = 0.9;
        polygonLayer.style = style;
        map.addLayer(polygonLayer);

        markerLayer = new OpenLayers.Layer.Vector('Markers');
        map.addLayer(markerLayer);

        var hoverControl = new OpenLayers.Control.SelectFeature(markerLayer, {
          hover: true,
          highlightOnly: true
        });
        map.addControl(hoverControl);
        hoverControl.activate();
        hoverControl.events.on({'featurehighlighted': onMarkerHighlighted});
        hoverControl.events.on({'featureunhighlighted': onMarkerUnhighlighted});

        var selectControl = new OpenLayers.Control.SelectFeature(markerLayer);
        map.addControl(selectControl);
        selectControl.activate();
        markerLayer.events.on({'featureselected': onMarkerSelected}); 

        //var points;
        //...
        //createPolygon(points,,,);

        //iconNumber = 1;
        //createMarker(11.376929,49.6532,'crag');
        //createMarker(11.380327,49.650933, 'parkplatz');
        //
        //createMarker(11.55159,49.54212,'/klettern/poi/1115','Bodenbergwand','crag');
        //createMarker(11.56155,49.51129,'/klettern/poi/1053','Brosinnadel','crag');

        //map.zoomToExtent(markerLayer.getDataExtent());
      }

      function initialize() {
        //alert('initialize started');
        drawMap();
        window.map = map;
        createMapMarkersAndPolygons();
        setTimeout(function() {
          map.updateSize(); 
          map.zoomToExtent(markerLayer.getDataExtent()); 
          map.zoomOut(); 
        }, 250);
        Array.prototype.forEach.call(window.document.documentElement.querySelectorAll("table>tbody>tr a"), function (element) {
          if (element.tagName == "A" && element.href.indexOf("/poi/") > 0) {
            element.onmouseover = function() {highlightFeature(element.textContent)};
          }
        });
      }

      initialize();
    }

    function FJCTPgetMapCreationScript(originalScript) {
      debug(true, "FJCTPgetMapCreationScript");
      var script = FJCTPMapCreation.toString();
      script = script.substring(script.indexOf("{")+1);
      script = script.substring(0,script.lastIndexOf("}"));
      script += "\n\n function createMapMarkersAndPolygons() {\n  iconNumber = 1;";
      var createMarkerCalls = originalScript.match(/createMarker+.*(?=;)/g);
      for (i = 0; i < createMarkerCalls.length; i++) {
        if (createMarkerCalls[i].indexOf("centroid.x,centroid.y,'/klettern/region/'") < 0) {
          script += "\n  " + createMarkerCalls[i];
        }
      }
      script += "\n}"
      return script.replace(/'map-?\d*'/g, originalScript.match(/'map-?\d*'/));
    }

    function FJCTPupgradeMap(dochtml) {
      debug(true, "FJCTPupgradeMap");

      var mapDiv = dochtml.querySelector("div.olMap");
      if (mapDiv == null) {
        // there is no OpenLayers map, we can just stop here
        return;
      }
      mapDiv.style.height = "640px";

      var mapViewport = dochtml.querySelector("div.olMapViewport");
      if (mapViewport != null) {
        mapViewport.parentElement.removeChild(mapViewport);
        Array.prototype.forEach.call(dochtml.querySelectorAll("script"), function (element) {
            var contentMatches = element.textContent.match(/OpenLayers/gi);
            if (contentMatches != null && contentMatches.length > 0) {
                debug(false, "FJCTPupgradeMap --> copying scripts that creates OpenLayers map");
                var script = document.createElement('script');
                //script.async = true;
                //script.src = src;
                //script.addEventListener('load',  () => alert('Script loaded.'));
                //script.addEventListener('error', () => alert('Error loading script.'));
                //script.addEventListener('abort', () => alert('Script loading aborted.'));
                script.defer = "defer";
                script.textContent = FJCTPgetMapCreationScript(element.textContent);
                element.parentElement.removeChild(element);
                document.head.appendChild(script);
                //script.parentElement.removeChild(script);
            }
        });
      }

      var allChilds = getChildTreeAsNodeList(dochtml);
      // improving map display
      for (var child of allChilds) {
        if (child.tagName == "A" && child.href.indexOf("openstreetmap") >= 0) {
          debug(false, "FJCTPupgradeMap --> remove OS copyright link");
          child.parentElement.removeChild(child);
        }
        if (child.tagName == "DIV" && child.id.indexOf("OpenLayers.Control.Zoom") >= 0) {
          debug(false, "FJCTPupgradeMap --> hiding OS Zoom buttons");
          var zoomButtons = child;
          var mapView = zoomButtons.parentElement;
          var map = mapView.parentElement;
          zoomButtons.style.visibility = "hidden";
          
          var hideButton = document.createElement('button');
          hideButton.textContent = "hide map";
          hideButton.style.position = "absolute";
          hideButton.style.left = "500px";
          hideButton.style.top = "8px";
          hideButton.style.zIndex = 2000;
          hideButton.style.padding = "5px 5px 5px 5px";
          hideButton.style.visibility = "hidden";
          hideButton.onclick = function() { /*FJCTPremovePoiSection(dochtml,"map"); map.parentElement.removeChild(map);*/ map.parentElement.parentElement.removeChild(map.parentElement); };
          mapView.appendChild(hideButton);
          
          mapView.onmouseover = function() {zoomButtons.style.visibility = "visible"; hideButton.style.visibility = "visible";};
          mapView.onmouseout  = function() {zoomButtons.style.visibility = "hidden"; hideButton.style.visibility = "hidden";};
        }
      }
    }

    //----------------------------------------------------------------------------------------------------
    // START of main routine (FJCTPmodifyDocument)

    function FJCTPmodifyDocument(document) {
        debug(true, "FJCTPmodifyDocument");
        
        if (isProcessing()) {
            debug(true, "FJCTPmodifyDocument:: is Processing");
            return;
        }

        if (isProcessed()) {
            debug(true, "FJCTPmodifyDocument:: is Processed");
            return;
        }

        // decide FJ page type
        var isAnyOfValidPages = false;
        var isSearchResultPage = false;
        var isOverviewPage = false;
        var isRegionPage = false;
        var isGebietPage = false;
        var isGragPage = false;
        var isRoutePage = false;
        var isHitFormPage = false;
        var isHitListPage = false;
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>table.search-results"), function (element) {
            isSearchResultPage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isSearchResultPage");
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>div#current-topo-wrapper"), function (element) {
            isRoutePage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isRoutePage");
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>div.poi-section-sectors"), function (element) {
            //if (element.attributes.getNamedItem("class").value == "poi-section poi-section-sectors") {
            if (element.className == "poi-section poi-section-sectors") {
              isOverviewPage = true; isAnyOfValidPages = true;
              debug(true, "FJCTPmodifyDocument -> isOverviewPage");
            }
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>div.location-head>ul#breadcrumb>li:nth-of-type(2)"), function (element) {
            isGebietPage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isGebietPage");
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>div.location-head>ul#breadcrumb>li:nth-of-type(1)"), function (element) {
            isRegionPage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isRegionPage");
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>div#breadcrumb-container>ul#breadcrumb>li:nth-of-type(3)"), function (element) {
            isGragPage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isGragPage");
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>table.list"), function (element) { //'table.list hitliste'
            isHitListPage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isHitListPage");
          });
        }
        if (!isAnyOfValidPages) {
          Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#content>div.columns>div#content-center>form.labeledForm"), function (element) { //'form.labeledForm hitlistAction'
            isHitFormPage = true; isAnyOfValidPages = true;
            debug(true, "FJCTPmodifyDocument -> isHitFormPage");
          });
        }

        // do not process specific page types
        if (!isAnyOfValidPages) {
          return;
        }

        // do preprocessing
        if (!isPreProcessed()) {
            debug(true, "FJCTPmodifyDocument:: start PreProcessing");
            // on first processing, we just add a clickable element for toggling Raw<>Processed
            markAsPreProcess();
          
            //Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#breadcrumb-container>ul~h2:nth-of-type(1)"), function (element) {
            //Array.prototype.forEach.call(document.documentElement.querySelectorAll("div#breadcrumb-header>h2:nth-of-type(1)"), function (element) {
            //Array.prototype.forEach.call(document.documentElement.querySelectorAll("ul#breadcrumb:nth-of-type(1)~h2:nth-of-type(1)"), function (element) {
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
                        FJCTPmodifyDocument(document);
                        return;
                    }
                };
            });

            var processPages = getProcessPages();
            debug(true, "FJCTPmodifyDocument -> processPages = " + processPages);
            if (processPages != "true") {
                debug(true, "FJCTPmodifyDocument:: end PreProcessing -> wait for user input to start Processing");
                return;
            }
            debug(true, "FJCTPmodifyDocument:: end PreProcessing -> start Processing");
            //setProcessPages(true);
            //FJCTPmodifyDocument(document);
        }

        debug(true, "FJCTPmodifyDocument:: start Processing");

        processStart();

        var dochtml = document.documentElement;

        // (1) GENRAL processing
        FJCTPlistPoiSections(document.documentElement);
        FJCTPremoveGoogleAnalytics(dochtml);
        FJCTPremoveAllScriptsExceptOpenLayers(dochtml);

        // (2) reorganize, replace or augment content
        FJCTPmodifyPoiTableClassNameToSmall(dochtml);
        FJCTPmodifyHeadlineAndGragTable(dochtml, true);
        FJCTPremoveGragHeadlineAndNavigationMenu(dochtml);
        //verboseMode = true;
        FJCTPreplaceFrankenJuraPremiumTopoImage(dochtml);
        //verboseMode = false;
        FJCTPmodifyRockEventsSection(dochtml);

        // (3) specific content manipulations
        if (isSearchResultPage) {
        }
        //else if (isRegionPage) {
        //  // !! has no Poi-Sections !!
        //}
        //else if (isGebietPage) {
        //  // !! has no Poi-Sections !! 
        //}
        else if (isRegionPage || isGebietPage) {
          FJCTPcleanListEntries(dochtml);

          var allChilds = getChildTreeAsNodeList(dochtml); //debug(false, "FJCTPmodifyGebietPage getChildTreeAsNodeList.length: " + allChilds.length);
          debug(false, "FJCTPmodifyGebietPage --> deleting first empty line from list");
          var firstTableRow = dochtml.querySelector("table.search-results>tbody>tr:first-child");
          if (firstTableRow != null) {
            firstTableRow.parentElement.removeChild(firstTableRow);
          }
          debug(false, "FJCTPmodifyGebietPage --> deleting headlines 'Übersicht' and 'Gefundene Felsen'");
          for (var child of allChilds) {
            if (child.tagName == "H3") {
              child.parentElement.removeChild(child);
            }
          }
          debug(false, "FJCTPmodifyGebietPage --> replacing topo-icon with rating stars");
          for (var child of allChilds) {
            if (child.tagName == "IMG" && child.alt == "Topo") {
              var ratingRow = child.parentElement.parentElement.nextElementSibling;
              var allRowChilds = getChildTreeAsNodeList(ratingRow);
              for (var rowChild of allRowChilds) {
                if (rowChild.tagName == "IMG" && rowChild.alt == "Bewertung") {
                  child.parentElement.appendChild(rowChild);
                }
              }
              //child.parentElement.parentElement.parentElement.removeChild(ratingRow);
              child.parentElement.removeChild(child);
            }
          }
          debug(false, "FJCTPmodifyGebietPage --> deleting rating row");
          for (var child of allChilds) {
            if (child.tagName == "A" && child.href.indexOf("/poi/") > 0 && child.parentElement.tagName == "TD") {
              var ratingRow = child.parentElement.parentElement.nextElementSibling;
              if (ratingRow != null && ratingRow.tagName == "TR") {
                child.parentElement.parentElement.parentElement.removeChild(ratingRow);
              }
            }
          }
        }
        else if (isOverviewPage) {
            // div.poi-section 1 "poi-table-small"     : Fels-Tabelle
            // div.poi-section 2 "map"                 : Karte (OpenStreetMap)
            // div.poi-section 3 "Beschreibung"        : Beschreibung - Zufahrt - Zusteig
            // div.poi-section 4 "Rock-Events"         : Rock-Events
            // div.poi-section 5 "Sektoren"            : Sektoren
            FJCTPremovePoiSection/*FJCTPmovePoiSectionToEnd*/(dochtml, "map");
            FJCTPcleanListEntries(dochtml);
        }
        else if (isGragPage) {
            // div.poi-section 1 "poi-table-small"     : Fels-Tabelle
            // div.poi-section 2 "map"                 : Karte (OpenStreetMap)
            // div.poi-section 3 "Beschreibung"        : Beschreibung - Zufahrt - Zusteig
            // div.poi-section 4 "Zonierung"           : Zonierung - Aktuelle Sperrungen
            // div.poi-section 5 "Rock-Events"         : Rock-Events
            // div.poi-section 6 "Informationen von"   : Informationen von ...
            // div.poi-section 7 "Routeninformationen" : Routeninformationen (Balkendiagramm)
            // div.poi-section 8 "Routen"              : Routen
            if (FJCTPcontainsMapParkingPosition(dochtml)) {
              FJCTPmovePoiSectionToEnd(dochtml, "map");
            } else {
              FJCTPremovePoiSection(dochtml, "map");
            }
            FJCTPremovePoiSection(dochtml, "Zonierung");
            //FJCTPremovePoiSection(dochtml, "Rock-Events");
            FJCTPremovePoiSection(dochtml, "Informationen von");
            FJCTPremovePoiSection(dochtml, "Routeninformationen");
        }
        else if (isRoutePage) {
            // div.poi-section 1 "poi-table-small"     : Fels-Tabelle
            // div.poi-section 2 "Anmerkung"           : Anmerkung - Information
            // div.poi-section 3 "Rock-Events"         : Rock-Events
            // div.poi-section 4 "Interaktiv"          : Interaktiv
            FJCTPremovePoiSection(dochtml, "Interaktiv");
        }
        else if (isHitFormPage) {
            //FJCTPlistPoiSections(dochtml);
        }
        else if (isHitListPage) {
            //FJCTPlistPoiSections(dochtml);
        }
        else {
        }

        // (4) remove general unwanted content
        FJCTPremoveElement(dochtml, "div.presenter");                          //remove presenter divs
        FJCTPremoveElement(dochtml, "div#header");                             //HauptmenÃ¼
        FJCTPremoveElement(dochtml, "div.advertising");                        //Werbung fÃ¼r Pensionen, GaststÃ¤tten
        FJCTPremoveElement(dochtml, "div.advertising-poi");                    //Werbung fÃ¼r Pensionen, GaststÃ¤tten
        FJCTPremoveElement(dochtml, "div.box-wrapper");                        //Werbung
        FJCTPremoveElement(dochtml, "div.box-wrapper box-custom");             //Werbung
        FJCTPremoveElement(dochtml, "ul#poi-menu");                            //POI-MENÃœ: (Drucken, Felsen versenden, Ã„nderungsvorschlag, Neue Route)
        FJCTPremoveElement(dochtml, "div#content-right");                      //Werbung in rechter Spalte
        FJCTPremoveElement(dochtml, "div#content-right-wrapper");              //Werbung in rechter Spalte
        FJCTPremoveElement(dochtml, "div#footer");                             //Login,Kontak,Werbung,Impressum
        //FJCTPremoveElement(dochtml, "div#side-content");
        FJCTPhideElement(dochtml, "div#side-content");
        FJCTPremoveElement(dochtml, "div#side-content-wrapper");
        FJCTPremoveElement(dochtml, "div.poi-section ~ br");
      //FJCTPremoveElement(dochtml, "div.poi-section ~ hr");
      //FJCTPremoveElement(dochtml, "div~hr");
        FJCTPremoveElement(dochtml, "hr");

        // (5) adapt layouting for optimal printing
        // remove images and color from body (background)
        FJCTPadaptElementStyles(dochtml);
        // remove margins
        FJCTPmodifyDivWithClassName(dochtml, "column", "column_two-columnDEACTIVATED");
        FJCTPmodifyDivWithClassName(dochtml, "reverse-row-order", "reverse-row-order_DEACTIVATED");
        // eliminate "bg" div
        FJCTPkickoutDivBetweenBodyAndDiv(dochtml, "page");
        // eliminate "page" div
        FJCTPkickoutDivBetweenBodyAndDiv(dochtml, "content");
        FJCTPremoveElement(dochtml, "div#lightboxOverlay");
        FJCTPremoveElement(dochtml, "div#lightbox");

        // (6) reorganize, replace or augment content
        FJCTPupgradeMap(dochtml);
        FJCTPmodifyRouteDescriptions(dochtml, processEnd);

        debug(true, "FJCTPmodifyDocument:: finished Processing");
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
    //    FJCTPmodifyDocument(document);
    //});

    // here we do further processings (to get all in a single file) after document completely loaded (and modified)
    window.onload = function () {
        debug(false, "onload");
        FJCTPmodifyDocument(document);
    };
    
})();
