param(
  [string]$Out = "logs\\android-env-$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
)

$ErrorActionPreference = 'Continue'

# Ensure logs directory exists
$logsDir = Split-Path -Parent $Out
if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Force -Path $logsDir | Out-Null }

function Write-Section($title) {
  "`n=== $title ===`n" | Tee-Object -FilePath $Out -Append
}

"Android Environment Collection - $(Get-Date -Format o)" | Tee-Object -FilePath $Out

Write-Section "Java Version"
try { & java -version 2>&1 | Tee-Object -FilePath $Out -Append } catch { "java not found" | Tee-Object -FilePath $Out -Append }

Write-Section "Gradle Wrapper Version"
try { & .\android\gradlew.bat -v 2>&1 | Tee-Object -FilePath $Out -Append } catch { "gradle wrapper failed" | Tee-Object -FilePath $Out -Append }

Write-Section "Gradle Wrapper Properties"
try { Get-Content -Raw android\gradle\wrapper\gradle-wrapper.properties | Tee-Object -FilePath $Out -Append } catch { }

Write-Section "Top-level build.gradle (plugin versions)"
try {
  $content = Get-Content -Raw android\build.gradle
  ($content -split "`n") | Where-Object { $_ -match 'id\("com.android.application"\)|id\("org.jetbrains.kotlin.android"\)|id\("com.facebook.react"\)' } | Tee-Object -FilePath $Out -Append
} catch { }

Write-Section "Ext kotlinVersion"
try {
  $content = Get-Content -Raw android\build.gradle
  ($content -split "`n") | Where-Object { $_ -match 'kotlinVersion' } | Tee-Object -FilePath $Out -Append
} catch { }

Write-Section "AGP Compile/Target SDK from app/build.gradle"
try {
  $content = Get-Content -Raw android\app\build.gradle
  ($content -split "`n") | Where-Object { $_ -match 'compileSdkVersion|targetSdkVersion|minSdkVersion|ndkVersion' } | Tee-Object -FilePath $Out -Append
} catch { }

Write-Section "gradle.properties"
try { Get-Content -Raw android\gradle.properties | Tee-Object -FilePath $Out -Append } catch { }

Write-Section "Generated Android-autolinking.cmake exists?"
$autoPath = "android\app\build\generated\autolinking\src\main\jni\Android-autolinking.cmake"
if (Test-Path $autoPath) { "FOUND: $autoPath" | Tee-Object -FilePath $Out -Append } else { "MISSING: $autoPath" | Tee-Object -FilePath $Out -Append }

Write-Section "Node/React Native versions"
try { & node -v 2>&1 | Tee-Object -FilePath $Out -Append } catch {}
try { & npm -v 2>&1 | Tee-Object -FilePath $Out -Append } catch {}
try { & npx react-native --version 2>&1 | Tee-Object -FilePath $Out -Append } catch {}

"Done. Output saved to $Out" | Tee-Object -FilePath $Out -Append
