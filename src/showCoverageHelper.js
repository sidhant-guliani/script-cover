// Copyright 2011 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Contains functions that record and display coverage info.
 * This is background script.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 * @author serebryakov@google.com (Sergey Serebryakov)
 */


goog.provide('brt.coverageHelper');

goog.require('brt.constants');
goog.require('brt.content.Templates.coverageReport');
goog.require('brt.loader');
goog.require('brt.popup');
goog.require('goog.dom.DomHelper');
goog.require('goog.string.StringBuffer');
goog.require('goog.style');


/**
 * The current global coverage percent statistic.
 * @type {string}
 */
brt.coverageHelper.globalCoveragePercent = '0';


/**
 * The previous global coverage percent statistic.
 * @type {string}
 */
brt.coverageHelper.globalCoveragePercentLast = '0';


/**
 * The previous/last number of javascript code blocks.
 * @type {number}
 */
brt.coverageHelper.globalCommandCounterLast = 0;


/**
 * Records information about scripts execution. This information is submitted by
 * a script on the webpage and delivered by request from content script.
 * @param {number} tabId ID of tab that submits coverage information.
 * @param {Object} data Coverage information.
 *
 * Coverage data has following format:
 *   scriptInfo is array-like object of tabScriptInfo
 *   tabScriptInfo is array of pageScriptInfo
 *   pageScriptInfo is object with fields:
 *     url is string
 *     scriptObjects is array of scriptObject
 *   scriptObject is object with fields:
 *     src is string
 *     counter is number
 *     commands is 1-based array of string
 *       (last element has index counter)
 *     blockCounter is number
 *     executedBlock is 1-based array of number
 *       (last element has index blockCounter)
 */
brt.coverageHelper.acceptCoverageInfo = function(tabId, data) {
  if (!brt.background.scriptInfo[tabId]) {
    brt.background.scriptInfo[tabId] = [];
  }

  // Iterates through each block of code in each script. If the element of the
  // array executedBlock is null or undefined, defines it as 0.
  var dataScriptObjects = data['scriptObjects'];
  var dataObjectCounter = dataScriptObjects.length;
  for (var i = 0; i < dataObjectCounter; i++) {
    var dataScript = dataScriptObjects[i];
    for (var k = 0; k <= dataScript.blockCounter; k++) {
      if (!dataScript['executedBlock'][k]) {
        data['scriptObjects'][i]['executedBlock'][k] = 0;
      }
    }
  }

  // Merge functionality: the page might be visited more that one time in
  // a tab, but the js coverage report should contain only one record for
  // this page. The scripts should be compared and corresponding information
  // should be merged for equal scripts.
  var foundPage = false;
  var tabScriptInfo = brt.background.scriptInfo[tabId];

  // Searching for the page in data already collected.
  for (var pageNum = 0; pageNum < tabScriptInfo.length; pageNum++) {
    var pageScriptInfo = tabScriptInfo[pageNum];
    if (pageScriptInfo.url == data.url) {
      foundPage = true;
      var newScriptObjects = data['scriptObjects'];
      var oldScriptObjects = pageScriptInfo['scriptObjects'];

      // Picking one script in the currently opened page.
      for (var i = 0; i < newScriptObjects.length; i++) {
        var newScript = newScriptObjects[i];
        var foundScript = false;

        // Looking through the scripts that are already known for a tab.
        for (var j = 0; j < oldScriptObjects.length; j++) {
          var oldScript = oldScriptObjects[j];

          // External scripts are compared by "src" attribute, internal scripts
          // are compared by content.
          var equal = (oldScript.src == newScript.src) &&
              (oldScript.src != 'internal script' ||
              oldScript['instrumented'] == newScript['instrumented']);

          if (equal) {
            foundScript = true;

            // Merging coverage information.
            for (var k = 1; k <= newScript.blockCounter; k++) {
              if (newScript['executedBlock'][k]) {
                brt.background.scriptInfo[tabId][pageNum][
                    'scriptObjects'][j]['executedBlock'][k] =
                    newScript['executedBlock'][k];
              }
            }
          }
        }

        // If script wasn't presented before in the coverage data for a tab.
        if (!foundScript) {
          brt.background.scriptInfo[tabId][pageNum]['scriptObjects'].
              push(goog.object.unsafeClone(newScript));
        }
      }
    }
  }

  if (!foundPage) {
    // Page wasn't presented before in the coverage data.
    brt.background.scriptInfo[tabId].push(goog.object.unsafeClone(data));
  }
};


