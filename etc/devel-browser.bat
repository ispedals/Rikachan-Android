perl build.pl Rikaichan.Android > Rikaichan.Android+jpen+next\bootstrap.js
perl -pi.bak -e "s/(USING_NAMES = )(false|true)/$1false/" Rikaichan.Android+jpen+next\bootstrap.js && del Rikaichan.Android+jpen+next\bootstrap.js.bak
perl xpi.pl Rikaichan.Android+jpen+next no