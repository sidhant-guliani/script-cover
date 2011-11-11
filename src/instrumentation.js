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
 * @fileoverview Implements loading of external scripts, instrumentation
 * and generation of accessory script that helps to collect coverage.
 *
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 * @author serebryakov@google.com (Sergey Serebryakov)
 */


goog.provide('brt.content.instrumentation');

goog.require('goog.string.StringBuffer');


/**
 * Adds new object in the scriptObjects array. This array contains all
 * information about scripts that were placed on the webpage which is needed for
 * instrumenting and re-inserting instrumented scripts on the webpage (script
 * file path, initial content, instrumented content, escaped text of
 * instructions line-by-line).
 * @param {boolean} empty Whether this element has no data yet.
 * @param {string} src Source of the script, empty string if it's internal.
 * @param {Object=} data Array of name-value pairs, containing information
 *     about script.
 * @private
 */
brt.content.instrumentation.addScriptObject_ = function(empty, src, data) {;
  var o = {};
  o.empty = empty;
  o.src = src;
  var name = '';
  var value = '';
  if (!empty) {
    for (var i = 0; i < data.length; i++) {
      name = data[i][0];
      value = data[i][1];
      o[name] = value;
    }
  }
  window.scriptObjects.push(o);
};


/**
 * Adds given information to the scriptObjects array. If last element of this
 * array had empty==true, updates this object's members. Otherwise, creates new
 * object with given information as values.
 * @param {Object} data Array of name-value pairs, containing information
 *     about script.
 * @private
 */
brt.content.instrumentation.updateScriptObject_ = function(data) {
  var last = window.scriptObjects.length - 1;

  if (last >= 0 && window.scriptObjects[last].empty) {
    for (var i = 0; i < data.length; i++) {
      var name = data[i][0], value = data[i][1];
      window.scriptObjects[last][name] = value;
    }
    window.scriptObjects[last].empty = false;
  } else {
    brt.content.instrumentation.addScriptObject_(false,
        goog.global.window.location.href + ' (internal script)', data);
  }
};


/**
 * Saves the content of script in the scriptObjects array. Scripts are removed
 * in reversed order, so we save the contents in the array, to instrument them
 * later (iterating backwards to get the normal order). Also information about
 * where the scripts were placed (their DOM parents) is saved in the same
 * array.
 * @param {Element} scriptElement Script element whose content should be saved.
 * @private
 */
brt.content.instrumentation.saveScriptContent_ = function(scriptElement) {
  var data = [['content', scriptElement.innerHTML],
              ['parent', scriptElement.parentNode]];
  brt.content.instrumentation.updateScriptObject_(data);
};


/**
 * Instruments content of script object given as parameter in such way:
 * for semantic block #i, it adds labels:
 * - "//BRT_BLOCK_BEGIN:i" for its begin;
 * - "//BRT_BLOCK_END:i" for its end;
 * - "scriptObjects[index].executedBlock[i] =
 *        (scriptObjects[index].executedBlock[i] ?
 *        scriptObjects[index].executedBlock[i] + 1 : 1);" after its beginning.
 * For example:
 * if (a == 0) {
 *   //BRT_BLOCK_BEGIN:12
 *   scriptObjects[2].executedBlock[12] = (scriptObjects[2].executedBlock[12] ?
 *       scriptObjects[2].executedBlock[12] + 1 : 1);
 *   b = 1;
 *   c = 2;
 *   //BRT_BLOCK_END:12
 * }
 * @param {Object} script Script object whose content should be instrumented.
 * @param {number} index Index of script object in scriptObjects array.
 * @return {Object} Script object with instrumented content.
 * @private
 */
