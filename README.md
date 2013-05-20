#Rikaichan for Android

This is a port of Rikaichan (specifically Rikaisama v17.3) for Firefox for Android. Not all features are supported. Downloads can be found at http://forum.koohii.com/viewtopic.php?pid=192993#p192993 . 

## Installation Instructions
If you have installed Rikaichan Android before, uninstall it (menu ➡ addons ➡ Rikaichan Android ➡ uninstall) and restart Firefox before installing the new version

From Firefox for Android, tap the link of the version you want. It should then say "Downloading addon". After a while, depending on your connection speed, it should ask if you want to install Rikaichan Android. After clicking install, wait until the "installation complete" message appears. If you click on the menu, you should see a new item that says "Rikaichan".

## Usage
From the menu, tap the Rikachan button. A message should appear saying Rikaichan is enabled. When you tap the first character of a word on a webpage, the Rikaichan popup will appear. Tapping on another word or tapping on the popup itself will make it go away. Double tapping, scrolling, and pinching still work and will not cause the current popup to disappear. Rikaichan will be enabled on all tabs. To disable Rikaichan, tap the Rikaichan button from the menu again.

### Popup window
Unlike the normal Rikaichan popup, the popup contains five icons:

* ⇦: Tapping this will cause Rikaichan to move one character back. This is useful if, for example, you are looking up the word 理解 and accidentally tap 解 instead of 理. Tapping this arrow will make Rikaichan move a character back and will now correctly look up and display the definition of 理解.
* ⇨: Tapping this will cause Rikaichan go to the next word if possible. Rikaichan does not try very hard to find the next valid word, so this may not always work.
* ❇: Moves the popup to another location.
* 💾: Saves the current term to a file. You must first set the filename in the options.
* ✂: Copies the current term to the clipboard.
You can also customize the format of how the term is saved/copied like in Rikaisama in the options (see Options below)

Tapping the popup will cause it to close, but tapping any of these icons will not.

### Options
The options can be found by tapping the menu ➡ addons ➡ Rikaichan Android. These should mostly be self-explanatory and are all options included in normal Rikaichan and Rikaisama.

* The option, Filename to save to, must be set to be able to save terms to a file. An example filename is: /sdcard/Download/Words.txt
* Save Format uses the same format as in Rikaisama

## Development Notes
Addons for Firefox for Android must be a <a href="https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions">bootstrapped extension</a>, so some architectural changes were required from Rikaichan, which are detailed in the comments
of the various *.js files. The js files themselves have been separated from rikaichan.js for convenience. When built, the js files are concatenated in order to form the bootstrap.js file.

### Building
The build script assumes the existence of an `etc` directory containing the following files from Rikaichan and its dictionary addons:

* deinflect.dat
* jpen-dict-copyright.txt
* jpen.sqlite
* kanji-copyright.txt
* kanji.dat
* license.txt
* popup-blue.css
* radicals.dat
* jpname.sqlite
* jpname-dict-copyright.txt

then run the build script with the desired options:
<code>

perl build.pl [options]

The default action is to clean the build directory and create an xpi without names dictionary

Additional Options:<br>
name: creates xpi with names dictionary<br>
install: pushes created xpi to device<br>
clean: deletes build directory and xpi's<br>
</code>
