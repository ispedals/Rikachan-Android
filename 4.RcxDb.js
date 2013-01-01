function RcxDb(name)
{
	this.file = name; //must be a nsFIle instance

	this.open = function () {
		var f = this.file;

		// The files may get installed as read-only, breaking
		// index creation. Try changing the file permission.
		if (!f.isWritable()) f.permissions |= 0x180;	// 0x180=0600 strict mode doesn't like octals

		this.db = Components.classes['@mozilla.org/storage/service;1']
			.getService(Components.interfaces.mozIStorageService)
			.openDatabase(f);

		this.file = null;
	};

	this.close = function () {
		if (this.db && this.db.connectionReady) {
			if (this.currentStatement) {
				this.currentStatement.reset();
				this.currentStatement.finalize();
				this.currentStatement = null;
			}
			while (this.db.transactionInProgress) {
				continue;
			}
			this.db.close();
			this.db = null;
		}
	};

	this.exec = function(stm) {
		var rows = [];
		if (!this.db) this.open();
		this.currentStatement = this.db.createStatement(stm);
		for (var i = arguments.length - 1; i > 0; --i) {
			if (arguments[i] != null) this.currentStatement.bindUTF8StringParameter(i - 1, arguments[i]);
		}
		try {
			while (this.currentStatement.step()) {
				var r = [];
				for (i = this.currentStatement.columnCount - 1; i >= 0; --i) {
					r[this.currentStatement.getColumnName(i)] = this.currentStatement.getUTF8String(i);
				}
				rows.push(r);
			}
		} finally {
			this.currentStatement.reset();
			this.currentStatement.finalize();
			this.currentStatement = null;
		}
		return rows;
	};

	this.indexExists = function(index) {
		if (!this.db) this.open();
		return this.db.indexExists(index);
	};

	this.beginTransaction = function() {
		if (!this.db) this.open();
		this.db.beginTransaction();
	};

	this.commitTransaction = function() {
		this.db.commitTransaction();
	};

	this.rollbackTransaction = function() {
		this.db.rollbackTransaction();
	};

	return this;
}