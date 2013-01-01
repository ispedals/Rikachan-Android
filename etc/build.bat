@ECHO OFF
perl build.pl Rikaichan.Android > Rikaichan.Android+jpen\bootstrap.js
perl -pi.bak -e "s/(USING_NAMES = )(false|true)/$1false/" Rikaichan.Android+jpen\bootstrap.js && del Rikaichan.Android+jpen\bootstrap.js.bak
perl xpi.pl Rikaichan.Android+jpen