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
 * @fileoverview Content script that wires listeners for events produced
 * by the page, injects scripts that should be executed in the page context and
 * initialises extension-wide variables.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 * @author serebryakov@google.com (Sergey Serebryakov)
 */


goog.provide('brt.loader');

goog.require('brt.constants');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.json');



/**
 * Constructor function.
 * @constructor
 * @export
 */
brt.loader = function() {
  /**
   * Coverage container in the page.
   * @type {Node}
   * @private
   */
  this.coverageContainer_ = null;
};
goog.addSingletonGetter(brt.loader);


/**
 * The URL to the folder consisting of files of the ScriptCover tool.
 * @export
 */
brt.loader.RESOURCE_PREFIX = chrome.extension.getURL('');


/**
 * Creates coverage div container in the page. It will be further used to
 * collect javascript coverage information.
 * @private
 */
brt.loader.prototype.makeCoverageContainer_ = function() {
  this.coverageContainer_ = goog.dom.createDom(goog.dom.TagName.DIV,
      {'id': 'coverageContainerDiv', 'style': 'display: none',
       'class': 'isbrt'});
  goog.dom.appendChild(goog.dom.getDocument().body,
      this.coverageContainer_);
};


/**
 * Inserts inject_compiled.js in the page.
 * @private
 */
brt.loader.prototype.injectCompiledScript_ = function() {
  var injectScript = goog.dom.createDom(goog.dom.TagName.SCRIPT,
      {'id': 'injectedScript',
       'src': brt.loader.RESOURCE_PREFIX + 'inject_compiled.js'});
  goog.dom.appendChild(goog.dom.getElementsByTagNameAndClass('head')[0],
      injectScript);
};


/**
 * Submits coverage information.
 * @private
 */
brt.loader.prototype.submitCoverageInfo_ = function() {
  var data = goog.json.parse(this.coverageContainer_.innerHTML);
  var port = chrome.extension.connect();
  port.postMessage({action: brt.constants.ActionType.SUBMIT_COVERAGE_INFO,
       coverageData: data});
};


/**
 * Shows coverage information.
 * @private
 */
brt.loader.prototype.showCoverage_ = function() {
  var port = chrome.extension.connect();
  port.postMessage({action: brt.constants.ActionType.SHOW_COVERAGE});
};


/**
 * Adds listeners to coverage container.
 * @private
 */
brt.loader.prototype.setCoverageContainerHandlers_ = function() {
  goog.events.listen(this.coverageContainer_,
                     brt.constants.EventType.SUBMIT_COVERAGE_INFO,
                     goog.bind(this.submitCoverageInfo_, this), true);
  goog.events.listen(this.coverageContainer_,
                     brt.constants.EventType.SHOW_COVERAGE,
                     goog.bind(this.showCoverage_, this), true);
};


/**
 * Adds utility containers to the page, wires listeners for events produced
 * by the page, injects "inject_compiled.js" script.
 */
brt.loader.prototype.addResourcesToPage = function() {
  this.makeCoverageContainer_();
  this.setCoverageContainerHandlers_();
  this.injectCompiledScript_();
};


/**
 * Sends periodic events to collect coverage data.
 */
brt.loader.prototype.sendCollectCoverageEvents = function() {
  var containerDiv = goog.dom.getElement('coverageContainerDiv');
  var event = goog.global.document.createEvent('Event');
  event.initEvent(brt.constants.EventType.COLLECT_PERIODIC_COVERAGE,
      true, true);
  containerDiv.dispatchEvent(event);
};


/**
 * Handles data received from background script, then sends it to popup.
 * @param {Object} port Port object to communicate with background script.
 */
brt.loader.prototype.onConnect = function(port) {
  this.port_ = port;
  port.onMessage.addListener(goog.bind(function(msg) {
    if (msg.action == brt.constants.ActionType.TAB_IS_SELECTED) {
      this.sendCollectCoverageEvents();
    }
  }, this));
};


chrome.extension.onConnect.addListener(goog.bind(
    brt.loader.getInstance().onConnect, brt.loader.getInstance()));

