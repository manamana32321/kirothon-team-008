param(
  [string]$Ref = "origin/main",
  [string]$Device = "",
  [switch]$NoInstall
)
$ErrorActionPreference = "Stop"

$BuildDir = "C:\gymcall-android"
$Repo = "~/kirothon-team-008-worktrees/main"
$env:JAVA_HOME = "D:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "D:\asdk"
$Adb = "D:\asdk\platform-tools\adb.exe"
$Apk = "$BuildDir\android\app\build\outputs\apk\debug\app-debug.apk"
$PhoneIp = "100.85.176.33"

Write-Host "== sync $Ref -> $BuildDir"
$sync = "set -e; cd $Repo; git fetch -q origin; T=`$(mktemp -d); git archive $Ref android-app | tar -x -C `$T; rsync -rc --exclude node_modules --exclude build --exclude .gradle --exclude local.properties --exclude capacitor-cordova-android-plugins `$T/android-app/ /mnt/c/gymcall-android/; rm -rf `$T; git rev-parse --short $Ref"
wsl -e bash -lc $sync
if ($LASTEXITCODE -ne 0) { throw "sync failed" }

Write-Host "== build"
cmd /c "cd /d $BuildDir\android && .\gradlew.bat assembleDebug --console=plain -q 2>&1"
$code = $LASTEXITCODE
if ($code -ne 0) { throw "gradle failed ($code)" }
Write-Host "apk $Apk $((Get-Item $Apk).LastWriteTime)"
if ($NoInstall) { exit 0 }

Write-Host "== device"
function Ready { (& $Adb devices) -match "`tdevice$" | ForEach-Object { ($_ -split "`t")[0] } }
if ($Device) { & $Adb connect $Device | Out-Host }
$ready = @(Ready)
if ($ready.Count -eq 0) {
  Write-Host "scanning $PhoneIp 30000-49999 for wireless debugging"
  for ($start = 30000; $start -le 49999 -and $ready.Count -eq 0; $start += 2000) {
    $tasks = @{}
    foreach ($p in $start..([Math]::Min($start + 1999, 49999))) {
      $c = New-Object System.Net.Sockets.TcpClient
      $tasks[$p] = @($c, $c.ConnectAsync($PhoneIp, $p))
    }
    Start-Sleep -Milliseconds 1500
    $open = foreach ($p in $tasks.Keys) {
      $c, $t = $tasks[$p]
      if ($t.Status -eq "RanToCompletion" -and $c.Connected) { $p }
      $c.Close()
    }
    foreach ($p in $open) {
      $out = & $Adb connect "${PhoneIp}:$p"
      if ($out -match "^connected") { break }
    }
    $ready = @(Ready)
  }
}
& $Adb devices | Where-Object { $_ -match "`toffline$" } | ForEach-Object { & $Adb disconnect (($_ -split "`t")[0]) | Out-Null }
$ready = @(Ready)
if ($ready.Count -eq 0) { throw "no device. turn on wireless debugging; if never paired, run: adb pair IP:PORT CODE" }
$serial = $ready[0]

Write-Host "== install on $serial"
& $Adb -s $serial install -r $Apk
if ($LASTEXITCODE -ne 0) { throw "install failed" }
& $Adb -s $serial shell am start -n win.json_server.gymcall/.MainActivity | Out-Host