/**
 * Constructs <div> that contains coverage report with given coverage info.
 * @param {Document} coverageDocument Document where constructed <div> will be
 *     added.
 * @param {string} mainDivId ID that constructed <div> should have.
 * @param {Object} tabScriptInfo Coverage information for tab that requested
 *     coverage report. Fields description:
 *     url is URL of page whose information was submitted.
 *     scriptObjects is array of scripts that were on the page.
 *     executedBlock is integer array containing number of executions for every
 *     block.
 * @return {Element} <div> containing coverage report.
 * @this {Object} The context of the function.
 */
brt.coverageHelper.constructReportDiv = function(coverageDocument,
                                                 mainDivId,
                                                 tabScriptInfo) {
  // TODO: rework this part about StringBuffer and Array modification.
  goog.string.StringBuffer.prototype.appendCommand =
      function(command, number, execs, color) {
        this.append('<span class="linenum">' + number + ': </span>' +
            '<span class="execs"> ' + execs + ' </span><span class=' + color +
            '>');
        command = command.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        command = command.replace(/^( +)/g, brt.coverageHelper.spaceReplacer_);
        this.append(command);
        this.append('</span><br />\n');
      };

  var Stack = Array;
  Stack.prototype.top = function() {
    return this[this.length - 1];
  };
  Stack.prototype.popExpected = function(e) {
    if (e != this.top()) {
      console.error('Unexpected pop from stack: #' + this.top() +
          ' expected, #' + e + ' found');
    }
    return this.pop();
  };

  var coverageDom = new goog.dom.DomHelper(coverageDocument);
  var mainDiv = coverageDom.getElement('mergedDataDiv');
  var globalCommandCounter = 0;
  var globalExecutedCounter = 0;

  for (var pageNum = 0; pageNum < tabScriptInfo.length; pageNum++) {
    // Consider one page.
    var pageScriptInfo = tabScriptInfo[pageNum];
    var executedBlock = pageScriptInfo['executedBlock'];
    var scriptObjects = pageScriptInfo['scriptObjects'];
    var objectCounter = scriptObjects.length;
    var pageCommandCounter = 0, pageExecutedCounter = 0;
    var scriptBodyHTML = [];
    var scriptStat = [];

    for (var scriptNum = 0; scriptNum < objectCounter; scriptNum++) {
      // Consider one script.
      var script = scriptObjects[scriptNum];
      var commandCounter = 0, executedCounter = 0;
      var coverageHtml = new goog.string.StringBuffer();

      var marking = true, lastId = -1;
      var idStack = new Stack();
      for (var k = 1; k <= script['counter']; k++) {
        var command = unescape(script['commands'][k]);
        if (command.indexOf('BRT_FROM_EXT_FILE') != -1) {
          var src = command.match(/BRT_FROM_EXT_FILE:(.*)/)[1];
          coverageHtml.append('<p>Script from file ' + src + ':</p>');
        } else if (marking) {
          if (command.indexOf('BRT_BLOCK_BEGIN') != -1) {
            var id = Number(command.match(/BRT_BLOCK_BEGIN:(\d+)/)[1]);
            idStack.push(id);
            if (!script['executedBlock'][id]) {
              marking = false;
              lastId = id;
            }
          } else if (command.indexOf('BRT_BLOCK_END') != -1) {
            var id = Number(command.match(/BRT_BLOCK_END:(\d+)/)[1]);
            idStack.popExpected(id);
          } else {
            executedCounter++;
            commandCounter++;
            coverageHtml.appendCommand(command, commandCounter,
                script['executedBlock'][idStack.top()], 'green');
          }
        } else {
          if (command.indexOf('BRT_BLOCK_BEGIN') != -1) {
            var id = Number(command.match(/BRT_BLOCK_BEGIN:(\d+)/)[1]);
            idStack.push(id);
          } else if (command.indexOf('BRT_BLOCK_END') != -1) {
            var id = Number(command.match(/BRT_BLOCK_END:(\d+)/)[1]);
            idStack.popExpected(id);
            if (id == lastId) {
              marking = true;
              lastId = -1;
            }
          } else {
            commandCounter++;
            coverageHtml.appendCommand(command, commandCounter,
                script['executedBlock'][idStack.top()], 'none');
          }
        }
      }
      scriptBodyHTML[scriptNum] = coverageHtml.toString();

      pageCommandCounter += commandCounter;
      pageExecutedCounter += executedCounter;
      var coveragePercent = ((executedCounter * 100.0) /
          commandCounter).toFixed(1);
      scriptStat[scriptNum] = soy.renderAsFragment(
          brt.content.Templates.coverageReport.scriptStat,
          {pageNum: pageNum, scriptNum: scriptNum, scriptSrc: script.src,
           scriptCommandCounter: commandCounter,
           scriptExecutedCounter: executedCounter,
           scriptCoveragePercent: coveragePercent});
    }
    globalCommandCounter += pageCommandCounter;
    globalExecutedCounter += pageExecutedCounter;
    var pageCoveragePercent = ((pageExecutedCounter * 100.0) /
        pageCommandCounter).toFixed(1);
    var container = soy.renderAsFragment(
        brt.content.Templates.coverageReport.pageStat,
        {pageNum: pageNum, pageScriptInfoUrl: pageScriptInfo.url,
         pageCommandCounter: pageCommandCounter,
         pageExecutedCounter: pageExecutedCounter,
         pageCoveragePercent: pageCoveragePercent});
    coverageDom.appendChild(mainDiv, container);

    var coverageBody =
        coverageDom.getElement('mergedDataDiv_containerBody_page' + pageNum);
    var coverageHead = coverageDom.getElement(
        'mergedDataDiv_containerHead_page' + pageNum);
    var scriptBody = coverageDom.getElementByClass('sourceContainer');
    for (var scriptNum = 0; scriptNum < objectCounter; scriptNum++) {
      coverageBody.appendChild(scriptStat[scriptNum]);
      var scriptHead = coverageDom.getElement('mergedDataDiv_scriptHead_page' +
          pageNum + '_script' + scriptNum);
      // Adds listener to display/hide annotated source code.
      goog.events.listen(scriptHead, 'click',
          goog.bind(this.showHideStats_, this, scriptBody,
          scriptBodyHTML[scriptNum], scriptHead, coverageDom));
    }
    goog.style.showElement(coverageBody, false);
    // Adds listener to display/hide script statistics.
    goog.events.listen(coverageHead, 'click',
        goog.bind(this.showHideStats_, this, coverageBody, ''));
  }
  var globalCoveragePercent = ((globalExecutedCounter * 100.0) /
      globalCommandCounter).toFixed(1);
  var globalStat = coverageDom.getElement('globalStat');
  soy.renderElement(globalStat,
      brt.content.Templates.coverageReport.globalStat,
      {globalCommandCounter: globalCommandCounter,
       globalExecutedCounter: globalExecutedCounter,
       globalCoveragePercent: globalCoveragePercent});

  return mainDiv;
};


