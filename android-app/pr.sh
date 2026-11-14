set -e
W=~/kirothon-team-008-worktrees/android
mkdir -p $W/android-app
cd /mnt/c/gymcall-android
tar --exclude=node_modules --exclude=build --exclude=.gradle --exclude=local.properties -cf - . | tar -xf - -C $W/android-app
cd $W
printf 'node_modules\nandroid/build\nandroid/app/build\nandroid/.gradle\nandroid/local.properties\nandroid/capacitor-cordova-android-plugins\n' > android-app/.gitignore
git add android-app
git status --short | wc -l
git commit -qm 'feat: Capacitor 안드로이드 앱 셸 추가' -m '배포 URL을 WebView로 로드. 위치·알림·오버레이 권한 선언. 오버레이와 백그라운드 알림은 후속 작업.'
git push -q -u origin feat/android 2>&1 | tail -1
gh pr create --fill --base main --head feat/android 2>&1 | tail -1
