perl build.pl Rikaichan.Android > Rikaichan.Android+jpen+next\bootstrap.js
perl -pi.bak -e "s/(USING_NAMES = )(false|true)/$1false/" Rikaichan.Android+jpen+next\bootstrap.js && del Rikaichan.Android+jpen+next\bootstrap.js.bak
perl xpi.pl Rikaichan.Android+jpen+next no
adt-bundle-windows\sdk\platform-tools\adb push Rikaichan.Android+jpen+next.xpi /sdcard/rikai.xpi
adt-bundle-windows\sdk\platform-tools\adb shell am start -a android.intent.action.VIEW -c android.intent.category.DEFAULT -d file:///mnt/sdcard/rikai.xpi -n org.mozilla.firefox/.App
