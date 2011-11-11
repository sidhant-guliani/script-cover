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
 * @fileoverview Script loads external files on demand, handles
 * requests incoming from content scripts, initializes extension-wide objects.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 * @author serebryakov@google.com (Sergey Serebryakov)
 */

goog.provide('brt.background');

goog.require('brt.constants');
goog.require('brt.coverageHelper');
goog.require('goog.Timer');
goog.require('goog.net.XhrIo');



/**
 * brt.background function constructor.
 * @constructor
 * @export
 */
brt.background = function() {
  this.coverageTimer_ = new goog.Timer(3000);

  this.coverageTimer_.start();

  goog.events.listen(this.coverageTimer_, goog.Timer.TICK,
      goog.bind(this.collectPeriodicCoverage_, this), true);
};
goog.addSingletonGetter(brt.background);


/**
 * Object containing coverage info about scripts.
 * @type {Object}
 * @export
 */
brt.background.scriptInfo = {};


/**
 * Initiates periodic calls to collect coverage.
 * @private
 */
brt.background.prototype.collectPeriodicCoverage_ = function() {
  chrome.tabs.getSelected(null, function(tab) {
    var port = chrome.tabs.connect(tab.id);
    port.postMessage({action: brt.constants.ActionType.TAB_IS_SELECTED});
  });
};


/**
 * Performs an XMLHttpRequest to provided URL to load external script.
 * @param {string} url The URL to load.
 * @param {Object} port Port to send messages to content scripts.
 * @private
 */
brt.background.prototype.loadScript_ = function(url, port) {
  goog.net.XhrIo.send(url, function(e) {
      var xhr = e.target;
      var data = xhr.getResponseText();
      port.postMessage({response: true, data: data});
  });
};


/**
 * Handles data received from content script.
 * @param {Object} port Port object to communicate with background script.
 */
brt.background.prototype.onConnect = function(port) {
  port.onMessage.addListener(goog.bind(function(msg) {
    if (port.sender.tab) {
      var tabId = port.sender.tab.id;
    }
    switch (msg.action) {
      case brt.constants.ActionType.LOAD_SCRIPT:
        this.loadScript_(msg.url, port);
        break;
      case brt.constants.ActionType.SUBMIT_COVERAGE_INFO:
        var data = msg.coverageData;
        chrome.tabs.getSelected(null, function(tab) {
          if (tab.id == tabId) {
            brt.coverageHelper.acceptCoverageInfo(tabId, data);
          }
        });
        break;
      case brt.constants.ActionType.SHOW_COVERAGE:
        chrome.tabs.getSelected(null, function(tab) {
          brt.coverageHelper.showCoverageInPopup(tab.id);
        });
        break;
    }
  }, this));
};


chrome.extension.onConnect.addListener(goog.bind(
    brt.background.getInstance().onConnect, brt.background.getInstance()));

