#!perl
use v5.16;
use strict;
use warnings;

use File::Slurp;

chdir shift @ARGV;

my $bootstrap='';

for(sort glob('*.js')) {
	$bootstrap .= read_file($_);
	$bootstrap .= "\n";
}

chdir '..';
print $bootstrap;