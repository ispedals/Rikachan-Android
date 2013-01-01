function RcxDic(dic)
{
	this.name = dic.name;
	this.hasType = dic.hasType;
	this.isName = dic.isName;

	this.open = function() {
		try {
			if (this.rdb) return;
			//resourceURI.spec is defined globally as the path to where the addon is installed
			var file = Services.io.newURI(resourceURI.spec + this.name, null, null).QueryInterface(Ci.nsIFileURL).file;
			this.rdb = new RcxDb(file);
			this.rdb.open();
			this.checkIndex('kanji');
			this.checkIndex('kana');
		}
		catch (ex) {
			this.close();
			throw ex;
		}
	};

	this.close = function() {
		if (this.rdb) {
			this.rdb.close();
			this.rdb = null;
		}
	};

	this.checkIndex = function(name) {
		var ix = 'ix_' + name;
		if (this.rdb.indexExists(ix)) return;
		this.rdb.exec('CREATE INDEX ' + ix + ' ON dict (' + name + ' ASC)');
	};

	this.find = function(query, arg1) {
		if (!this.rdb) this.open();
		var r = this.rdb.exec(query, arg1);
		var entries = [];
		for (var i = 0; i < r.length; ++i) {
			var x = r[i];
			if (!x.entry.length) continue;
			// rcx currently expects an edict-like format
			if (x.entry[x.entry.length - 1] == '/') entries.push(x.entry);
				else entries.push((x.kanji ? (x.kanji + ' [' + x.kana + ']') : x.kana) + ' /' + x.entry + '/');
		}
		return entries;
	};

	this.findWord = function(word) {
		return this.find('SELECT * FROM dict WHERE kanji=?1 OR kana=?1 LIMIT 100', word);
	};

	this.findText = function(text) {
		return this.find('SELECT * FROM dict WHERE entry LIKE ?1 LIMIT 300', '%' + text + '%');
	};

	return this;
}