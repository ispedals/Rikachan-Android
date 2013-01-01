var rcxFile = {
	read: function(uri) {
		var inp = Components.classes['@mozilla.org/network/io-service;1']
				.getService(Components.interfaces.nsIIOService)
				.newChannel(uri, null, null)
				.open();

		var is = Components.classes['@mozilla.org/intl/converter-input-stream;1']
					.createInstance(Components.interfaces.nsIConverterInputStream);
		is.init(inp, 'UTF-8', 4 * 1024 * 1024,
			Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

		var buffer = '';
		var s = {};
		while (is.readString(-1, s) > 0) {
			buffer += s.value;
		}
		is.close();

		return buffer;
	},

	readArray: function(name) {
		var a = this.read(name).split('\n');
		while ((a.length > 0) && (a[a.length - 1].length == 0)) a.pop();
		return a;
	}
};