brt.content.instrumentation.instrumentScriptObjectContent_ = function(script,
    index) {
  var scriptContent = script.content;

  // Dealing with <!-- strings.
  scriptContent = scriptContent.replace(/^\s*<\!--/, '');

  // parse() constructs the syntax tree by given JS code.
  // gen_code() generates the JS code by given syntax tree.
  scriptContent = gen_code(parse(scriptContent), true);
  var tokens = scriptContent.split('\n');
  var instrumentedContent = new goog.string.StringBuffer();

  // Counter of instructions in this script.
  var counter = 0;
  // Counter of blocks in this script.
  var blockCounter = 0;
  // Stack for numbers of blocks we are in.
  var blockStack = [];
  // Array containing escaped text of each instruction.
  var commands = [];

  for (var j = 0; j < tokens.length; j++) {
    var trimmedToken = goog.string.trim(tokens[j]);
    if (trimmedToken != '') {
      var concreteToken = tokens[j];
      var includeToAccessory = true;

      if (concreteToken.indexOf('%BRT_BLOCK_BEGIN%') != -1) {
        var blockNumber = ++blockCounter;
        blockStack.push(blockNumber);
        concreteToken = concreteToken.replace('%BRT_BLOCK_BEGIN%',
            '//BRT_BLOCK_BEGIN:' + blockNumber);
      } else if (concreteToken.indexOf('%BRT_BLOCK_COUNTER%') != -1) {
        var blockNumber = blockStack[blockStack.length - 1];
        /*concreteToken = concreteToken.replace('%BRT_SCRIPT_INDEX%', index).
          replace('%BRT_BLOCK_COUNTER%', blockNumber);*/
        concreteToken = concreteToken.replace(
            'window.scriptObjects[%BRT_SCRIPT_INDEX%].' +
            'executedBlock[%BRT_BLOCK_COUNTER%] = true',
            'window.scriptObjects[' + index + '].executedBlock[' + blockNumber +
            '] = (window.scriptObjects[' + index + '].executedBlock[' +
            blockNumber + '] ? window.scriptObjects[' + index +
            '].executedBlock[' + blockNumber + '] + 1 : 1)');
        includeToAccessory = false;
      } else if (concreteToken.indexOf('%BRT_BLOCK_END%') != -1) {
        var blockNumber = blockStack.pop();
        concreteToken = concreteToken.replace('%BRT_BLOCK_END%',
            '//BRT_BLOCK_END:' + blockNumber);
      }

      if (includeToAccessory) {
        commands[++counter] = escape(concreteToken);
      }

      // Prevent misinterpretation of "</script>" string as ending tag.
      concreteToken = concreteToken.replace(/<\/script>/g, '<\\/script>');
      instrumentedContent.append(concreteToken);
      instrumentedContent.append('\n');
    }
  }

  script.instrumented = instrumentedContent.toString();
  script.counter = counter;
  script.commands = commands;
  script.blockCounter = blockCounter;
  return script;
};


/**
 * Sends asynchronous request to the code in background.html, asking to load
 * the external script. That code performs XMLHTTPRequest to the domain and
 * loads the script. Then, callback function inserts loaded content
 * to the innerHTML of <script> and removes its "src" attribute.
 * @param {Element} scriptElement Script element whose content should be loaded.
 * @param {number} index Index of scriptElement in scripts array.
 * @return {boolean} Whether we should break further processing of scripts
 *     waiting until current script is processed.
 * @private
 */
brt.content.instrumentation.requestScriptContent_ = function(scriptElement,
    index) {
  var src = scriptElement.src;

  // Don't process extension scripts.
  if (src.indexOf('chrome-extension://') == 0) {
    return false;
  }

  console.log('Requesting external script ' + src + '...');
  var port = chrome.extension.connect();
  port.postMessage({action: brt.constants.ActionType.LOAD_SCRIPT, url: src});
  port.onMessage.addListener(function(msg) {
    if (msg.response) {
        brt.content.instrumentation.addScriptObject_(true, src);
        scriptElement.removeAttribute('src');
        scriptElement.innerHTML = msg.data;
        brt.content.instrumentation.instrumentScripts_(index);
    }
  });
  return true;
};


/**
 * Iterates through all <script> tags on the page, starting with given index:
 * 1) if it's external script, calls requestScriptContent_;
 * 2) else calls saveScriptContent_ for it, then removes the element.
 * After that, reverses the order of scripts and applies instrumentation to the
 * contents of them.
 * @param {number} index Index of the next unprocessed script.
 * @private
 */
