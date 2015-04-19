#Rikaichan for Android

This is a port of Rikaisama for Firefox for Android. Not all features are supported.

[Downloads](https://github.com/ispedals/Rikachan-Android/releases); [Forum](http://forum.koohii.com/viewtopic.php?pid=228159)

## Usage
From the menu, tap the Rikachan button so that it is checked. A message should appear saying Rikaichan is enabled. When you tap the first character of a word on a webpage, the Rikaichan popup will appear. Tapping on another word or tapping on the popup itself will make it go away. Double tapping, scrolling, and pinching still work and will not cause the current popup to disappear. Rikaichan will be enabled on all tabs. To disable Rikaichan, tap the Rikaichan button from the menu again.

### Popup window
Unlike the normal Rikaichan popup, the popup contains four icons:

* ⇦: Tapping this will cause Rikaichan to move one character back. This is useful if, for example, you are looking up the word 理解 and accidentally tap 解 instead of 理. Tapping this arrow will make Rikaichan move a character back and will now correctly look up and display the definition of 理解.
* ⇨: Tapping this will cause Rikaichan go to the next word if possible. Rikaichan does not try very hard to find the next valid word, so this may not always work.
* 💾: Saves the current term to a file. You must first set the filename in the options.
* ✂: Copies the current term to the clipboard.
You can also customize the format of how the term is saved/copied like in Rikaisama in the options (see Options below)

Tapping the popup will cause it to close, but tapping any of these icons will not.

### Options
See http://mzl.la/MGnc0n for how to access the options

## Known Issues
* It is not possible to select a link
* Tapping near a link causes the link to be pressed instead of the word
* The popup is not optimized for small screens

##Development
To use in Firefox for Desktop, install the addon, debug the addon, and in the console type `context.rcxMain.toggle()`.

###Notes
* Update rcxDicList when the dictionary version changes

##License
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
