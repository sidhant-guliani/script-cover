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
 * @fileoverview Tests for the code on the background.js file.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 */


goog.require('brt.constants');
goog.require('goog.net.XhrIo');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.net.XhrIo');


var stubs_ = new goog.testing.PropertyReplacer();
var mockControl_ = null;
var background_ = null;
var emptyFunction = function() {};


function setUp() {
  initChrome();
  background_ = new brt.background();
  mockControl_ = new goog.testing.MockControl();
}


function tearDown() {
  mockControl_.$tearDown();
  mockControl_ = null;
  stubs_.reset();
}


function testOnConnectLoadScript() {
  stubs_.replace(goog.net.XhrIo, 'send', goog.testing.net.XhrIo.send);
  var msg = {};
  msg.action = brt.constants.ActionType.LOAD_SCRIPT;
  msg.url = 'http://google.com';
  var port = {};
  port.onMessage = {};
  port.onMessage.addListener = emptyFunction;
  mockControl_.$replayAll();
  background_.onConnect(port);
  mockControl_.$verifyAll();
}


function testOnConnectShowCoverage() {
  var msg = {};
  msg.action = brt.constants.ActionType.SHOW_COVERAGE;
  var port = {};
  port.onMessage = {};
  port.onMessage.addListener = emptyFunction;
  stubs_.set(brt.coverageHelper, 'showCoverageInPopup', emptyFunction);
  mockControl_.$replayAll();
  background_.onConnect(port);
  mockControl_.$verifyAll();
}


function testOnConnectSubmitCoverage() {
  var msg = {};
  msg.action = brt.constants.ActionType.SUBMIT_COVERAGE_INFO;
  msg.coverageData = 'http://google.com';
  var port = {};
  port.onMessage = {};
  port.onMessage.addListener = emptyFunction;
  stubs_.set(brt.coverageHelper, 'acceptCoverageInfo', emptyFunction);
  mockControl_.$replayAll();
  background_.onConnect(port);
  mockControl_.$verifyAll();
}

