function isNativeUI() { return (Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}"); }

function showToast(aWindow, message) { aWindow.NativeWindow.toast.show(message, "short"); }

var gRikaichanMenuId = null;

function watchTab(aEvent) {
	// the target is a XUL browser element
	var browser = aEvent.target;
	state_manager._init(browser.contentWindow);
}

var state_manager = {
	current_window:null, //native window
	
	toggle: function (window) {
		if(rcxMain.enabled) { 
			showToast(window, "Rikaichan disabled");			
			this.disable(window);
		}
		else {
			this.init(window);
		}
	}, 
	
	//called when document has changed but rikaichan is enabled
	// setups of rikaichan with the new document
	_init: function (DOMwindow) {
		//DOMwindow can be both the chrome window or a DOM window
		if(!(DOMwindow.document instanceof DOMwindow.HTMLDocument) || DOMwindow.frameElement) { return;}
		var browser =  this.current_window.BrowserApp.selectedBrowser;
		rcxMain.disable();
		rcxMain.popup_window.getBrowser=function() { return  browser; };
		rcxMain.enable();
	},
	
	//for native UI
	init: function (window) {
		var aWindow = window;
		rcxMain.popup_window.getBrowser=function() { return aWindow.BrowserApp.selectedBrowser;  };
		rcxMain.enable(aWindow.BrowserApp.selectedTab.window.document);
		showToast(window, "Rikaichan enabled");
		aWindow.BrowserApp.deck.addEventListener("TabSelect", watchTab, false);
		this.current_window = aWindow;
	},
	
	desktop_init: function (window) {
		var aWindow = window;
		var browser = aWindow.gBrowser.mCurrentBrowser;
		rcxMain.popup_window.getBrowser=function() { return browser; };
		rcxMain.enable(browser.contentWindow.document);
		browser.contentWindow.addEventListener("unload", rcxMain.disable, false);
	},

	//only needs to be called when in NativeUI
	// removes the various listeners attached to chrome
	disable: function (window) {
		rcxMain.disable();
		window.BrowserApp.deck.removeEventListener("TabSelect", watchTab, false);
		this.current_window = null;
	}
	
};

function loadIntoWindow(window) {
	if (!window)
		return;
	
	if(isNativeUI()){
		gRikaichanMenuId = window.NativeWindow.menu.add("Rikaichan", null, function() { state_manager.toggle(window); });
		log = function (message) { 
			showToast(window, message);
		}
	}
	else {
		state_manager.desktop_init(window);
	}
}

function unloadFromWindow(window) {
	if (!window)
		return;
	rcxMain.disable();
	rcxConfigListener.unregister();
	if (isNativeUI()) {
		window.NativeWindow.menu.remove(gRikaichanMenuId);
		state_manager.disable();
	}
	resourceURI = null;
}


/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(aWindow) {
  },
  
  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function startup(aData, aReason) {
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  resourceURI = aData.resourceURI;
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
	Services.prefs.deleteBranch(PREF_ROOT);
}