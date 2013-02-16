/*

	Rikaichan Android
	Based on Rikaichan 2.0.7
	Edits by Balloonguy
	Uses public domain code from The Mozilla Developer Network  <https://developer.mozilla.org>

	---

	Rikaisama
	Author:  Christopher Brochtrup
	Contact: cb4960@gmail.com
	Website: http://rikaisama.sourceforge.net/

	---

	Rikaichan
	Copyright (C) 2005-2012 Jonathan Zarate
	http://www.polarcloud.com/

	---

	Originally based on RikaiXUL 0.4 by Todd Rudick
	http://www.rikai.com/
	http://rikaixul.mozdev.org/

	---

	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

	---

	Please do not change or remove any of the copyrights or links to web pages
	when modifying any of the files.

*/
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

const Node = Ci.nsIDOMNode;
const XPathResult = Ci.nsIDOMXPathResult;

//returns a string representation of an object of the form 'key:value'
function print_object(obj) {
	var output = '';
	for (property in obj) {
		try {
			output += property + ': ' + obj[property]+'; ';
		}
		catch(err) {}
	}
	return output;
}

function log(str) { Services.console.logStringMessage(str); }

var resourceURI; //points to install location

const USING_NAMES = false; //using names dictionary (so it will be included in rxcData.dictlist)