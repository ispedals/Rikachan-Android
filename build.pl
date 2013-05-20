#!perl
use v5.16;
use warnings;
use File::Path 'remove_tree';
use File::Slurp;
use Archive::Zip;
use File::Copy;


my $arg = shift @ARGV || '';

if( $arg =~ /HELP/i) {
	print <<'EOF';
perl build.pl [options]

Cleans build directory and create xpi without names dictionary

Additional Options:
name: creates xpi with names dictionary
install: pushes created xpi to device
clean: deletes build directory and xpi's
EOF
}

say 'cleaning';	
remove_tree('build');
say 'removed build directory';
unlink glob "*.xpi";
say 'deleted xpi';

if($arg =~ /CLEAN/i) {
	exit;
}

mkdir 'build';

say 'created build directory';

copy('etc/deinflect.dat', 'build/deinflect.dat');
copy('etc/jpen-dict-copyright.txt', 'build/jpen-dict-copyright.txt');
copy('etc/jpen.sqlite', 'build/jpen.sqlite');
copy('etc/kanji-copyright.txt', 'build/kanji-copyright.txt');
copy('etc/kanji.dat', 'build/kanji.dat');
copy('etc/license.txt', 'build/license.txt');
copy('etc/popup-blue.css', 'build/popup-blue.css');
copy('etc/radicals.dat', 'build/radicals.dat');

copy('install.rdf', 'build/install.rdf');
copy('options.xul', 'build/options.xul');

say 'copied etc files';

my $xpi = 'Rikaichan.Android+jpen';

my $bootstrap='';

for(sort glob('*.js')) {
	$bootstrap .= read_file($_);
	$bootstrap .= "\n";
}

say 'created bootstrap.js';

if($arg =~ /NAME/i) {
	say 'using names';
	$bootstrap =~ s/(USING_NAMES = )(false|true)/$1true/;
	$xpi .= '+jpname';
	copy('etc/jpname.sqlite', 'build/jpname.sqlite');
	copy('etc/jpname-dict-copyright.txt', 'build/jpname-dict-copyright.txt');
	say 'copied jpname-dict';
}
else {
	say 'not using names';
	$bootstrap =~ s/(USING_NAMES = )(false|true)/$1false/;
}

$xpi .= '+next';

say "going to call xpi $xpi";

write_file('build/bootstrap.js', $bootstrap);

my $zip = Archive::Zip->new();
$zip->addTree('build');
$zip->writeToFileNamed("$xpi.xpi");


if($arg =~ /INSTALL/i) {
	say 'installing';
	system('adb', 'push', "$xpi.xpi", '/sdcard/rikai.xpi');
	system('adb', 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-c', 'android.intent.category.DEFAULT', '-d', 'file:///mnt/sdcard/rikai.xpi', '-n', 'org.mozilla.firefox/.App');
}