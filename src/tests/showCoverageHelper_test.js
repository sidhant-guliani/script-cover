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
 * @fileoverview Tests for the code in the showCoverageHelper.js file.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 */


goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.recordFunction');


var stubs_ = new goog.testing.PropertyReplacer();
var mockControl_ = null;
var emptyFunction = function() {};


function setUp() {
  initChrome();
  mockControl_ = new goog.testing.MockControl();
}


function tearDown() {
  mockControl_.$tearDown();
  mockControl_ = null;
  stubs_.reset();
}


function testShowCoverage() {
  brt.background = {};
  brt.background.scriptInfo = {};
  brt.background.scriptInfo[10] = {};
  stubs_.set(goog.style, 'showElement', emptyFunction);
  stubs_.set(brt.coverageHelper, 'constructReportDiv', emptyFunction);
  var soyRecorder = goog.testing.recordFunction();
  stubs_.set(soy, 'renderElement', soyRecorder);

  mockControl_.$replayAll();
  brt.coverageHelper.showCoverage(10);
  mockControl_.$verifyAll();

  assertEquals(1, soyRecorder.getCallCount());
  var args = soyRecorder.getLastCall().getArguments();
  assertEquals(brt.content.Templates.coverageReport.all, args[1]);
}


function testShowCoverageInPopupWithoutTabScriptInfo() {
  brt.background = {};
  brt.background.scriptInfo = {};
  brt.background.scriptInfo[1] = {};

  mockControl_.$replayAll();
  brt.coverageHelper.showCoverageInPopup(1);
  mockControl_.$verifyAll();
  assertEquals('0', brt.coverageHelper.globalCoveragePercent);
  assertEquals('0', brt.coverageHelper.globalCoveragePercentLast);
}


function testShowCoverageInPopupWithTabScriptInfo() {
  brt.background = {};
  brt.background.scriptInfo = {};
  brt.background.scriptInfo[1] = [
      {scriptObjects: [{blockCounter: 20, counter: 137,
      commands: ['', '//BRT_BLOCK_BEGIN%3A1', '//BRT_BLOCK_END%3A11'],
      executedBlock: [0, 1, 1],
      'instrumented': '//BRT_BLOCK_BEGIN%3A1//BRT_BLOCK_END%3A11'}],
      url: 'http://www.google.nl/'}];
  var seeDetailsLink = goog.dom.getElement('fileStatsTitle');
  stubs_.set(goog.dom.getDocument(), 'querySelector',
             function() {return fileStatsTitle});

  brt.coverageHelper.showCoverageInPopup(1);
  assertEquals('100.0', brt.coverageHelper.globalCoveragePercent);
  assertEquals('100.0', brt.coverageHelper.globalCoveragePercentLast);
}


function testShowHideStatsWithoutAnnotatedSource() {
  var element = goog.dom.createDom(goog.dom.TagName.DIV);

  element.style.display = 'block';
  brt.coverageHelper.showHideStats_(element, '');
  assertEquals('none', goog.style.getStyle(element, 'display'));

  brt.coverageHelper.showHideStats_(element, '');
  assertEquals('block', goog.style.getStyle(element, 'display'));
}


function testShowHideStatsWithAnnotatedSource() {
  var element = goog.dom.createDom(goog.dom.TagName.DIV);
  var srcElement = goog.dom.createDom(goog.dom.TagName.DIV);
  var coverageDom = new goog.dom.DomHelper(goog.dom.getDocument());
  brt.coverageHelper.showHideStats_(element, 'annotatedSource', srcElement,
      coverageDom);
  assertEquals('block', goog.style.getStyle(element, 'display'));
  assertEquals('annotatedSource', element.innerHTML);
}

