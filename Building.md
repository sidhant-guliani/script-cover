### Download dependencies using build.py ###

The [ScriptCover](https://code.google.com/p/script-cover/) extension comes with a **'build.py'** file, which will automatically download the required external dependencies and use the closure compiler to build the scripts. This will create a directory named 'build'.

Prerequisites (before running build.py):
  * git (to clone the project)
  * svn client
  * java
  * python (windows: add python path to system properties)

### Load extension in Google Chrome ###

Load the 'build' directory as an extension in Google Chrome: go to chrome://extensions/, press 'Load Unpacked Extension', and select the 'build' folder. That's it!

### How to manually download dependencies ###
If build.py is not working, you can try manually downloading the dependencies.

The code for [ScriptCover](https://code.google.com/p/script-cover/) is written using Closure Library, and must be compiled with the Closure Compiler. Get the compiler and library from [http://code.google.com/closure/](http://code.google.com/closure/)

Soy templates are also used in [ScriptCover](https://code.google.com/p/script-cover/). Download the soy template compiler from [http://code.google.com/closure/templates/docs/javascript\_usage.html](http://code.google.com/closure/templates/docs/javascript_usage.html)

