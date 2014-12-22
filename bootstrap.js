/*
  Copyright 2014 ispedals

  This file is part of Rikaichan for Android.

  Rikaichan for Android is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 2 of the License, or
  (at your option) any later version.

  Rikaichan for Android is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Rikaichan for Android.  If not, see <http://www.gnu.org/licenses/>.
*/
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");

function isNativeUI() {
  return Services.appinfo.ID === "{aa3c5121-dab2-40e2-81ca-7ea25febc110}";
}

//sandbox for Rikaisama. It's global because it makes it easier to debug
var context;
var menuIcon;

function loadIntoWindow(window) {
  if (!window){
    return;
  }

  var currentWindow = window;

  var gBrowser;
  //gBrowser polyfill for Firefox for Android
  if(isNativeUI()){
    gBrowser = {
      get mCurrentBrowser() {
        return currentWindow.BrowserApp.selectedBrowser;
      },
      get mTabContainer() {
        return currentWindow.BrowserApp.deck;
      },
      get selectedTab(){
        return currentWindow.BrowserApp.selectedTab;
      },
      get addTab() {
        return currentWindow.BrowserApp.addTab.bind(currentWindow.BrowserApp);
      },
      get browsers(){
        return currentWindow.BrowserApp.tabs.map(
            tab => currentWindow.BrowserApp.getBrowserForWindow(tab.window)
          );
      }
    };
  }
  else {
    gBrowser = currentWindow.gBrowser;
  }

  /*
    Rikaisama expects to be running in a chrome window with a loaded document.
    Instead of letting Rikaisama have unfettered access to "window", we only
    expose the properties it expects, so that if things change, things will fail
    faster. Doing it this way also causes Rikaisama to fail silently when it
    attempts to modify the XUL overlay.
    To do this, we load Rikaisama in a sandbox with "context" being the global
    environment.
  */
  context = {
  'window': {
     'addEventListener': function () {
     },
     get content() {
       return gBrowser.mCurrentBrowser.contentWindow;
     },
     get document() {
       return gBrowser.mCurrentBrowser.contentDocument;
     },
     get setTimeout() {
       return currentWindow.setTimeout.bind(currentWindow);
     },
     get clearTimeout() {
       return currentWindow.clearTimeout.bind(currentWindow);
     }
   },
   get setTimeout() {
     return currentWindow.setTimeout.bind(currentWindow);
   },
   get clearTimeout() {
     return currentWindow.clearTimeout.bind(currentWindow);
   },
   get content() {
     return gBrowser.mCurrentBrowser.contentWindow;
   },
   'document': {
     'documentElement': {
     },
     'getElementById': function () {
     }
   },
   'gBrowser': gBrowser,
   //stores the default preferences
   'defaultPreferences': {
   },
   /*
    Default preferences are a file with the preferenceswrapped in a function
    like:
      pref(key, val)
    We exploit this fact and define a global function that assigns the
    preference values to "defaultPreferences"
  */
   'pref': function (key, val) {
     this.defaultPreferences[key] = val;
   },
   //Rikaisama expects these two properties to be available globally
   'Node': Ci.nsIDOMNode,
   'XPathResult': Ci.nsIDOMXPathResult
  };

  context.pref.bind(context);

  //set context.defaultPreferences with the default preferences
  Services.scriptloader.loadSubScript('chrome://alts/content/Rikaisama/defaults/preferences/rikaichan.js', context, 'UTF-8');

  //load rcxConfig
  Services.scriptloader.loadSubScript('chrome://rikaichan/content/config.js', context, 'UTF-8');

  /*
    These methods expect that if a user has not set the preferences, Firefox
    will just return the default preference.
    We wrap these methods to first try to read from the preferences and if
    that fails, return the value stored as the default preference
  */
  ['getString', 'getInt', 'getBool'].forEach(function (func) {
    var oldFunc = context.rcxPrefs.prototype[func];
    context.rcxPrefs.prototype[func] = function (key) {
      try {
        return oldFunc.call(this, key);
      }
      catch (e){
        if (context.defaultPreferences[this.branch.root + key] != null) {
          return context.defaultPreferences[this.branch.root + key];
        }
      }
    };
  });

  //load rcxMain
  Services.scriptloader.loadSubScript('chrome://rikaichan/content/rikaichan.js', context, 'UTF-8');

  //load rcxData
  Services.scriptloader.loadSubScript('chrome://rikaichan/content/data.js', context, 'UTF-8');

  /*
    Rikaisama expects that dictionaries will be installed as addons and that
    they will add themselves to a global variable called rcxDicList. Every
    dictionary must emulate this
  */
  context.rcxDicList = {
    "rikaichan-jpen@polarcloud.com" : {
      'name': "Japanese-English",
      'version': "2.01.141201",
      'id': "rikaichan-jpen@polarcloud.com",
      'hasType': true,
      'isName': false
    }
  };

  //resolve chrome url to dictionary to file path
  const chromeRegistry = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry);
  const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

  var url = ioService.newURI( 'chrome://alts/content/rikaichan-jpen@polarcloud.com/', null, null);
  var path = chromeRegistry.convertChromeURL(url).QueryInterface(Components.interfaces.nsIFileURL).file.path;

  /*
    Rikaisama expects dictionaries to be installed as addons and to be access
    files inside the addon's directory. However, Rikaisama happily loads the
    dictionary database if its provided with a file path, so we do that.
  */
  context.rcxData.dicPath = {
    'ready': true,
    "rikaichan-jpen@polarcloud.com" : path
  };

  //some default preferences for us
  context.defaultPreferences['rikaichan.checkversion'] = false;
  context.defaultPreferences['rikaichan.firsticon'] = false;
  context.defaultPreferences['rikaichan.minihelp'] = false;
  // rikaichan is active for the entire browser window
  context.defaultPreferences['rikaichan.enmode'] = 1;
  // sticky means that the popup is dismissed on only on dblclick
  context.defaultPreferences['rikaichan.startsticky'] = true;

  /*
    even though we set rikaichan.checkversion to false
    this function is still called, so we make it a no-op
  */
  context.rcxMain.checkVersion = function rikaisamaCustomCheckVersion(){};

  //wrap rcxMain.showPopup to add our modifications to the popup window
  var old = context.rcxMain.showPopup;
  context.rcxMain.showPopup = function rikaisamaCustomShowPopup(){
    old.apply(context.rcxMain, arguments);
    var htmlDocument = context.window.content.document;
    var popup = htmlDocument.getElementById('rikaichan-window');

    if(!popup){
      return;
    }

    /*
      By having rikaichan.startsticky set, and therefore having Rikaisama be in
      super-sticky mode, the popup is dismissed on double clicks. Touch devices
      can't cause double clicks, so we make clicks act as double clicks
    */
    if(!popup.hasListener){
      popup.addEventListener("click", function rikaisamaPopupClick(ev) {
        ev.currentTarget.dispatchEvent(new Event("dblclick"));
      }, false);
      popup.hasListener = true;
    }

    /*
      If this is true, these are the text-only messages Rikaisama emits,
      so don't add our tools to it
    */
    if(!popup.firstElementChild){
      return;
    }
    
    popup.style.opacity = "0.9";

    //add our tools
    var tools = htmlDocument.createElement('div');

    /*
      because our tools correspond to keyboard-bound functions, we use the
      existing key bindings to trigger the functions
    */
    var makeKeyboardEvent = function(code){
      return function rikaisamaPopupTool(ev){
        var fakeKeyEvent = { //emulate a key event
          'altKey': false,
          'metaKey': false,
          'ctrlKey': false,
          'shiftKey': false,
          'keyCode': parseInt(code, 10),
          'currentTarget': {
            'rikaichan': context.rcxMain.getBrowser().rikaichan
          },
          'stopPropagation': function(){},
          'preventDefault': function(){}
        };
        ev.stopPropagation();
        //Rikaisama expects keydown to be followed by keyup
        context.rcxMain.onKeyDown(fakeKeyEvent);
        context.rcxMain.onKeyUp(fakeKeyEvent);
      };
    };

    //previous character
    var previous = htmlDocument.createElement('a');
    previous.innerHTML = '\u21E6';
    previous.id = 'rikai-previous';
    previous.href = 'javascript:void(0)';
    previous.style.cssFloat = 'left';
    previous.style.fontSize="xx-large";
    previous.addEventListener("click", makeKeyboardEvent(context.rcxConfig.kbpreviouscharacter), false);
    tools.appendChild(previous);

    //next word
    var next = htmlDocument.createElement('a');
    next.innerHTML = '\u21E8';
    next.id = 'rikai-next';
    next.href = 'javascript:void(0)';
    next.style.cssFloat = 'left';
    next.style.fontSize="xx-large";
    next.addEventListener("click", makeKeyboardEvent(context.rcxConfig.kbnextword), false);
    tools.appendChild(next);

    //save
    var save = htmlDocument.createElement('a');
    save.innerHTML = '\uD83D\uDCBE';
    save.id = 'rikai-save';
    save.href = 'javascript:void(0)';
    save.style.cssFloat = 'right';
    save.style.fontSize="xx-large";
    save.addEventListener("click", makeKeyboardEvent(context.rcxConfig.kbsavetofile), false);
    tools.appendChild(save);

    popup.insertBefore(tools, popup.firstChild);

    var br = htmlDocument.createElement('br');
    br.style.clear='both';
    popup.insertBefore(br, tools.nextSibling);

    //copy to clipboard
    var copy = htmlDocument.createElement('a');
    copy.innerHTML = '\u2702';
    copy.id = 'rikai-copy';
    copy.href = 'javascript:void(0)';
    copy.style.cssFloat = 'right';
    copy.style.fontSize="xx-large";
    copy.addEventListener("click", makeKeyboardEvent(context.rcxConfig.kbcopytoclipboard), false);
    popup.appendChild(copy);


  }.bind(context.rcxMain);

  /*
    Rikaisama expects to be able to set the window onload handler to run
    rcxMain._init. We run this code after load so we call rcxMain._init ourselves
  */
  context.rcxMain._init();

  if(isNativeUI()){
    menuIcon = currentWindow.NativeWindow.menu.add({
      'name': "Rikaichan",
      'checkable': true,
      'callback': function rikaisamaMenuCallback(){
        context.rcxMain.toggle();
        currentWindow.NativeWindow.menu.update(menuIcon, {
          'checked': !!context.rcxMain.enabled
        });
      }
    });
    currentWindow.NativeWindow.menu.update(menuIcon, {'checked': false});
  }
}

