## Objective ##

[ScriptCover](https://code.google.com/p/script-cover/) is a Javascript coverage analysis tool which is implemented as a Chrome extension. It provides line-by-line (and per instructions) Javascript code coverage statistics for web pages in real time without any user modifications required. The results are collected when the page loads and then when users interact with the page. These results can be viewed with general overall coverage scores and for each external/internal script by highlighting those lines that were run.

## Background ##

The tool’s broad scope is attractive for both testers and developers by providing data used in a variety of common techniques for debugging, analysis, and exploration. The most useful applications are the following:
  * Manual testing. The coverage results provided by the tool help one understand how much of the application has been covered while exploratory testing.
  * Automated testing. Javascript coverage by automated integration UI tests are hard to get. [ScriptCover](https://code.google.com/p/script-cover/) can be used to collect these statistics automatically. The use of Javascript coverage in automated UI tests such as WebDriver provides some sort of indication of how well an application is tested.
  * Debugging issues and code understanding. [ScriptCover](https://code.google.com/p/script-cover/) provides a mechanism for dynamic tracking which portions of JavaScript code have been executed in a given page. The tool can be also used for identifying dead/obsolete code and verifying that code does not ship with hidden or deprecated functionality.
  * Code reduction/isolation. [ScriptCover](https://code.google.com/p/script-cover/) helps developers to isolate code that contributes to a bug. The detailed coverage report for internal and external scripts is useful for identifying an application’s components and functionalities that were not covered while testing and can be safely removed while debugging.<br>
In comparison with several other tools, <a href='https://code.google.com/p/script-cover/'>ScriptCover</a> has a number of advantages:<br>
</li></ul><ol><li>because of built-in code formatting, in most cases it provides coverage for logical JavaScript statements rather than physical lines of original code;<br>
</li><li>it instruments not only external scripts, but internal scripts as well;<br>
</li><li>user doesn't have to save web pages locally in a predefined directory and then modify them (e.g. changing absolute URLs to external scripts to relative URLs). <br></li></ol>

## Overview ##

[ScriptCover](https://code.google.com/p/script-cover/) consists of two main components - Google Chrome extension and instrumentation HTTP proxy server:
  * _Chrome extension_ is the client part of the tool which is implemented in JavaScript and has three parts: background script (including popup), content script and the script which is injected into the inspected web page.
  * _Proxy server_ is an optional component. It requires the use of a special version of the extension that is compatible with the proxy. The proxy server and compatible Chrome extension will be checked in to the open source project later.<br>
In its basic (non-proxy) implementation, <a href='https://code.google.com/p/script-cover/'>ScriptCover</a> performs code analysis by means of introducing markers inside the code loaded in the browser.<br>
As a result, part of JavaScript code from a page is executed twice: once as intended to be used by the page and once as instrumented by the tool.<br>
Because of this there may be cases when the tool doesn't provide absolute accuracy.<br>
However, a proxy implementation of <a href='https://code.google.com/p/script-cover/'>ScriptCover</a> extension allows the instrumenting of code before it's loaded in the browser.<br>
The proxy approach eliminates the first execution of non-instrumented JavaScript code, and only the instrumented bits are executed within the page. <br>
This provides accurate coverage statistics for internal and external Javascript code.</li></ul>

<h2>Detailed Design</h2>

<h3>Chrome extension component</h3>

<b>Injected script</b>

This script is injected into the webpage and executed in its context, having access to all variables and functions of the page. Because coverage data is initially collected in the context of the webpage, injected script is required to send this data to background script.<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/backgroundInteraction.js'>backgroundInteraction.js</a> - Implements communication between background and content scripts. The coverage data is put into the special hidden <code>&lt;div&gt;</code> container in the web page. After that, event notifications are sent to the content script which extracts data from the hidden <code>&lt;div&gt;</code>.<br>
<br>
<b>Content script</b>

Content script is executed on every page, but it is unable to use page's variables because of the "isolated worlds" concept. Nevertheless, it has access to page's DOM.<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/scriptLoader.js'>scriptLoader.js</a> - Contains functions that wire listeners for event notifications produced by injected scripts, insert injected scripts and initialise extension-wide variables.<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/instrumentation.js'>instrumentation.js</a> - Implements loading of external scripts, instrumentation and generation of an accessory/helper script to collect coverage. It loads all external scripts (<code>&lt;script src=”...”&gt;</code>) (sending request to background page, which is able to load external files via XMLHttpRequest), sets their innerHTML property to their content, whilst the src attribute is removed.  All scripts are formatted and instrumented using third-party library UglifyJS by Mihai Bazon (see details of instrumentation below). Finally, the accessory/helper script that initialises a data structure composed of data about the script objects and coverage is generated and added to the webpage.<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/startTool.js'>startTool.js</a> -  Initiates inserting of injected scripts into the web page. After the injected scripts are loaded, instrumentation is started.<br>
<br>
<b>Detailes</b>

Instrumentation is performed in the following way:<br>
A “semantic block” is defined as any part of code that is body of function, or body of cycle, or body of “if” or “else” statements. The whole script is a semantic block. Blocks can be nested.<br>
For semantic block #i in script with index <code>index</code>, labels are added:<br>
<pre><code>"//BRT_BLOCK_BEGIN:i" at its beginning;<br>
"//BRT_BLOCK_END:i" at its end;<br>
</code></pre>
also the instrumentation instruction is added at its beginning:<br>
<pre><code>"scriptObjects[index].executedBlock[i] = (scriptObjects[index].executedBlock[i] ? scriptObjects[index].executedBlock[i] + 1 : 1);".<br>
</code></pre>
This instruction checks whether the execution counter for this block was initialized. If it was, it increments, otherwise sets to 1. When a block of code is executed in a browser, corresponding execution counter is updated.<br>
<br>
For example:<br>
<pre><code>if (a == 0) {<br>
 //BRT_BLOCK_BEGIN:12<br>
 scriptObjects[2].executedBlock[12] = (scriptObjects[2].executedBlock[12] ? scriptObjects[2].executedBlock[12] + 1 : 1);<br>
 b = 1;<br>
 c = 2;<br>
 //BRT_BLOCK_END:12<br>
}<br>
</code></pre>

<b>Background script</b>

Background script is a script that is executed on the extension’s background page. As only the background page of Chrome extension can perform cross-domain XMLHttpRequest, it handles all requests to other domains (for example, loading of external JavaScript files).<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/showCoverageHelper.js'>showCoverageHelper.js</a> - Performs aggregation of coverage data and constructs the coverage report. There is a full coverage report which opens in a new browser tab, or short report displayed in Chrome extension popup.<br>
<br>
Coverage data structure has the following format:<br>
<ul><li><i>scriptInfo</i> is array-like object of <i>tabScriptInfo</i>
<ul><li><i>tabScriptInfo</i> is array of <i>pageScriptInfo</i>
<ul><li><i>pageScriptInfo</i> is object with fields:<br>
<ul><li><i>url</i> (string) is URL of the webpage<br>
</li><li><i>scriptObjects</i> is array-like object of <i>scriptObject</i>
<ul><li><i>scriptObject</i> is object with fields:<br>
<ul><li><i>src</i> (string) - source of the script<br>
</li><li><i>counter</i> (number) - number of lines in beautified script<br>
</li><li><i>commands</i> (1-based array of strings, the last element has index counter) - lines of formatted script (in URL-escaped form)<br>
</li><li><i>instrumented</i> (string) - whole instrumented body of script<br>
</li><li><i>blockCounter</i> (number) - number of semantic blocks<br>
</li><li><i>executedBlock</i> (1-based array of numbers, the last element has index blockCounter) - execution counters for blocks</li></ul></li></ul></li></ul></li></ul></li></ul></li></ul>

In the full coverage report, executed lines of code are colored green and the execution counter is displayed for every line of code. User can show and hide report for every script clicking on its header.<br>
<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/background.js'>background.js</a> - Contains functions that load external files on demand, handle requests coming from content scripts, initialise extension-wide objects.<br>
<a href='http://code.google.com/p/script-cover/source/browse/src/popup.js'>popup.js</a> - Initializes popup instance, displays total coverage statistics on Chrome extension badge, displays short coverage report in popup on user demand, initiates displaying of full report if user clicks on appropriate link. It also provides possibility to track/untrack selected scripts and recalculate total coverage for only tracked scripts. The coverage statistics are received by popup from background script.<br>
<br>
<br>
<b>Proxy component</b> (to be checked in later)<br>
<br>
HTTP proxy component intercepts all communication between the web browser and the web server, performing instrumentation on-the-fly. Browser can be configured to use this proxy and then transparently get instrumented scripts. Below is the scheme of instrumentation process when a JavaScript file is requested by the browser:<br>
<ul><li>An HTTP request from the web browser is intercepted by the proxy.<br>
</li><li>The proxy creates a new HTTP request and sends it to the destination.<br>
</li><li>The website responses with the corresponding file.<br>
</li><li>The proxy determines whether or not the file contains JavaScript and uses the parser to parse the source code.<br>
</li><li>The instrumentation code is injected into original script.<br>
</li><li>The resulting instrumented JavaScript file is sent to the web browser.</li></ul>