/**
 * Displays or hides coverage statistics on user clicks.
 * @param {Element} element The element to display or hide.
 * @param {?string} annotatedSource The html string consisting of annotated
 *     source code.
 * @param {?Element} srcElement The div that was clicked. Contains information
 *     about the script whose coverage statistics should be displayed/hidden.
 * @param {?goog.dom.DomHelper} dom The DOM of the current page.
 * @private
 */
brt.coverageHelper.showHideStats_ = function(element, annotatedSource,
    srcElement, dom) {
  if (annotatedSource) {
    var selectedElements = dom.getElementsByClass('highlightedScriptHead');
    for (var i = 0; i < selectedElements.length; i++) {
      selectedElements[i].className = 'scriptHead';
    }
    srcElement.className = 'highlightedScriptHead';
    element.innerHTML = annotatedSource;
    element.style.display = 'block';
    return;
  }
  if (element.style.display == 'block') {
    element.style.display = 'none';
  } else {
    element.style.display = 'block';
  }
};


/**
 * Replaces simple spaces to &nbsp;. Used for indentation.
 * @param {string} str The string where to replace spaces.
 * @return {string} The resulted string.
 * @private
 */
brt.coverageHelper.spaceReplacer_ = function(str) {
  return str.replace(/ /g, '&nbsp;');
};


/**
 * Constructs full coverage report in a new tab.
 * @param {number} tabId ID of tab that requests coverage.
 */
brt.coverageHelper.showCoverage = function(tabId) {
  var coverageWindow = goog.global.window.open('about:blank', '_blank');
  var coverageDocument = coverageWindow.document;
  var coverageDom = new goog.dom.DomHelper(coverageDocument);

  soy.renderElement(coverageWindow.document.body,
      brt.content.Templates.coverageReport.all,
      {rootFolder: brt.loader.RESOURCE_PREFIX});

  var body = coverageDom.getElementsByTagNameAndClass('body')[0];
  var mergedData = brt.coverageHelper.constructReportDiv(
      coverageDocument, 'mergedDataDiv', brt.background.scriptInfo[tabId]);
  goog.style.showElement(mergedData, true);
};