function unloadFromWindow(window) {
  if (!window){
    return;
  }

  context.rcxMain.disable(gBrowser.mCurrentBrowser, 1);

  if (isNativeUI()) {
    window.NativeWindow.menu.remove(menuIcon);
  }
}

var windowListener = {
  'onOpenWindow': function(window) {
    var domWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
    function onWindowLoad(){
        domWindow.removeEventListener("load",onWindowLoad);
        if (domWindow.document.documentElement.getAttribute("windowtype") == "navigator:browser"){
          if (isNativeUI() && domWindow && !domWindow.BrowserApp.deck){
            domWindow.addEventListener("UIReady", function onUIReady(){
              domWindow.removeEventListener("UIReady", onUIReady, false);
              loadIntoWindow(domWindow);
            }, false);
          }
          else {
            loadIntoWindow(domWindow);
          }
        }
    }
    domWindow.addEventListener("load",onWindowLoad);
  },
  'onCloseWindow': function(window) {
  },
  'onWindowTitleChange': function(window, title) {
  }
};

function startup(data, reason) {
  var windows = Services.wm.getEnumerator("navigator:browser");

  var domWindow;
  while (windows.hasMoreElements()) {
    domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    if (isNativeUI() && domWindow && !domWindow.BrowserApp.deck){
      domWindow.addEventListener("UIReady", function onUIReady(){
        domWindow.removeEventListener("UIReady", onUIReady, false);
        loadIntoWindow(domWindow);
      }, false);
    }
    else {
      loadIntoWindow(domWindow);
    }
  }

  Services.wm.addListener(windowListener);
}

function shutdown(data, reason) {
  if (reason == APP_SHUTDOWN){
    return;
  }

  Services.wm.removeListener(windowListener);
  var windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    var domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }

  // HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
  //               in order to fully update images and locales, their caches need clearing here
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(data, reason) {
}

function uninstall(data, reason) {
}
