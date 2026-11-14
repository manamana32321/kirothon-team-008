---
name: android-build
description: 안드로이드 앱(Capacitor 셸, android-app/)을 빌드해서 폰에 설치한다. Use when android-app/ 아래 네이티브 코드(Java, 매니페스트, 리소스, capacitor.config)가 바뀌었을 때, PR 머지 후 폰 앱을 최신으로 맞출 때, 또는 사용자가 "앱 빌드", "APK", "폰에 깔아", "앱 다시 설치"라고 할 때.
---

# 안드로이드 앱 빌드와 설치

앱은 배포 서버(`gymcall.json-server.win`)를 WebView로 띄운다. 그래서 웹 화면 변경은 서버 배포만으로 앱에 반영되고, 이 절차가 필요 없다. APK를 다시 만들어야 하는 것은 `android-app/` 아래 네이티브 변경뿐이다.

## 실행

Windows PowerShell에서 한 줄이다. WSL이 아니다. Gradle과 SDK가 Windows에 있다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "<repo>\.kiro\skills\android-build\build.ps1"
```

- 기본은 `origin/main`을 빌드한다. 브랜치를 시험하려면 `-Ref origin/feat/xxx`.
- 빌드만 하려면 `-NoInstall`.
- 폰 주소를 알면 `-Device IP:PORT`.

WSL에서 레포를 쓰는 경우 `<repo>`는 `\\wsl$\Ubuntu\home\json\code\kirothon-team-008`다. 경로에 한글이 섞여 실행이 안 되면 스크립트를 ASCII 경로로 복사해서 돌린다.

## 스크립트가 하는 일

1. WSL 레포에서 `git archive <ref> android-app`을 풀어 `C:\gymcall-android`로 `rsync`한다. `node_modules`, `build`, `.gradle`, `local.properties`는 건드리지 않는다.
2. `C:\gymcall-android\android`에서 `gradlew.bat assembleDebug`.
3. `adb devices`에 폰이 없으면 Tailscale 주소 `100.85.176.33`의 30000~49999 포트를 훑어 무선 디버깅 포트를 찾아 `adb connect`한다. 오프라인 항목은 끊는다.
4. `adb install -r`로 설치하고 앱을 띄운다.

## 이 PC의 고정값

| 항목 | 값 | 이유 |
|---|---|---|
| 빌드 폴더 | `C:\gymcall-android` | 한글이 든 사용자 경로에서는 Gradle 빌드가 실패한다 |
| SDK | `D:\asdk` | `local.properties`의 `sdk.dir` |
| JDK | `D:\Program Files\Android\Android Studio\jbr` | Android Studio 내장 JDK |
| 폰 | SM-F731N, Tailscale `100.85.176.33` | 무선 디버깅 포트는 켤 때마다 바뀐다 |

## 막혔을 때

| 증상 | 원인과 조치 |
|---|---|
| `no device` | 폰에서 무선 디버깅이 꺼져 있다. 켜 달라고 한다. 처음 쓰는 PC면 "페어링 코드로 기기 페어링"의 `IP:포트`와 6자리 코드를 받아 `adb pair`부터 한다 |
| 포트 스캔이 아무것도 못 찾음 | 폰이나 PC의 Tailscale이 꺼져 있다. 폰 무선 디버깅 첫 화면의 `IP:포트`를 받아 `-Device`로 넘긴다 |
| `gradlew.bat`을 못 찾음 | cmd가 현재 폴더 실행을 막는다. 스크립트는 `.\gradlew.bat`으로 부른다. 직접 돌릴 때도 같다 |
| `JAVA_HOME is not set` | 스크립트 밖에서 Gradle을 돌렸다. 위 JDK 경로를 `JAVA_HOME`에 넣는다 |
| 설치는 됐는데 이름이나 아이콘이 예전 것 | 런처 캐시다. 앱을 지웠다 다시 설치한다 |

## 하지 말 것

- 레포 워크트리 안에서 직접 Gradle을 돌리지 않는다. 경로에 한글이 있으면 빌드가 실패하고, 빌드 산출물이 레포에 섞인다.
- `C:\gymcall-android`에서 코드를 고치지 않는다. 다음 동기화 때 덮어써진다. 고칠 것은 레포 `android-app/`에서 고쳐 PR로 올린다.
- 설치를 끝냈다고 기능이 된다고 보고하지 않는다. 진동, 오버레이처럼 폰에서만 보이는 것은 사용자 확인이 필요하다고 따로 적는다.
