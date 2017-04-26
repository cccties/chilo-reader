# chilo-reader

## Outline

CHiLO Reader is a dedicated e-book reader for CHiLO Books created based on [readium-is-viewer](https://github.com/readium/readium-js-viewer "readium-is-viewer").   
Two types are available: one is "chilo-cordova"; an app to install on Android devices, and the other is "Cloud CHiLO Reader"; a dedicated online script to put the CHiLO Reader on the web server to enable browsing CHiLO Books on the internet.

This release includes the following directory:  
* readium-js-viewer  |  File modified for CHiLO Reader from readium-js-viewer  
* chilo-cordova    |   Android Cordova version CHiLO Reader App

## Developing environment

* The build was done by running the command line using Ubuntu 14.04 LTS  
* Cloud CHiLO Reader was tested in Windows version Chrome browser.  
* Debugged using Windows version Chrome Developer Tools by connecting Android devices via Windows' USB port

## readium-js-viewer

"readium-js-viewer" directory is adding the following modifications to https://github.com/readium/readium-js-viewer for CHiLO Reader engine  
* Generate readium-js-viewer_all_CHILO.js
* Add mobile-detect as npm module
* Add UI for CHiLO to template file
* Small-scale changes in some JavaScript files

Before starting, get the readium-js-viewer source in github then overwrite the modification source in the readium-js-viewer directory

Before running build, initialize the build environment with the following command:  
 $ npm run prepare

Running the following command, CSS, images, and JavaScript files are created under dist/chilo:  
 $ npm run dist

About installation of essential command for running build, see the following page:  
https://github.com/readium/readium-js-viewer/

When readium-js-viewer in github updates and build cannot be done, alter appropriately the source modified for CHiLO Reader engine.

## chilo-cordova

"chilo-cordova" is an app directory including Android platform created with cordova command adding the following modifications:  
* Copy readium-js-viewer dist/chilo to www/reader_script
* Add www/index.html, www/reader.html, www/reader_script/chilo
* Modify CordovaLib Java file for Android platform to small-scale

To build chilo-cordova, the following system is necessary:  
* node, npm
* Java
* Android SDK

First, prepare npm command. Next, install cordova with the following command:  
 $ npm install -g cordova

For installation of Java and Android SDK, refer to the following information:  
https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html

Build chilo-cordova with the following command:  
 $ cordova build

When built, the following APK file is created:  
 platforms/android/build/outputs/apk/android-debug.apk

When readium-js-viewer is modified, build chilo-cordova after copying  dist/chilo of readium-js-viewer to www/reader_script.

## chilo-cordova APK

APK file created with chilo-cordova is the CHiLO Reader App.

Refer to the following for the usage of the app:  
http://docs.cccties.org/en/downloading/chilo-reader/

## Cloud CHiLO Reader

The www directory of chilo-cordova functions as "Cloud CHiLO Reader" when deployed on the web server without change.

To import the CHiLO Book created with the CHiLO Producer located in github before deployment, redirect the path written in www/reader_script/chilo/chilo_index_body.js to Cloud CHiLO Reader  
e.g.) reader_script/ -> //example.net/reader_script/

Also, redirect the path written in index.html,reader.html of the CHiLO Producer extension directory within github to the location of Cloud CHiLO Reader.

About CHiLO Producer, refer to the following:
https://github.com/cccties/chilo-producer

## Licensing

We offer CHiLO Producer under the license of ApacheLicense2.0. (See [LICENSE.txt](LICENSE.txt)) 

## Copyright

Copyright © 2016 NPO CCC-TIES
