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
 * @fileoverview Tests for the code on the popup.js file.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 */


goog.require('brt.constants');
goog.require('goog.style');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.recordFunction');


var stubs_ = new goog.testing.PropertyReplacer();
var mockControl_ = null;
var popup_ = null;
var emptyFunction = function() {};


function setUp() {
  initChrome();
  popup_ = new brt.popup();
  mockControl_ = new goog.testing.MockControl();
}


function tearDown() {
  mockControl_.$tearDown();
  mockControl_ = null;
  stubs_.reset();
}


function testInit() {
  var soyRecorder = goog.testing.recordFunction();
  stubs_.set(soy, 'renderElement', soyRecorder);

  mockControl_.$replayAll();
  popup_.init();
  mockControl_.$verifyAll();

  assertEquals(1, soyRecorder.getCallCount());
}


function testSetPopupHandler() {
  var seeDetailsLink = goog.dom.getElement('seeDetails');
  var listenRecorder = goog.testing.recordFunction();
  stubs_.set(goog.events, 'listen', listenRecorder);
  stubs_.set(goog.dom.getDocument(), 'querySelector',
             function() {return seeDetailsLink});

  popup_.setPopupHandler_();

  var clickEvent = new goog.events.Event(goog.events.EventType.CLICK);
  goog.events.fireListeners(seeDetailsLink, goog.events.EventType.CLICK,
      false, clickEvent);
  assertEquals(2, listenRecorder.getCallCount());
  var args = listenRecorder.getLastCall().getArguments();
  assertEquals(seeDetailsLink, args[0]);
  assertEquals(goog.events.EventType.CLICK, args[1]);
}


function testDisplayFileStatsWithoutFileStats() {
  var getElementRecorder = goog.testing.recordFunction();
  stubs_.set(goog.dom, 'getElement', getElementRecorder);
  stubs_.set(goog.style, 'showElement', emptyFunction);
  var soyRecorder = goog.testing.recordFunction();
  stubs_.set(soy, 'renderElement', soyRecorder);

  popup_.displayFileStats_();

  assertEquals(1, soyRecorder.getCallCount());
  assertEquals(3, getElementRecorder.getCallCount());
  var args = getElementRecorder.getLastCall().getArguments();
  assertEquals('fileStats', args[0]);
}


function testDisplayFileStatsWithFileStats() {
  var soyRecorder = goog.testing.recordFunction();
  stubs_.set(soy, 'renderElement', soyRecorder);
  stubs_.set(soy, 'renderAsFragment', soyRecorder);
  stubs_.set(popup_, 'getFileName_', emptyFunction);
  stubs_.set(goog.dom, 'appendChild', emptyFunction);
  stubs_.set(popup_, 'changeFileCoveragePercentElemColor_', emptyFunction);
  stubs_.set(popup_, 'setCheckboxHandler_', emptyFunction);
  popup_.fileStats_ = [1, 2, 3];

  popup_.displayFileStats_();

  assertEquals(4, soyRecorder.getCallCount());
  var args = soyRecorder.getLastCall().getArguments();
  assertEquals(brt.content.Templates.popup.fileStats, args[0]);
}


function testGetFileNameFromLongString() {
  var longName =
      'very_long_file_name_even_a_little_bit_longer_than_50_characters';
  var shortenedName = 'very_long_file_name_even_a_little_bit_longer_than_5...';
  popup_.fileStats_ = [{fileName: 'short_name'}, {fileName: longName}];
  var fileName = popup_.getFileName_(1);
  assertEquals(shortenedName, fileName);
}


function testGetFileNameFromShortString() {
  popup_.fileStats_ = [{fileName: 'short_name'}];
  var fileName = popup_.getFileName_(0);
  assertEquals('short_name', fileName);
}


function testChangeFileCoveragePercentElemColor() {
  var seeDetailsLink = goog.dom.getElement('seeDetails');
  seeDetailsLink.style.color = 'black';
  stubs_.set(goog.dom.getDocument(), 'querySelectorAll',
             function() {return [seeDetailsLink]});
  popup_.fileStats_[0] = {coveragePercent: 51};

  popup_.changeFileCoveragePercentElemColor_(0);
  assertEquals('green', goog.style.getStyle(seeDetailsLink, 'color'));
}


function testUntracking() {
  var seeDetailsLink = goog.dom.getElement('seeDetails');
  seeDetailsLink.style.color = 'black';
  stubs_.set(goog.dom.getDocument(), 'querySelectorAll',
             function() {return [seeDetailsLink]});
  stubs_.set(popup_, 'getCurrentGlobalCoverage_',
             emptyFunction);
  popup_.fileStats_[0] = {tracked: true};

  popup_.changeTracking_(0);
  assertEquals('grey', goog.style.getStyle(seeDetailsLink, 'color'));
  assertEquals(false, popup_.fileStats_[0].tracked);
  assertEquals('0', seeDetailsLink.innerHTML);
}


function testTracking() {
  var seeDetailsLink = goog.dom.getElement('fileStatsTitle');
  fileStatsTitle.style.color = 'grey';
  fileStatsTitle.checked = true;
  stubs_.set(goog.dom.getDocument(), 'querySelectorAll',
             function() {return [fileStatsTitle]});
  stubs_.set(popup_, 'getCurrentGlobalCoverage_',
             emptyFunction);
  stubs_.set(popup_, 'changeFileCoveragePercentElemColor_',
             emptyFunction);
  popup_.fileStats_[0] = {tracked: false, commandCounter: 55};

  popup_.changeTracking_(0);
  assertEquals('black', goog.style.getStyle(fileStatsTitle, 'color'));
  assertEquals(true, popup_.fileStats_[0].tracked);
  assertEquals('55', fileStatsTitle.innerHTML);
}


function testGetCurrentGlobalCoverage() {
  var seeDetailsLink = goog.dom.getElement('fileStatsTitle');
  stubs_.set(goog.dom.getDocument(), 'querySelector',
             function() {return fileStatsTitle});
  popup_.fileStats_[0] = {
    tracked: true,
    commandCounter: 10,
    executedCounter: 5
  };
  popup_.fileStats_[1] = {
    tracked: false,
    commandCounter: 55,
    executedCounter: 20
  };
  popup_.fileStats_[2] = {
    tracked: true,
    commandCounter: 10,
    executedCounter: 10
  };

  popup_.getCurrentGlobalCoverage_();
  assertEquals('75.0%', fileStatsTitle.innerHTML);
}


function testGetCurrentGlobalCoverageForNoTrackedStats() {
  var seeDetailsLink = goog.dom.getElement('fileStatsTitle');
  stubs_.set(goog.dom.getDocument(), 'querySelector',
             function() {return fileStatsTitle});
  popup_.fileStats_[0] = {
    tracked: false,
    commandCounter: 10,
    executedCounter: 5
  };
  popup_.fileStats_[1] = {
    tracked: false,
    commandCounter: 55,
    executedCounter: 20
  };

  popup_.getCurrentGlobalCoverage_();
  assertEquals('0%', fileStatsTitle.innerHTML);
}

