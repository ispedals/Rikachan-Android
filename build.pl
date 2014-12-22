use v5.18;
use warnings;
use Archive::Zip;

my @INCLUDE_FILES = qw/bootstrap.js chrome.manifest install.rdf LICENSE.md options.xul README.md/;
my @INCLUDE_DIRS = qw/content/;

my $ZIP_NAME = 'RikaichanforAndroid.xpi';

unlink glob "*.xpi";

my $zip = Archive::Zip->new();

$zip->addFile($_) for @INCLUDE_FILES;
$zip->addTree($_, $_) for @INCLUDE_DIRS;

$zip->writeToFileNamed($ZIP_NAME);