/**
 * Produces brief coverage statistics (for extension's popup).
 * @param {number} tabId ID of tab that requests coverage.
 */
brt.coverageHelper.showCoverageInPopup = function(tabId) {
  var globalCommandCounter = 0;
  var globalExecutedCounter = 0;
  var tabScriptInfo = brt.background.scriptInfo[tabId];
  var fileStats = [];

  if (!tabScriptInfo) {
    return;
  }

  for (var pageNum = 0; pageNum < tabScriptInfo.length; pageNum++) {
    // Consider one page.
    var pageScriptInfo = tabScriptInfo[pageNum];
    var executedBlock = pageScriptInfo['executedBlock'];
    var scriptObjects = pageScriptInfo['scriptObjects'];
    var objectCounter = scriptObjects.length;
    var pageCommandCounter = 0, pageExecutedCounter = 0;

    for (var scriptNum = 0; scriptNum < objectCounter; scriptNum++) {
      // Consider one script.
      var script = scriptObjects[scriptNum];
      var commandCounter = 0, executedCounter = 0;
      var coverageHtml = new goog.string.StringBuffer();

      var marking = true, lastId = -1;
      for (var k = 1; k <= script['counter']; k++) {
        var command = unescape(script['commands'][k]);
        if (!command.indexOf('BRT_FROM_EXT_FILE') != -1) {
          if (marking) {
            if (command.indexOf('BRT_BLOCK_BEGIN') != -1) {
              var id = Number(command.match(/BRT_BLOCK_BEGIN:(\d+)/)[1]);
              if (!script['executedBlock'][id]) {
                marking = false;
                lastId = id;
              }
            } else if (command.indexOf('BRT_BLOCK_END') != -1) {
              var id = Number(command.match(/BRT_BLOCK_END:(\d+)/)[1]);
            } else {
              executedCounter++;
              commandCounter++;
            }
          } else {
            if (command.indexOf('BRT_BLOCK_BEGIN') != -1) {
              var id = Number(command.match(/BRT_BLOCK_BEGIN:(\d+)/)[1]);
            } else if (command.indexOf('BRT_BLOCK_END') != -1) {
              var id = Number(command.match(/BRT_BLOCK_END:(\d+)/)[1]);
              if (id == lastId) {
                marking = true;
                lastId = -1;
              }
            } else {
              commandCounter++;
            }
          }
        }
      }

      pageCommandCounter += commandCounter;
      pageExecutedCounter += executedCounter;

      var coveragePercent = ((executedCounter * 100.0) /
          commandCounter).toFixed(1);
      fileStats[scriptNum] = {
        fileName: script.src,
        executedCounter: executedCounter,
        commandCounter: commandCounter,
        coveragePercent: coveragePercent,
        tracked: true
      };
    }

    globalCommandCounter += pageCommandCounter;
    globalExecutedCounter += pageExecutedCounter;
  }

  brt.coverageHelper.globalCoveragePercent = ((globalExecutedCounter * 100.0) /
      globalCommandCounter).toFixed(1);
  brt.coverageHelper.globalCoveragePercent =
      brt.coverageHelper.globalCoveragePercent == 'NaN' ? '0' :
      brt.coverageHelper.globalCoveragePercent;

  chrome.browserAction.setBadgeText({text:
      brt.coverageHelper.globalCoveragePercent});

  var popup = null;

  chrome.tabs.getSelected(null, function(tab) {
    if (brt.coverageHelper.globalCoveragePercent !=
        brt.coverageHelper.globalCoveragePercentLast) {
      popup = new brt.popup();
      popup.updateCoverage(brt.coverageHelper.globalCoveragePercent,
          brt.coverageHelper.globalCoveragePercentLast, globalCommandCounter,
          fileStats);
      brt.coverageHelper.globalCoveragePercentLast =
          brt.coverageHelper.globalCoveragePercent;
    }

    if (brt.coverageHelper.globalCommandCounterLast != globalCommandCounter) {
      popup = new brt.popup();
      popup.updateCoverage(brt.coverageHelper.globalCoveragePercent,
          brt.coverageHelper.globalCoveragePercentLast, globalCommandCounter,
          fileStats);
      brt.coverageHelper.globalCommandCounterLast = globalCommandCounter;
    }
  });
};

