#!perl
use v5.16;
use strict;
use warnings;

use Archive::Zip;

my $zip = Archive::Zip->new();
my $dir = shift @ARGV;
$zip->addTree($dir);
$zip->writeToFileNamed("$dir.xpi");


exit if @ARGV >0;
use File::Copy;

move("$dir.xpi", 'C:\Users\Owner\Desktop\Dropbox\Public' . "\\$dir.xpi");