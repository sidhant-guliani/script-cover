1. In basic implementation of [ScriptCover](https://code.google.com/p/script-cover/) there may be rare cases when a certain functionality of web applications may not work properly. This is caused by the fact that scripts are executed twice: once as intended to be used by the page and once as instrumented by the tool. This issue doesn’t happen with proxy implementation of [ScriptCover](https://code.google.com/p/script-cover/) (which is to be open sourced later).

Explanation: We have adopted several approaches to instrumenting Javascript code.
In its basic implementation [ScriptCover](https://code.google.com/p/script-cover/) performs code analysis by means of introducing markers inside the JavaScript code loaded in browser. As a result, the JavaScript on a page is executed twice: once as intended to be used by the page and once as instrumented by the tool. Because of this, there may be cases when the extension provides very high, but not absolute accuracy. In some cases this may also cause issues in the web page.
However, there is a proxy implementation of the [ScriptCover](https://code.google.com/p/script-cover/) extension which allows the instrumenting of code before it's loaded in the browser. The proxy approach eliminates the first execution of non-instrumented JavaScript code, and only the instrumented bits are executed within the page. This provides accurate coverage statistics for internal and external Javascript code. Note that proxy implementation doesn’t work for HTTPS.


2. ScriptCover makes web page loading slower. We suggest to activate it only to inspect certain pages. We are considering adding start and stop buttons to the tool's popup in the future.


3. Previously in a coverage report the coverage statistics data was provided for all web pages visited in a certain tab. If you wanted to refresh the coverage statistics report, you had to start in a new browser tab.
Now we do it only for one individual page, so that collection of statistics starts after each page reload. We are considering changing this behavior soon, so that coverage statistics will be collected for all pages in the same domain opened in a certain browser tab.