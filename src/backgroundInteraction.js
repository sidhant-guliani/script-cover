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
 * @fileoverview This script is injected and executed in the webpage. It
 * contains functions performing interaction with background page through
 * the content scripts.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 * @author serebryakov@google.com (Sergey Serebryakov)
 */

goog.provide('brt.backgroundInteraction');

goog.require('brt.constants');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.json');


/**
 * Number of script objects on the page.
 * @type {number}
 * @export
 */
brt.backgroundInteraction.objectCounter = 0;


window.scriptObjects = [];


/**
 * Fires the event with specified name and dispatches it from container <div>.
 * @param {string} eventName The name of event.
 * @private
 */
brt.backgroundInteraction.fireEvent_ = function(eventName) {
  var containerDiv = goog.dom.getElement('coverageContainerDiv');
  var event = goog.global.document.createEvent('Event');
  event.initEvent(eventName, true, true);
  containerDiv.dispatchEvent(event);
};


/**
 * Passes information about script execution to content script. Description of
 * this information is in instrumentation.js. This function is called before
 * page unloading and before showing coverage.
 * @export
 */
brt.backgroundInteraction.submitCoverageInfo = function() {
  var data = {};
  data.url = goog.global.location.href;
  data.scriptObjects = window.scriptObjects;
  var coverageContainerDiv = goog.dom.getElement('coverageContainerDiv');
  if (coverageContainerDiv) {
    coverageContainerDiv.innerHTML = goog.json.serialize(data);
    brt.backgroundInteraction.fireEvent_(
        brt.constants.EventType.SUBMIT_COVERAGE_INFO);
  }
};


/**
 * Submits coverage information and lets the content script know that coverage
 * should be shown, when user presses the "Show coverage" button.
 * @export
 */
brt.backgroundInteraction.showCoverage = function() {
  brt.backgroundInteraction.submitCoverageInfo();
  brt.backgroundInteraction.fireEvent_(brt.constants.EventType.SHOW_COVERAGE);
};


/**
 * Sets before unload event listener which starts to collect initial coverage.
 */
brt.backgroundInteraction.setBeforeUnloadHandler = function() {
  goog.events.listen(goog.dom.getDocument(),
      brt.constants.EventType.BEFORE_UNLOAD,
      brt.backgroundInteraction.showCoverage, true);

  var coverageContainerDiv = goog.dom.getElement('coverageContainerDiv');
  if (coverageContainerDiv) {
    goog.events.listen(coverageContainerDiv,
        brt.constants.EventType.COLLECT_PERIODIC_COVERAGE,
        brt.backgroundInteraction.showCoverage, true);
  }
};


goog.events.listen(goog.global.document, 'click',
    brt.backgroundInteraction.showCoverage, true);

brt.backgroundInteraction.setBeforeUnloadHandler();

