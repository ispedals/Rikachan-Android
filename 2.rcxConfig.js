/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PrefListener(branch_name, callback) {
  // Keeping a reference to the observed preference branch or it will get
  // garbage collected.
  this._branch = Services.prefs.getBranch(branch_name);
  this._branch.QueryInterface(Ci.nsIPrefBranch2);
  this._callback = callback;
}
 
PrefListener.prototype.observe = function(subject, topic, data) {
  if (topic == 'nsPref:changed')
    this._callback(this._branch, data);
};
 
/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(trigger) {
  this._branch.addObserver('', this, false);
  if (trigger) {
    let that = this;
    this._branch.getChildList('', {}).
      forEach(function (pref_leaf_name)
        { that._callback(that._branch, pref_leaf_name); });
  }
};
 
PrefListener.prototype.unregister = function() {
  if (this._branch)
    this._branch.removeObserver('', this);
};


function getPref(branch, key, type) {
	if(type === 0)
		return branch.getIntPref(key);
	if(type === 1)
		return branch.getComplexValue(key, Ci.nsISupportsString).data;
	if(type === 2)
		return branch.getBoolPref(key);
}

function setPref(branch, key, value, type) {
	if(type === 0) {
		branch.setIntPref(key, value);
		return;
	}
	if(type === 1) {
		var s = Cc['@mozilla.org/supports-string;1'].createInstance(Ci.nsISupportsString);
		s.data = value;
		branch.setComplexValue(key, Ci.nsISupportsString, s);
		return;
	}
	if(type === 2) {
		branch.setBoolPref(key, value);
		return;
	}
}		

const PREF_ROOT =  "extensions.rikaichanandroid.";

 // map of config values to types
 // 0 = integer, 1 = string, 2 = checkbox/boolean
 var rcxConfigList = {
	// general
	//css: 1,

	// dictionary
	'wpos': 2,					
	'wpop': 2,
	'wmax': 0,
	'namax': 0,
	'hidex': 2,
	
	// kanji
	//'kindex': 1,

	//pitch
	'showpitchaccent' : 2,
	'hidepitchaccentpos' : 2,

	// clipboard / save file
	// sfcs and ubom were configurable in rikaichan, but are currently hardcoded to utf-8 with BOM
	'sfile': 1,
	// 'sfcs': 1,
	// 'ubom': 2,
	'smaxfe': 0,
	'smaxfk': 0,
	'smaxce': 0,
	'smaxck': 0,
	'snlf': 0,
	'ssep': 1,
	
	// not in GUI
	'popdelay': 0,
	'hidedef': 2,
	// 'sticky': 2 
};

var rcxConfig={
	'wpos': true,
	'wpop': true,
	'wmax': 3,
	'namax': 5,
	'hidex': false,

	'kindex' : 'COMP,H,L,E,DK,N,V,Y,P,IN,I,U', //kanji information, currently not configurable
	
	'showpitchaccent': true,
	'hidepitchaccentpos': false,

	// 'sfile': "C:\\Users\\Owner\\Desktop\\save.txt", //hardcoded sfile values for testing
	//'sfile': "/sdcard/Download/Words.txt",
	'sfile': '',
	'sfcs': 'utf-8',
	'ubom': true,
	'smaxfe': 1,
	'smaxfk': 1,
	'smaxce': 7,
	'smaxck': 1,
	'snlf': 1,
	'ssep': 'Tab',

	'popdelay': 50,
	'hidedef': false,
	'sticky': true,
	
	//overide some properties depending on user set preferences, note that not all properties are exposed as preferences (see rcxConfigList)
	load: function () { 
		var branch = Services.prefs.getBranch(PREF_ROOT);
		for(let [key, type] in Iterator(rcxConfigList)) {
			if(branch.prefHasUserValue(key)){
				this[key] = getPref(branch, key, type);
			}
			else { //set preferences (meaning this the first time the addon has been installed)
				setPref(branch, key, this[key], type);
			}
		}
	}
};
rcxConfig.load();

var rcxConfigListener = new PrefListener(
	PREF_ROOT,
	function callback (branch, name) {
		rcxConfig[name] = getPref(branch, name, rcxConfigList[name]);
  }
);
rcxConfigListener.register(true);