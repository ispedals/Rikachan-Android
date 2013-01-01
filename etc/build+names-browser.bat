@ECHO OFF
perl build.pl Rikaichan.Android > Rikaichan.Android+jpen+jpname\bootstrap.js
perl -pi.bak -e "s/(USING_NAMES = )(false|true)/$1true/" Rikaichan.Android+jpen+jpname\bootstrap.js && del Rikaichan.Android+jpen+jpname\bootstrap.js.bak
perl xpi.pl Rikaichan.Android+jpen+jpname no