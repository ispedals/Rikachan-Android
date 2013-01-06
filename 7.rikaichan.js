//from Rikaichan, does all the textnode manipulation
var text_manipulator = {
	inlineNames: {
		// text node
		'#text': true,

		// font style
		'FONT': true,
		'TT': true,
		'I': true,
		'B': true,
		'BIG': true,
		'SMALL': true,
		//deprecated
		'STRIKE': true,
		'S': true,
		'U': true,

		// phrase
		'EM': true,
		'STRONG': true,
		'DFN': true,
		'CODE': true,
		'SAMP': true,
		'KBD': true,
		'VAR': true,
		'CITE': true,
		'ABBR': true,
		'ACRONYM': true,

		// special, not included IMG, OBJECT, BR, SCRIPT, MAP, BDO
		'A': true,
		'Q': true,
		'SUB': true,
		'SUP': true,
		'SPAN': true,
		'WBR': true,

		// ruby
		'RUBY': true,
		'RBC': true,
		'RTC': true,
		'RB': true,
		'RT': true,
		'RP': true
	},

	// Gets text from a node and returns it
	// node: a node
	// selEnd: the selection end object will be changed as a side effect
	// maxLength: the maximum length of returned string
	getInlineText: function (node, selEndList, maxLength) {
		if ((node.nodeType == Node.TEXT_NODE) && (node.data.length == 0)) return ''

		let text = '';
		let result = node.ownerDocument.evaluate('descendant-or-self::text()[not(parent::rp) and not(ancestor::rt)]',
						node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		while ((maxLength > 0) && (node = result.iterateNext())) {
			text += node.data.substr(0, maxLength);
			maxLength -= node.data.length;
			selEndList.push(node);
		}
		return text;
	},

	// Given a node which must not be null, returns either the next sibling or
	// the next sibling of the father or the next sibling of the fathers father
	// and so on or null
	getNext: function(node) {
		do {
			if (node.nextSibling) return node.nextSibling;
			node = node.parentNode;
		} while ((node) && (this.inlineNames[node.nodeName]));
		return null;
	},

	getTextFromRange: function(rangeParent, offset, selEndList, maxLength) {
		if (rangeParent.ownerDocument.evaluate('boolean(parent::rp or ancestor::rt)',
			rangeParent, null, XPathResult.BOOLEAN_TYPE, null).booleanValue)
			return '';

		if (rangeParent.nodeType != Node.TEXT_NODE)
			return '';

		let text = rangeParent.data.substr(offset, maxLength);
		selEndList.push(rangeParent);

		var nextNode = rangeParent;
		while ((text.length < maxLength) &&
			((nextNode = this.getNext(nextNode)) != null) &&
			(this.inlineNames[nextNode.nodeName])) {
			text += this.getInlineText(nextNode, selEndList, maxLength - text.length);
		}

		return text;
	},

	getInlineTextPrev: function (node, selEndList, maxLength) {
		if ((node.nodeType == Node.TEXT_NODE) && (node.data.length == 0)) {
			return ''
		}

		let text = '';

		let result = node.ownerDocument.evaluate('descendant-or-self::text()[not(parent::rp) and not(ancestor::rt)]',
		node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

		while ((text.length < maxLength) && (node = result.iterateNext())) {
			if (text.length + node.data.length >= maxLength) {
				text += node.data.substr(node.data.length - (maxLength - text.length), maxLength - text.length);
			} else {
				text += node.data;
			}

			selEndList.push(node);
		}

		return text;
	},

	getPrev: function (node) {
		do {
			if (node.previousSibling) {
				return node.previousSibling;
			}
			node = node.parentNode;
		}
		while ((node) && (this.inlineNames[node.nodeName]));
		return null;
	},

	getTextFromRangePrev: function (rangeParent, offset, selEndList, maxLength) {
		if (rangeParent.ownerDocument.evaluate('boolean(parent::rp or ancestor::rt)',
		rangeParent, null, XPathResult.BOOLEAN_TYPE, null).booleanValue) {
			return '';
		}

		let text = '';
		var prevNode = rangeParent;

		while ((text.length < maxLength) && ((prevNode = this.getPrev(prevNode)) != null) && (this.inlineNames[prevNode.nodeName])) {
			textTemp = text;
			text = this.getInlineTextPrev(prevNode, selEndList, maxLength - text.length) + textTemp;
		}

		return text;
	},

	highlightMatch: function(doc, rp, ro, matchLen, selEndList, tdata) {
		if (selEndList.length === 0) return;

		var selEnd;
		var offset = matchLen + ro;
		// before the loop
		// |----!------------------------!!-------|
		// |(------)(---)(------)(---)(----------)|
		// offset: '!!' lies in the fifth node
		// rangeOffset: '!' lies in the first node
		// both are relative to the first node
		// after the loop
		// |---!!-------|
		// |(----------)|
		// we have found the node in which the offset lies and the offset
		// is now relative to this node
		for (var i = 0; i < selEndList.length; ++i) {
			selEnd = selEndList[i]
			if (offset <= selEnd.data.length) break;
			offset -= selEnd.data.length;
		}

		var range = doc.createRange();
		range.setStart(rp, ro);
		range.setEnd(selEnd, offset);

		var sel = doc.defaultView.getSelection();
		if ((!sel.isCollapsed) && (tdata.selText != sel.toString()))
			return;
		sel.removeAllRanges();
		sel.addRange(range);
		return sel.toString();
	}
};
// rcxMain, on enable, initializes its properties. Prior to enable(), both rcxMain.popup_window.getBrowser() must be assigned a function and rcxMain.current_document must be
// assigned a getter (using Object.defineProperty). A tap results in an event that can be used to determine what text node was tapped.
// It then uses Rikaichan's logic to determine if the text node contains a Japanese word, finds its definition using rcxData, and displays the definitions using popup_window
// the last sucessful term is stored in previous_term
// depends on these variables being globally defined:
//	rcxData
//	rcxConfig
//	resourceURI
//	standard Mozilla addon constants
// use by calling rcxMain.enable()
var rcxMain = {
	current_document: null, //reference to the DOM document; this must be assigned as a getter prior to enable()

	enabled: false,

	// popup_window manages the actual DOM popup element
	// show() creates the element and attaches it to the given DOM document
	// destroy() removes the element
	// getBrowser() must be redefined as a function that returns a chrome browser prior to rcxMain.enable()
	//
	// The popup element differs from RIkaichan's element by having five buttons on the corners. These buttons are:
	// move to the preceeding character, move to the next word, save to file, alternative view, and copy to clipboard.
	// These actions are trigged by a mousedown listener bound to the popup element (handle)  that will call the appropriate functions
	// Clicking the popup element itself will cause it be destroyed
	popup_window: {
		getBrowser: function () {}, //assign if this will run in a chrome context prior to rcxMain.init
		current_element: null, //points to current DOM popup element
		current_css: null, //points to the style element that will contain the css

		isVisible: function () {
			return this.current_element;
		},

		get stylesheet() {
			return resourceURI.spec + 'popup-blue.css';
		}, //need to use getter because resourceURI will not be set when popup_window is initialized
		//this is configurable in Rikaichan, but currently is not
		altView: 0,

		listener: null, //will reference the rebound mousedown event listener so that it can be removed

		show: function (doc, text, elem, pos) {
			this.destroy();

			// outer-most document
			var topdoc = doc;
			var content = doc.defaultView;

			var css = topdoc.createElement('style');
			//css.setAttribute('rel', 'stylesheet');
			css.setAttribute('type', 'text/css');
			//css.setAttribute('href', this.stylesheet);
			css.setAttribute('id', 'rikaichan-css');
			css.innerHTML = rcxFile.read(this.stylesheet);
			topdoc.getElementsByTagName('head')[0].appendChild(css);
			this.current_css = css;

			var popup = topdoc.createElement('div');
			popup.setAttribute('id', 'rikaichan-window');
			topdoc.documentElement.appendChild(popup);

			// if this is not set then Cyrillic text is displayed with Japanese
			// font, if the web page uses a Japanese code page as opposed to Unicode.
			// This makes it unreadable.
			popup.setAttribute('lang', 'en');

			popup.style.maxWidth = ('600px');

			if (topdoc.contentType == 'text/plain') {
				var df = topdoc.createDocumentFragment();
				var sp = topdoc.createElement('span');
				df.appendChild(sp);
				sp.innerHTML = text;
				while (popup.firstChild) {
					popup.removeChild(popup.firstChild);
				}
				popup.appendChild(df);
			} else {
				popup.innerHTML = text;
			}

			var x = 0,
				y = 0;

			if (elem) { //positioning
				popup.style.top = '-1000px';
				popup.style.left = '0px';
				popup.style.display = '';

				var width = popup.offsetWidth;
				var height = popup.offsetHeight;

				// guess! (??? still need this?)
				if (width <= 0) width = 200;
				if (height <= 0) {
					height = 0;
					var j = 0;
					while ((j = text.indexOf('<br', j)) != -1) {
						j += 5;
						height += 22;
					}
					height += 25;
				}

				if (pos) {
					x = pos.screenX;
					y = pos.screenY;
				}

				if (this.altView == 1) {
					// upper-left
					x = 0;
					y = 0;
				} else if (this.altView == 2) {
					// lower-right
					x = (content.innerWidth - (width + 20));
					y = (content.innerHeight - (height + 20));
				} else {
					// convert xy relative to outer-most document
					var cb = this.getBrowser();
					x -= content.screenX;
					y -= content.screenY;

					// when zoomed, convert to zoomed document pixel position
					// - not in TB compose and ...?
					if (cb && cb.markupDocumentViewer != null) {
						var z = cb.markupDocumentViewer.fullZoom || 1;
						if (z != 1) {
							x = Math.round(x / z);
							y = Math.round(y / z);
						}
					}

					if (elem.tagName == 'option') {
						// these things are always on z-top, so go sideways
						x -= pos.pageX;
						y -= pos.pageY;
						var p = elem;
						while (p) {
							x += p.offsetLeft;
							y += p.offsetTop;
							p = p.offsetParent;
						}

						// right side of box
						var w = elem.parentNode.offsetWidth + 5;
						x += w;

						if ((x + width) > content.innerWidth) {
							// too much to the right, go left
							x -= (w + width + 5);
							if (x < 0) x = 0;
						}

						if ((y + height) > content.innerHeight) {
							y = content.innerHeight - height - 5;
							if (y < 0) y = 0;
						}
					} else {
						// go left if necessary
						if ((x + width) > (content.innerWidth - 20)) {
							x = (content.innerWidth - width) - 20;
							if (x < 0) x = 0;
						}

						// below the mouse
						var v = 25;

						// under the popup title
						if ((elem.title) && (elem.title != '')) v += 20;

						// go up if necessary
						if ((y + v + height) > content.innerHeight) {
							var t = y - height - 30;
							if (t >= 0) y = t;
						} else y += v;
					}
				}
			}

			popup.style.left = (x + content.scrollX) + 'px';
			popup.style.top = (y + content.scrollY) + 'px';
			popup.style.display = '';

			var tools = topdoc.createElement('div');

			var previous = topdoc.createElement('a');
			previous.innerHTML = '\u21E6';
			previous.id = 'rikai-previous';
			previous.href = 'javascript:void(0)';
			previous.style.cssFloat = 'left';
			previous.style.fontSize="40px";
			tools.appendChild(previous);

			var next = topdoc.createElement('a');
			next.innerHTML = '\u21E8';
			next.id = 'rikai-next';
			next.href = 'javascript:void(0)';
			next.style.cssFloat = 'left';
			next.style.fontSize="40px";
			tools.appendChild(next);

			var save = topdoc.createElement('a');
			save.innerHTML = '\uD83D\uDCBE';
			save.id = 'rikai-save';
			save.href = 'javascript:void(0)';
			save.style.cssFloat = 'right';
			save.style.fontSize="x-large";
			tools.appendChild(save);

			popup.insertBefore(tools, popup.firstChild);

			var br = topdoc.createElement('br');
			br.style.clear='both';
			popup.insertBefore(br, tools.nextSibling);

			var alt = topdoc.createElement('a');
			alt.innerHTML = '\u2747';
			alt.id = 'rikai-alt';
			alt.href = 'javascript:void(0)';
			alt.style.cssFloat = 'left';
			alt.style.fontSize="xx-large";
			popup.appendChild(alt);

			var copy = topdoc.createElement('a');
			copy.innerHTML = '\u2702';
			copy.id = 'rikai-copy';
			copy.href = 'javascript:void(0)';
			copy.style.cssFloat = 'right';
			copy.style.fontSize="x-large";
			popup.appendChild(copy);


			this.current_element = popup;
			this.listener = this.handle.bind(this);
			popup.addEventListener('click', this.listener, false);
		},

		//handles
		handle: function (e) {
			e.stopPropagation();
			switch(e.target.id) {
				case 'rikai-save':
					rcxMain.saveToFile();
					break;
				case 'rikai-next':
					rcxMain.moveToNextWord();
					break;
				case 'rikai-previous':
					rcxMain.moveToPreviousWord();
					break;
				case 'rikai-copy':
					rcxMain.copyToClip();
					break;
				case 'rikai-alt':
					rcxMain.move();
					break;
				default:
					this.destroy();
			}
		},

		destroy: function () {
			try {
				this.current_element.removeEventListener('mousedown', this.listener, false);
				this.current_element.parentNode.removeChild(this.current_element);
				this.current_css.parentNode.removeChild(this.current_css);
			} catch (e) {}
			this.current_element = null;
			this.current_css = null;
		}
	},

	enable: function () {
		rcxData.init();
		this.previous_term = {
			target: null, //DOM node containing previous term
			position: { //position of DOM node
				screenX: null,
				screenY: null,
				pageX: null,
				pageY: null
			},
			timer: null, //ID of timer that delays showing of popup (probably want to make rcxMain track this)
			title: null, //text of DOM node attribute if that is what the term is
			rangeNode: null,
			rangeOffset: null,
			currentOffset: 0, //uofs
			currentOffsetEnd: 0, //uofsnext (distance to next offset start)
			titleShown: false, //whether this term is from a DOM node attribute (should be true if title != null)
			selText: null //selected text
		};
		this.previous_term.position = null;
		this.tenative_term = {}; //will be used by onmousemove to pass parameters the same way previous_term is used by other functions

		//sentence extraction globals (set in show())
		this.sentence = null; //the sentence the currrent word was found in
		this.word = null // the actual current highlighted word
		this.sentenceWBlank = null //the sentence the current word was found in replaced with a blank
		this.enabled = true;
	},

	disable: function () {
		try {
			this.clearView(true);
		}
		catch (e) {}
		if (this.previous_term) {
			this.previous_term.target = null;
			this.previous_term.rangeNode = null;
			this.previous_term = null;
		}
		if (this.tenative_term) {
			this.tenative_term.target = null;
			this.tenative_term.rangeNode = null;
			this.tenative_term = null;
		}
		rcxData.done();
		this.enabled = false;
	},

	onMouseMove: function (ev) {
		rcxMain._onMouseMove(ev);
	},

	_onMouseMove: function (event) {
		var rangeParent = event.rangeParent;
		var rangeOffset = event.rangeOffset;

		// if it is the same text
		if (event.target == this.previous_term.target) {
			if (this.previous_term.title) return;
			if ((rangeParent == this.previous_term.rangeNode) && (rangeOffset == this.previous_term.rangeOffset)) return;
		}

		if (event.button != 0) return;

		// hitting the popup_window element
		if(event.target.id.indexOf('rikai') == 0) return;

		if (this.previous_term.timer) {
			this.current_document.defaultView.clearTimeout(this.previous_term.timer);
			this.previous_term.timer = null;
		}

		//likely title or something
		if ((event.explicitOriginalTarget.nodeType != Node.TEXT_NODE) && !('form' in event.target)) {
			rangeParent = null;
			rangeOffset = -1;
		}

		var get_position = function (ev) {
			return {
				screenX: ev.screenX,
				screenY: ev.screenY,
				pageX: ev.pageX,
				pageY: ev.pageY
			};
		};

		if (this.previous_term.position) {
			// dont close just because we moved from a valid popup slightly over to a place with nothing
			var dx = this.previous_term.position.screenX - event.screenX;
			var dy = this.previous_term.position.screenY - event.screenY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			if (distance > 4) {
				this.clearView();
			}
		}

		this.tenative_term.target = event.target;
		this.tenative_term.rangeNode = rangeParent;
		this.tenative_term.rangeOffset = rangeOffset;
		this.tenative_term.title = null;
		this.tenative_term.currentOffset = 0;
		this.uofsNext = 1;
		this.tenative_term.position
		this.tenative_term.timer = null;

		if ((rangeParent) && (rangeParent.data) && (rangeOffset < rangeParent.data.length)) {
			this.tenative_term.position = get_position(event);
			this.tenative_term.timer = this.current_document.defaultView.setTimeout(function () {
				rcxMain.show();
			}, rcxConfig.popdelay);
			return;
		}

		if ((typeof (event.target.title) == 'string') && (event.target.title.length)) {
			this.tenative_term.title = event.target.title;
		} else if ((typeof (event.target.alt) == 'string') && (event.target.alt.length)) {
			this.tenative_term.title = event.target.alt;
		}
		if (event.target.nodeName == 'OPTION') {
			this.tenative_term.title = event.target.text;
		} else if (event.target.nodeName == 'SELECT') {
			this.tenative_term.title = event.target.options[event.target.selectedIndex].text;
		}
		if (this.tenative_term.title) {
			this.tenative_term.position = get_position(event);
			this.tenative_term.timer = this.current_document.defaultView.setTimeout(function () {
				rcxMain.showTitle();
			}, rcxConfig.popdelay);
			return;
		}
	},

	//force is true if we want to destroy the current popup_window element (such as when rcxMain is being disabled)
	clearView: function (force) {
		if (rcxConfig.sticky && !force) {
			return;
		}
		var sel = this.current_document.defaultView.getSelection();
		if (sel.isCollapsed || (this.previous_term.selText == sel.toString())) {
			sel.removeAllRanges();
		}
		this.previous_term.selText = null;
		this.tenative_term = {};
		this.popup_window.destroy();
	},

	//usePrevious is true when we want use the information contained in previous_term
	//usePrevious is false when we want use the information contained in tenative_term (only caller is onmousemove)
	showTitle: function (usePrevious) {
		var title = usePrevious? this.previous_term.title : this.tenative_term.title;
		if(!title) { return; }
		var e = rcxData.translate(title);
		if (!e) {
			this.clearView();
			return;
		}

		// tenative_term was a new valid term, set previous_term to it
		if(!usePrevious) {
			this.previous_term.target = this.tenative_term.target;
			this.previous_term.rangeNode = this.tenative_term.rangeNode;
			this.previous_term.rangeOffset = this.tenative_term.rangeOffset;
			this.previous_term.title = this.tenative_term.title;
			this.previous_term.currentOffset = this.tenative_term.currentOffset ;
			this.previous_term.position = this.tenative_term.position;
			this.previous_term.timer = this.tenative_term.timer;
		}

		this.tenative_term={};
		e.title = title.substr(0, e.textLen).replace(/[\x00-\xff]/g, function (c) {
			return '&#' + c.charCodeAt(0) + ';';
		});
		if (title.length > e.textLen) e.title += '...';

		this.lastFound = [e];
		this.previous_term.titleShown = true;
		this.popup_window.show(this.current_document, rcxData.makeHtml(e), this.previous_term.target, this.previous_term.position);
	},

	//usePrevious is true when we want use the information contained in previous_term
	//usePrevious is false when we want use the information contained in tenative_term (only caller is onmousemove)
	//only returns false if we we could potentially get a word in the current node but not with the current rangeoffset
	show: function (usePrevious) {
		if(usePrevious) {
			var rangeParent = this.previous_term.rangeNode;
			var rangeOffset = this.previous_term.rangeOffset + this.previous_term.currentOffset;
			this.previous_term.currentOffsetEnd = 1;
		}
		else {
			var rangeParent = this.tenative_term.rangeNode;
			var rangeOffset = this.tenative_term.rangeOffset + this.tenative_term.currentOffset;
			this.tenative_term.currentOffsetEnd = 1;
		}

		//current node is invalid
		if (!rangeParent) {
			this.clearView();
			return true;
		}

		//offset is invalid
		if ((rangeOffset < 0) || (rangeOffset >= rangeParent.data.length)) {
			this.clearView();
			return true;
		}

		// @@@ check me
		// I think this checks if the first character is a valid CJKV character
		var u = rangeParent.data.charCodeAt(rangeOffset);
		if ((isNaN(u)) || ((u != 0x25CB) && ((u < 0x3001) || (u > 0x30FF)) && ((u < 0x3400) || (u > 0x9FFF)) && ((u < 0xF900) || (u > 0xFAFF)) && ((u < 0xFF10) || (u > 0xFF9D)))) {
			this.clearView();
			return true;
		}

		//selection end data
		var selEndList = [];

		// The text here will be used to lookup the word
		var text = text_manipulator.getTextFromRange(rangeParent, rangeOffset, selEndList, 20);

		// The text from the currently selection node + 50 more characters from the next nodes
		var sentence = text_manipulator.getTextFromRange(rangeParent, 0, selEndList, rangeParent.data.length + 50);

		// 50 characters from the previous nodes.
		// The above sentence var will stop at first ruby tag encountered to the
		// left because it has a different node type. prevSentence will start where
		// the above sentence left off moving to the left and will capture the ruby tags.
		var prevSentence = text_manipulator.getTextFromRangePrev(rangeParent, 0, selEndList, 50);

		// Combine the full sentence text, including stuff that will be chopped off later.
		sentence = prevSentence + sentence;


		//
		// Find the sentence in the node
		//

		// Get the position of the first selected character in the sentence variable
		var i = rangeOffset + prevSentence.length;

		var sentenceStartPos;
		var sentenceEndPos;

		// Find the last character of the sentence
		while (i < sentence.length) {
			if (sentence[i] == "\u3002" || sentence[i] == "\n" || sentence[i] == "\uFF1F" ||  sentence[i] == "\uFF01") {
				sentenceEndPos = i;
				break;
			} else if (i == (sentence.length - 1)) {
				sentenceEndPos = i;
			}
			i++;
		}

		i = rangeOffset + prevSentence.length;


		// Find the first character of the sentence
		while (i >= 0) {
			if (sentence[i] == "\u3002" || sentence[i] == "\n" || sentence[i] == "\uFF1F" || sentence[i] == "\uFF01") {
				sentenceStartPos = i + 1;
				break;
			} else if (i == 0) {
				sentenceStartPos = i;
			}
			i--;
		}

		// Extract the sentence
		sentence = sentence.substring(sentenceStartPos, sentenceEndPos + 1);

		var startingWhitespaceMatch = sentence.match(/^\s+/);

		// Strip out control characters
		sentence = sentence.replace(/[\n\r\t]/g, '');

		var startOffset = 0;

		// Adjust offset of selected word according to the number of
		// whitespace chars at the beginning of the sentence
		if (startingWhitespaceMatch) {
			startOffset -= startingWhitespaceMatch[0].length;
		}

		// Trim
		sentence = sentence.trim();

		this.sentence = sentence;

		if (text.length == 0) {
			this.clearView();
			return false;
		}
		var e = rcxData.wordSearch(text);
		if (e == null) {
			this.clearView();
			return false;
		}

		// tenative_term contained a valid term, set previous_term to it
		if(!usePrevious) {
			this.previous_term.target = this.tenative_term.target;
			this.previous_term.rangeNode = this.tenative_term.rangeNode;
			this.previous_term.rangeOffset = this.tenative_term.rangeOffset;
			this.previous_term.title = this.tenative_term.title;
			this.previous_term.currentOffset = this.tenative_term.currentOffset ;
			this.previous_term.position = this.tenative_term.position;
			this.previous_term.timer = this.tenative_term.timer;
		}
		this.tenative_term={};

		this.lastFound = [e];

		 // Find the highlighted word, rather than the JMDICT lookup
		this.word = text.substring(0, e.matchLen);

		var wordPosInSentence = rangeOffset + prevSentence.length - sentenceStartPos + startOffset;

		// Add blanks in place of the hilighted word for use with the save feature
		sentenceWBlank = sentence.substring(0, wordPosInSentence) + "___"
					+ sentence.substring(wordPosInSentence + e.matchLen, sentence.length);

		this.sentenceWBlank = sentenceWBlank;

		if (!e.matchLen) e.matchLen = 1;
		this.previous_term.currentOffsetEnd = e.matchLen;
		this.previous_term.currentOffset = (rangeOffset - this.previous_term.rangeOffset);
		// don't try to highlight form elements
		if (!('form' in this.previous_term.target)) {
			var selected_text = text_manipulator.highlightMatch(this.current_document, rangeParent, rangeOffset, e.matchLen, selEndList, this.previous_term);
			if (selected_text) {
				this.previous_term.selText = selected_text;
			}
		}

		this.previous_term.titleShown = false;
		this.popup_window.show(this.current_document, rcxData.makeHtml(e), this.previous_term.target, this.previous_term.position);
		return true;
	},

	moveToPreviousWord: function () {
		var ofs = this.previous_term.currentOffset;
		for (var i = 50; i > 0; --i) {
			this.previous_term.currentOffset = --ofs;
			rcxData.select(0);
			if (this.show(true)) {
				if (ofs >= this.previous_term.currentOffset) break;	// ! change later
			}
		}
	},

	moveToNextWord: function () {
		for (var i = 50; i > 0; --i) {
			this.previous_term.currentOffset += this.previous_term.currentOffsetEnd;
			rcxData.select(0);
			if (this.show(true)) break;
		}
	},

	//changes altView
	move: function () {
		this.popup_window.altView = (this.popup_window.altView + 1) % 3;
		this.show(true);
	},

	lastFound: null, //array of definitions of last defined term

	/* Get the pitch accent of the last hilighted word if present. If inExpression is not provided,
	 will get the pitch accent for the hilited word's expression and reading */
	getPitchAccent: function(inExpression, inReading)	{
		try {
			// Get file pointer to the pitch accent sqlite database
			var pitchDbFile = Services.io.newURI(resourceURI.spec + "pitch_accents.sqlite", null, null).QueryInterface(Ci.nsIFileURL).file;

			// Open the pitch accent database
			var pitchDB = new RcxDb(pitchDbFile);
			pitchDB.open();

			// If the caller provided an expression/reading, use them, otherwise use the
			// expression/reading of the hilited word
			if(inExpression)  {
				var expression = inExpression;
				var reading = inReading;
			}
			else {
				var hilitedEntry = this.lastFound;

				if ((!hilitedEntry) || (hilitedEntry.length == 0)
				  || !hilitedEntry[0] || !hilitedEntry[0].data[0])	{
					return "";
				}

				var entryData = hilitedEntry[0].data[0][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);

				//   entryData[0] = kanji/kana + kana + definition
				//   entryData[1] = kanji (or kana if no kanji)
				//   entryData[2] = kana (null if no kanji)
				//   entryData[3] = definition

				var expression = entryData[1];
				var reading = entryData[2];
			}

			// Form the SQL used to query the pitch accent
			if(!reading)  {
				var stPitch = ["SELECT pitch FROM Dict WHERE expression=?1 LIMIT 1", expression];
			}
			else {
				var stPitch =["SELECT pitch FROM Dict WHERE expression=?1  AND reading=?2 LIMIT 1", expression, reading];
			}

			// Get the result of the query
			var pitch = pitchDB.exec.apply(pitchDB, stPitch)[0].pitch;

			pitchDB.close();

			// If user wants to hide the part-of-speech unless , or | is present
			if(rcxConfig.hidepitchaccentpos) {
				if((pitch.indexOf(",") == -1) && (pitch.indexOf("|") == -1)) {
					pitch = pitch.replace(/\(.*?\)/g, "")
				}
			}

			return pitch;
		}
		catch(ex) {
		  return "";
		}

		return "";
	},

	savePrep: function (clip) {
		var text;
		var i;
		var f;
		var e;
		var s;
		var w;
		var sWBlank;

		f = this.lastFound;
		s = this.sentence;
		sWBlank = this.sentenceWBlank;
		w = this.word;

		if ((!f) || (f.length == 0)) return null;

		e = f[0];
		text = rcxData.makeText(e, w, s, sWBlank, false, this.current_document.location.href);

		if (rcxConfig.snlf == 1) text = text.replace(/\n/g, '\r\n');

		var sep = rcxConfig.ssep;
		switch (sep) {
			case 'Tab':
				sep = '\t';
				break;
			case 'Comma':
				sep = ',';
				break;
			case 'Space':
				sep = ' ';
				break;
		}
		if (sep != '\t') return text.replace(/\t/g, sep);

		return text;
	},

	copyToClip: function () {
		var text;

		if ((text = this.savePrep(1)) != null) {
			Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper)
				.copyString(text);
			log('Copied to clipboard.');
		}
	},

	saveToFile: function () {
		var text;
		var i;
		var lf, fos, os;

		try {
			if ((text = this.savePrep(0)) == null) return;

			if (rcxConfig.sfile.length == 0) {
				log('Set filename in preferences');
				return;
			}

			lf = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
			lf.initWithPath(rcxConfig.sfile);
			let exists = lf.exists();

			fos = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
			fos.init(lf, 0x02 | 0x08 | 0x10, -1, 0);

			if ((!exists) && (rcxConfig.ubom) && (rcxConfig.sfcs == 'utf-8')) {
				let bom = '\xEF\xBB\xBF';
				fos.write(bom, bom.length);
			}

			// note: nsIConverterOutputStream always adds BOM for UTF-16

			os = Cc['@mozilla.org/intl/converter-output-stream;1'].createInstance(Ci.nsIConverterOutputStream);
			os.init(fos, rcxConfig.sfcs, 0, 0x3F); // unknown -> '?'
			os.writeString(text);
			os.close();

			fos.close();
			log('Saved');

		} catch (ex) {
			log('Error while saving: ' + ex);
		}
	},
};