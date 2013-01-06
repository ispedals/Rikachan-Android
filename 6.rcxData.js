var rcxData = {
	dicList: [],
	kanjiData: null, //kanji.dat data
	kanjiShown: null,
	radData: null, //rad.dat data
	selected: 0, //selected dictionary index in dicList
	
	init: function () {
		this.dicList.push(new RcxDic({
			name : 'jpen.sqlite',
			hasType : true,
			isName : false
		}));
		if(USING_NAMES) {
			this.dicList.push(new RcxDic({
				name : 'jpname.sqlite',
				hasType : false,
				isName : true
			}));
		}
		this.dicList.push({ //fake kanji dictionary that when selected will cause kanjiSearch() to be called
			name: 'Kanji.sqlite',
			isKanji: true,
			hasType : false,
			isName : false,
			open: function (){},
			close: function (){}
		});
		//the kanji dictionary must always be the last element in dictList
		
		for(var i=0; i<this.dicList.length; i++) { this.dicList[i].open();}
		
		this.kanjiShown = {};
		var a = rcxConfig.kindex.split(',');
		for (i = a.length - 1; i >= 0; --i) {
			this.kanjiShown[a[i]] = 1;
		}
	},
	
	select: function (index) {
		this.selected = index;
	},
	
	numList: [
/*
		'C', 	'Classical Radical',
		'DR',	'Father Joseph De Roo Index',
		'DO',	'P.G. O\'Neill Index',
		'O', 	'P.G. O\'Neill Japanese Names Index',
		'Q', 	'Four Corner Code',
		'MN',	'Morohashi Daikanwajiten Index',
		'MP',	'Morohashi Daikanwajiten Volume/Page',
		'K',	'Gakken Kanji Dictionary Index',
		'W',	'Korean Reading',
*/
		'H',	'Halpern',
		'L',	'Heisig',
		'E',	'Henshall',
		'DK',	'Kanji Learners Dictionary',
		'N',	'Nelson',
		'V',	'New Nelson',
		'Y',	'PinYin',
		'P',	'Skip Pattern',
		'IN',	'Tuttle Kanji &amp; Kana',
		'I',	'Tuttle Kanji Dictionary',
		'U',	'Unicode'
	],

	deinflect: {
			init: function() {
				this.reasons = [];
				this.rules = [];

				var buffer = rcxFile.readArray(resourceURI.spec + 'deinflect.dat');
				var ruleGroup = [];
				ruleGroup.fromLen = -1;

				// i = 1: skip header
				for (var i = 1; i < buffer.length; ++i) {
					var f = buffer[i].split('\t');

					if (f.length == 1) {
						this.reasons.push(f[0]);
					}
					else if (f.length == 4) {
						var r = { from: f[0], to: f[1], type: f[2], reason: f[3] };
						if (ruleGroup.fromLen != r.from.length) {
							ruleGroup = [];
							ruleGroup.fromLen = r.from.length;
							this.rules.push(ruleGroup);
						}
						ruleGroup.push(r);
					}
				}
				this.ready = true;
			},

			done: function() {
				this.reasons = null;
				this.rules = null;
				this.ready = false;
			},

			go: function(word) {
				if (!this.ready) this.init();

				var have = [];
				have[word] = 0;

				var r = [{ word: word, type: 0xFF, reason: '' }];
				var i = 0;
				do {
					word = r[i].word;
					var wordLen = word.length;
					var type = r[i].type;

					for (var j = 0; j < this.rules.length; ++j) {
						var ruleGroup = this.rules[j];
						if (ruleGroup.fromLen <= wordLen) {
							var end = word.substr(-ruleGroup.fromLen);
							for (var k = 0; k < ruleGroup.length; ++k) {
								var rule = ruleGroup[k];
								if ((type & rule.type) && (end == rule.from)) {
									var newWord = word.substr(0, word.length - rule.from.length) + rule.to;
									if (newWord.length <= 1) continue;
									var o = {};
									if (have[newWord] != undefined) {
										o = r[have[newWord]];
										o.type |= (rule.type >> 8);
										continue;
									}
									have[newWord] = r.length;
									if (r[i].reason.length) o.reason = this.reasons[rule.reason] + ' &lt; ' + r[i].reason;
										else o.reason = this.reasons[rule.reason];
									o.type = rule.type >> 8;
									o.word = newWord;
									r.push(o);
								}
							}
						}
					}
				} while (++i < r.length);

				return r;
			}
		},

	// katakana -> hiragana conversion tables
	ch:[0x3092,0x3041,0x3043,0x3045,0x3047,0x3049,0x3083,0x3085,0x3087,0x3063,0x30FC,0x3042,0x3044,0x3046,
		0x3048,0x304A,0x304B,0x304D,0x304F,0x3051,0x3053,0x3055,0x3057,0x3059,0x305B,0x305D,0x305F,0x3061,
		0x3064,0x3066,0x3068,0x306A,0x306B,0x306C,0x306D,0x306E,0x306F,0x3072,0x3075,0x3078,0x307B,0x307E,
		0x307F,0x3080,0x3081,0x3082,0x3084,0x3086,0x3088,0x3089,0x308A,0x308B,0x308C,0x308D,0x308F,0x3093],
	cv:[0x30F4,0xFF74,0xFF75,0x304C,0x304E,0x3050,0x3052,0x3054,0x3056,0x3058,0x305A,0x305C,0x305E,0x3060,
		0x3062,0x3065,0x3067,0x3069,0xFF85,0xFF86,0xFF87,0xFF88,0xFF89,0x3070,0x3073,0x3076,0x3079,0x307C],
	cs:[0x3071,0x3074,0x3077,0x307A,0x307D],
	
	wordSearch: function(word) {
		var ds = this.selected;
		do {
			var dic = this.dicList[ds];
			var e;
			if (dic.isKanji) e = this.kanjiSearch(word.charAt(0));
				else e = this._wordSearch(word, dic, null);
			if (e) {
				if (ds != 0) e.title = dic.name;
				return e;
			}
			ds = (ds + 1) % this.dicList.length;
		} while (ds != this.selected);
	},
	
	_wordSearch: function(word, dic, max) {
		// half & full-width katakana to hiragana conversion
		// note: katakana vu is never converted to hiragana

		var trueLen = [0];
		var p = 0;
		var r = '';
		for (var i = 0; i < word.length; ++i) {
			var u = word.charCodeAt(i);
			var v = u;

			if (u <= 0x3000) break;

			// full-width katakana to hiragana
			if ((u >= 0x30A1) && (u <= 0x30F3)) {
				u -= 0x60;
			}
			// half-width katakana to hiragana
			else if ((u >= 0xFF66) && (u <= 0xFF9D)) {
				u = this.ch[u - 0xFF66];
			}
			// voiced (used in half-width katakana) to hiragana
			else if (u == 0xFF9E) {
				if ((p >= 0xFF73) && (p <= 0xFF8E)) {
					r = r.substr(0, r.length - 1);
					u = this.cv[p - 0xFF73];
				}
			}
			// semi-voiced (used in half-width katakana) to hiragana
			else if (u == 0xFF9F) {
				if ((p >= 0xFF8A) && (p <= 0xFF8E)) {
					r = r.substr(0, r.length - 1);
					u = this.cs[p - 0xFF8A];
				}
			}
			// ignore J~
			else if (u == 0xFF5E) {
				p = 0;
				continue;
			}

			r += String.fromCharCode(u);
			trueLen[r.length] = i + 1;	// need to keep real length because of the half-width semi/voiced conversion
			p = v;
		}
		word = r;


		var result = { data: [] };
		var maxTrim;

		if (dic.isName) {
			maxTrim = rcxConfig.namax;
			result.names = 1;
		}
		else {
			maxTrim = rcxConfig.wmax;
		}


		if (max != null) maxTrim = max;

		var have = [];
		var count = 0;
		var maxLen = 0;

		while (word.length > 0) {
			var showInf = (count != 0);
			var variants = dic.isName ? [{word: word, type: 0xFF, reason: null}] : this.deinflect.go(word);
			for (i = 0; i < variants.length; i++) {
				var v = variants[i];
				var entries = dic.findWord(v.word);
				for (var j = 0; j < entries.length; ++j) {
					var dentry = entries[j];
					if (have[dentry]) continue;

					var ok = true;
					if ((dic.hasType) && (i > 0)) {
						// i > 0 a de-inflected word

						var gloss = dentry.split(/[,()]/);
						var y = v.type;
						var z;
						for (z = gloss.length - 1; z >= 0; --z) {
							var g = gloss[z];
							if ((y & 1) && (g == 'v1')) break;
							if ((y & 4) && (g == 'adj-i')) break;
							if ((y & 2) && (g.substr(0, 2) == 'v5')) break;
							if ((y & 16) && (g.substr(0, 3) == 'vs-')) break;
							if ((y & 8) && (g == 'vk')) break;
						}
						ok = (z != -1);
					}
					if ((ok) && (dic.hasType) && (rcxConfig.hidex)) {
						if (dentry.match(/\/\([^\)]*\bX\b.*?\)/)) ok = false;
					}
					if (ok) {
						if (count >= maxTrim) {
							result.more = 1;
							break;
						}

						have[dentry] = 1;
						++count;
						if (maxLen == 0) maxLen = trueLen[word.length];

						r = null;
						if (v.reason) {
							if (showInf) r = '&lt; ' + v.reason + ' &lt; ' + word;
								else r = '&lt; ' + v.reason;
						}
						result.data.push([dentry, r]);
					}
				}	// for j < entries.length
				if (count >= maxTrim) break;
			}	// for i < variants.length
			if (count >= maxTrim) break;
			word = word.substr(0, word.length - 1);
		}	// while word.length > 0

		if (result.data.length == 0) return null;

		result.matchLen = maxLen;
		return result;
	},
	
	translate: function(text) {
		var result = { data: [], textLen: text.length };
		while (text.length > 0) {
			var e = null;
			var ds = this.selected;
			do {
				if (!this.dicList[ds].isKanji) {
					e = this._wordSearch(text, this.dicList[ds], 1);
					if (e != null) break;
				}
				ds = (ds + 1) % this.dicList.length;
			} while (ds != this.selected);

			if (e != null) {
				if (result.data.length >= rcxConfig.wmax) {
					result.more = 1;
					break;
				}
				result.data.push(e.data[0]);
				text = text.substr(e.matchLen);
			}
			else {
				text = text.substr(1);
			}
		}
		if (result.data.length == 0) return;
		result.textLen -= text.length;
		return result;
	},
	
	kanjiSearch: function(kanji) {
		var hex = '0123456789ABCDEF';
		var kde;
		var result;
		var a, b;
		var i;

		i = kanji.charCodeAt(0);
		if (i < 0x3000) return;

		if (!this.kanjiData) {
			this.kanjiData = rcxFile.read( resourceURI.spec + 'kanji.dat');
		}

		kde = this.find(this.kanjiData, kanji);
		if (!kde) return;

		a = kde.split('|');
		if (a.length != 6) return;

		result = { };
		result.kanji = a[0];

		result.misc = {};
		result.misc['U'] = hex[(i >>> 12) & 15] + hex[(i >>> 8) & 15] + hex[(i >>> 4) & 15] + hex[i & 15];

		b = a[1].split(' ');
		for (i = 0; i < b.length; ++i) {
			if (b[i].match(/^([A-Z]+)(.*)/)) {
				if (!result.misc[RegExp.$1]) result.misc[RegExp.$1] = RegExp.$2;
					else result.misc[RegExp.$1] += ' ' + RegExp.$2;
			}
		}

		result.onkun = a[2].replace(/\s+/g, '\u3001 ');
		result.nanori = a[3].replace(/\s+/g, '\u3001 ');
		result.bushumei = a[4].replace(/\s+/g, '\u3001 ');
		result.eigo = a[5];

		return result;
	},
	
	find: function(data, text) {
		var tlen = text.length;
		var beg = 0;
		var end = data.length - 1;
		var i;
		var mi;
		var mis;

		while (beg < end) {
			mi = (beg + end) >> 1;
			i = data.lastIndexOf('\n', mi) + 1;

			mis = data.substr(i, tlen);
			if (text < mis) end = i - 1;
				else if (text > mis) beg = data.indexOf('\n', mi + 1) + 1;
					else return data.substring(i, data.indexOf('\n', mi + 1));
		}
		return null;
	},
	
	makeHtml: function(entry) {
		var e;
		var b;
		var c, s, t;
		var i, j, n;

		if (entry == null) return '';

		if (!this.radData) this.radData = rcxFile.readArray(resourceURI.spec + 'radicals.dat');

		b = [];

		if (entry.kanji) {
			var yomi;
			var box;
			var bn;
			var k;
			var nums;

			yomi = entry.onkun.replace(/\.([^\u3001]+)/g, '<span class="k-yomi-hi">$1</span>');
			if (entry.nanori.length) {
				yomi += '<br/><span class="k-yomi-ti">\u540D\u4E57\u308A</span> ' + entry.nanori;
			}
			if (entry.bushumei.length) {
				yomi += '<br/><span class="k-yomi-ti">\u90E8\u9996\u540D</span> ' + entry.bushumei;
			}

			bn = entry.misc['B'] - 1;
			k = entry.misc['G'];
			switch (k) {
			case 8:
				k = 'general<br/>use';
				break;
			case 9:
				k = 'name<br/>use';
				break;
			default:
				k = isNaN(k) ? '-' : ('grade<br/>' + k);
				break;
			}
			box = '<table class="k-abox-tb"><tr>' +
				'<td class="k-abox-r">radical<br/>' + this.radData[bn].charAt(0) + ' ' + (bn + 1) + '</td>' +
				'<td class="k-abox-g">' + k + '</td>' +
				'</tr><tr>' +
				'<td class="k-abox-f">freq<br/>' + (entry.misc['F'] ? entry.misc['F'] : '-') + '</td>' +
				'<td class="k-abox-s">strokes<br/>' + entry.misc['S'] + '</td>' +
				'</tr></table>';
			if (this.kanjiShown['COMP']) {
				k = this.radData[bn].split('\t');
				box += '<table class="k-bbox-tb">' +
						'<tr><td class="k-bbox-1a">' + k[0] + '</td>' +
						'<td class="k-bbox-1b">' + k[2] + '</td>' +
						'<td class="k-bbox-1b">' + k[3] + '</td></tr>';
				j = 1;
				for (i = 0; i < this.radData.length; ++i) {
					s = this.radData[i];
					if ((bn != i) && (s.indexOf(entry.kanji) != -1)) {
						k = s.split('\t');
						c = ' class="k-bbox-' + (j ^= 1);
						box += '<tr><td' + c + 'a">' + k[0] + '</td>' +
								'<td' + c + 'b">' + k[2] + '</td>' +
								'<td' + c + 'b">' + k[3] + '</td></tr>';
					}
				}
				box += '</table>';
			}

			nums = '';
			j = 0;

			for (i = 0; i < this.numList.length; i += 2) {
				c = this.numList[i];
				if (this.kanjiShown[c]) {
					s = entry.misc[c];
					c = ' class="k-mix-td' + (j ^= 1) + '"';
					nums += '<tr><td' + c + '>' + this.numList[i + 1] + '</td><td' + c + '>' + (s ? s : '-') + '</td></tr>';
				}
			}
			if (nums.length) nums = '<table class="k-mix-tb">' + nums + '</table>';

			b.push('<table class="k-main-tb"><tr><td valign="top">');
			b.push(box);
			b.push('<span class="k-kanji">' + entry.kanji + '</span><br/>');
			if (!rcxConfig.hidedef) b.push('<div class="k-eigo">' + entry.eigo + '</div>');
			b.push('<div class="k-yomi">' + yomi + '</div>');
			b.push('</td></tr><tr><td>' + nums + '</td></tr></table>');
			return b.join('');
		}

		s = t = '';

		if (entry.names) {
			c = [];

			b.push('<div class="w-title">Names Dictionary</div><table class="w-na-tb"><tr><td>');
			for (i = 0; i < entry.data.length; ++i) {
				e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/([\S\s]+)\//);
				if (!e) continue;

				if (s != e[3]) {
					c.push(t);
					t = '';
				}

				if (e[2]) c.push('<span class="w-kanji">' + e[1] + '</span> &#32; <span class="w-kana">' + e[2] + '</span><br/> ');
					else c.push('<span class="w-kana">' + e[1] + '</span><br/> ');

				s = e[3];
				if (rcxConfig.hidedef) t = '';
					else t = '<span class="w-def">' + s.replace(/\//g, '; ').replace(/\n/g, '<br/>') + '</span><br/>';
			}
			c.push(t);
			if (c.length > 4) {
				n = (c.length >> 1) + 1;
				b.push(c.slice(0, n + 1).join(''));

				t = c[n];
				c = c.slice(n, c.length);
				for (i = 0; i < c.length; ++i) {
					if (c[i].indexOf('w-def') != -1) {
						if (t != c[i]) b.push(c[i]);
						if (i == 0) c.shift();
						break;
					}
				}

				b.push('</td><td>');
				b.push(c.join(''));
			}
			else {
				b.push(c.join(''));
			}
			if (entry.more) b.push('...<br/>');
			b.push('</td></tr></table>');
		}
		else {
			if (entry.title) {
				b.push('<div class="w-title">' + entry.title + '</div>');
			}

			var pK = '';

			for (i = 0; i < entry.data.length; ++i) {
				e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/([\S\s]+)\//);
				if (!e) continue;

				var k;
				
				/*
					e[1] = kanji/kana
					e[2] = kana
					e[3] = definition
				*/
				if (s != e[3]) {
					b.push(t);
					pK = k = '';
				}
				else {
					k = t.length ? '<br/>' : '';
				}

				if (e[2]) {
					if (pK == e[1]) k = '\u3001 <span class="w-kana">' + e[2] + '</span>';
						else k += '<span class="w-kanji">' + e[1] + '</span> &#32; <span class="w-kana">' + e[2] + '</span>';
					pK = e[1];
				}
				else {
					k += '<span class="w-kana">' + e[1] + '</span>';
					pK = '';
				}
				b.push(k);
				
				// Add pitch accent right after the reading
				var pitchAccent = rcxMain.getPitchAccent(e[1], e[2]);
				if(pitchAccent && (pitchAccent.length > 0)){
					b.push('<span class="w-conj"> ' + pitchAccent + '</span>');
				}

				if (entry.data[i][1]) b.push(' <span class="w-conj">(' + entry.data[i][1] + ')</span>');

				s = e[3];
				if (rcxConfig.hidedef) {
					t = '<br/>';
				}
				else {
					t = s.replace(/\//g, '; ');
					if (!rcxConfig.wpos) t = t.replace(/^\([^)]+\)\s*/, '');
					if (!rcxConfig.wpop) t = t.replace('; (P)', '');
					t = t.replace(/\n/g, '<br/>');
					t = '<br/><span class="w-def">' + t + '</span><br/>';
				}
			}
			b.push(t);
			if (entry.more) b.push('...<br/>');
		}

		return b.join('');
	},
		
	makeText: function(entry, max) {
		var e;
		var b;
		var i, j;
		var t;

		if (entry == null) return '';
		if (!this.ready) this.init();

		b = [];

		if (entry.kanji) {
			b.push(entry.kanji + '\n');
			b.push((entry.eigo.length ? entry.eigo : '-') + '\n');

			b.push(entry.onkun.replace(/\.([^\u3001]+)/g, '\uFF08$1\uFF09') + '\n');
			if (entry.nanori.length) {
				b.push('\u540D\u4E57\u308A\t' + entry.nanori + '\n');
			}
			if (entry.bushumei.length) {
				b.push('\u90E8\u9996\u540D\t' + entry.bushumei + '\n');
			}

			for (i = 0; i < this.numList.length; i += 2) {
				e = this.numList[i];
				if (this.kanjiShown[e]) {
					j = entry.misc[e];
					b.push(this.numList[i + 1].replace('&amp;', '&') + '\t' + (j ? j : '-') + '\n');
				}
			}
		}
		else {
			if (max > entry.data.length) max = entry.data.length;
			for (i = 0; i < max; ++i) {
				e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
				if (!e) continue;

				if (e[2]) {
					b.push(e[1] + '\t' + e[2]);
				}
				else {
					b.push(e[1]);
				}

				t = e[3].replace(/\//g, '; ');
				if (!rcxConfig.wpos) t = t.replace(/^\([^)]+\)\s*/, '');
				if (!rcxConfig.wpop) t = t.replace('; (P)', '');
				b.push('\t' + t + '\n');
			}
		}
		return b.join('');
	},
	
	done: function () {
		for (var i = this.dicList.length - 1; i >= 0; --i) {
			try {
				var dic = this.dicList[i];
				dic.close();
			}
			catch (ex) { }
		}
		this.dicList = [];
		this.kanjiData = null;
		this.kanjiShown = null;
		this.radData = null;
		this.deinflect.done();
	}
};