brt.content.instrumentation.instrumentScripts_ = function(index) {
  for (var j = index; j >= 0; j--) {
    var scriptElement = window.allScripts[j];

    if (scriptElement.src) {
      // The content of external script should be loaded, then instrumented.
      // Instrumentation function is called asynchronously in this case,
      // so we should break here and re-run instrumentScripts_() later,
      // when current script will be processed.
      // Without that, the common instruction counter will be broken,
      // if two scripts will be instrumented simultaneously.
      if (brt.content.instrumentation.requestScriptContent_(scriptElement, j)) {
        return;
      }
    } else {
      // In this case instrumentation function is called synchronously.
      brt.content.instrumentation.saveScriptContent_(scriptElement);
      goog.dom.removeNode(scriptElement);
    }
  }

  // By this time, all scripts are processed. But they and their contents are
  // saved in reversed order. Reverse them.
  window.scriptObjects.reverse();

  // Instrumenting the scripts.
  for (var i = 0; i < window.scriptObjects.length; i++) {
    if (window.scriptObjects[i].empty) {
      console.error('Script is empty.');
      console.log(window.scriptObjects[i]);
    }
    window.scriptObjects[i] =
        brt.content.instrumentation.instrumentScriptObjectContent_(
            window.scriptObjects[i], i);
  }

  console.timeEnd('instrumentScripts');
  brt.content.instrumentation.executeScripts_();
};


/**
 * Creates the "accessory" script containing information about other scripts
 * (initialization of variables "counter" and "commands").
 * This script should be the first script to execute after instrumentation.
 */
brt.content.instrumentation.insertAccessoryScript = function() {
  var sb = new goog.string.StringBuffer();

  for (var i = 0; i < window.scriptObjects.length; i++) {
    var script = window.scriptObjects[i];

    sb.append('window.scriptObjects[' + i + '] = {\n');
    sb.append('\'counter\': ' + script.counter + ',\n');
    sb.append('\'blockCounter\': ' + script.blockCounter + ',\n');
    sb.append('\'src\': \'' + script.src + '\',\n');
    sb.append('\'instrumented\': \'' + escape(script.instrumented) + '\',\n');
    sb.append('\'commands\': ' + '[\'\'');
    for (var j = 1; j <= script.counter; j++) {
      sb.append(', \'' + script.commands[j] + '\'');
    }
    sb.append('],\n');
    sb.append('\'executedBlock\': []\n');
    sb.append('};\n');
  }

  window.accessoryScriptText += sb.toString();

  window.accessoryScriptText += 'brt.backgroundInteraction.objectCounter = ' +
      window.scriptObjects.length + ';\n';
  window.accessoryScriptText +=
    'brtOldDocWrite = document.write; document.write = function() {};\n';
  window.accessoryScriptText +=
    'brtOldDocWriteln = document.writeln; document.writeln = function() {};\n';

  var accessoryScript = goog.dom.createElement('script');
  accessoryScript.id = 'accessoryScript';
  accessoryScript.innerHTML = window.accessoryScriptText;
  goog.dom.appendChild(goog.dom.getElementsByTagNameAndClass('head')[0],
      accessoryScript);

  console.log('Accessory script was generated and inserted.');
};


/**
 * Appends all scripts to the head of document, executing them.
 * @private
 */
brt.content.instrumentation.executeScripts_ = function() {
  console.time('executeScripts');

  // For each script new <script> element should be created, then appended
  // to the <head>. "Accessory" script goes first.
  brt.content.instrumentation.insertAccessoryScript();

  // Scripts are coming in normal order.
  for (var i = 0; i < window.scriptObjects.length; i++) {
    var newScript = goog.dom.createElement(goog.dom.TagName.SCRIPT);
    newScript.innerHTML = window.scriptObjects[i].instrumented;

    try {
      goog.dom.appendChild(window.scriptObjects[i].parent, newScript);
    } catch (e) {
      console.log('An exception was caught when inserting the script:');
      console.log(e);
    }

    if (goog.dom.getElementsByTagNameAndClass('body').length == 0) {
      console.warn('Inserting of the instrumented script caused page cleaning');
    }
  }

  console.timeEnd('executeScripts');
  console.log('Instrumentation is done.');
};


/**
 * Applies instrumentation to scripts when the tool is started.
 */
brt.content.instrumentation.applyInstrumentation = function() {
  // String containing the content of the accessory script.
  window.accessoryScriptText = '';
  window.accessoryScriptText += 'window.scriptObjects = [];\n';

  // Array of objects containing info about scripts.
  window.scriptObjects = [];

  // Copying initial script elements.
  window.allScripts = [];
  var scripts = goog.dom.getElementsByTagNameAndClass('script');
  for (var i = 0; i < scripts.length; i++) {
    window.allScripts.push(scripts[i]);
  }
  console.log('Instrumentation is initialized');
  console.time('instrumentScripts');

  brt.content.instrumentation.instrumentScripts_(
      window.allScripts.length - 1);
};

