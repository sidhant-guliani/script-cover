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
goog.require('goog.net.XhrIo');



/**
 * brt.background function constructor.
 * @constructor
 * @export
 */
brt.background = function() {
};
goog.addSingletonGetter(brt.background);


/**
 * Object containing coverage info about scripts.
 * @type {Object}
 * @export
 */
brt.background.scriptInfo = {};


/**
 * Object containing raw (non-merged) coverage info about scripts.
 * @type {Object}
 * @export
 */
brt.background.rawScriptInfo = {};


/**
 * Performs an XMLHttpRequest to provided URL to load external script.
 * @param {string} url The URL to load.
 * @param {Function} callback If the response from URL has a
 *     HTTP status of 200, this function is called with a text response.
 *     Otherwise, it is called with null.
 * @private
 */
brt.background.prototype.loadScript_ = function(url, callback) {
  goog.net.XhrIo.send(url, function(e) {
      var xhr = e.target;
      var data = xhr.getResponseText();
      callback(data);
  });
};


/**
 * Handles data sent via chrome.extension.sendRequest().
 * @param {Object} request Data sent in the request.
 * @param {Object} sender Origin of the request.
 * @param {Function} callback The method to call when the request completes.
 */
brt.background.prototype.onRequest = function(request, sender, callback) {
  if (sender.tab) {
    var tabId = sender.tab.id;
  }
  switch (request['action']) {
    case brt.constants.ActionType.LOAD_SCRIPT:
      this.loadScript_(request.url, callback);
      break;
    case brt.constants.ActionType.SUBMIT_COVERAGE_INFO:
      var data = request['coverageData'];
      chrome.tabs.getSelected(null, function(tab) {
        brt.coverageHelper.acceptCoverageInfo(tab.id, data);
      });
      callback();
      break;
    case brt.constants.ActionType.SHOW_COVERAGE:
      chrome.tabs.getSelected(null, function(tab) {
        // Old-style coverage report.
        // brt.coverageHelper.showCoverage(tab.id);
        brt.coverageHelper.showCoverageInPopup(tab.id);
      });
      callback();
      break;
  }
};


// Wire up the listener for requests from content scripts.
chrome.extension.onRequest.addListener(goog.bind(
    brt.background.getInstance().onRequest, brt.background.getInstance()));

