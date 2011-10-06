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
 * @fileoverview Starts the tool.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 * @author serebryakov@google.com (Sergey Serebryakov)
 */


goog.provide('brt.content.startTool');

goog.require('brt.content.instrumentation');
goog.require('brt.loader');


/**
 * Starts the tool adding required resources to web page, applying
 * instrumentation to javascript code.
 */
brt.content.startTool.start = function() {
  var loader = new brt.loader();
  loader.addResourcesToPage();
  goog.events.listen(goog.dom.getElement('injectedScript'), 'load',
      brt.content.instrumentation.applyInstrumentation, true);
};


brt.content.startTool.start();

