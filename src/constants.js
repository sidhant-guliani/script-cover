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
 * @fileoverview ScriptCover Tool constants.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 */

goog.provide('brt.constants');


/**
 * Enum of actions handled by the Background script.
 * @enum {string}
 * @export
 */
brt.constants.ActionType = {
  IS_TAB_SELECTED: 'isTabSelected',
  TAB_IS_SELECTED: 'tabIsSelected',
  LOAD_SCRIPT: 'loadScript',
  SUBMIT_COVERAGE_INFO: 'submitCoverageInfo',
  SHOW_COVERAGE: 'showCoverage',
  GET_GLOBAL_COVERAGE_PERCENT: 'getGlobalCoveragePercent',
  GET_GLOBAL_COVERAGE_PERCENT_TO_POPUP: 'getGlobalCoveragePercentToPopup'
};


/**
 * Enum of events fired from the page by the tool.
 * @enum {string}
 * @export
 */
brt.constants.EventType = {
  BEFORE_UNLOAD: 'beforeunload',
  COLLECT_PERIODIC_COVERAGE: 'collectPeriodicCoverage',
  SUBMIT_COVERAGE_INFO: 'submitCoverageInfo',
  SHOW_COVERAGE: 'showCoverage'
};

