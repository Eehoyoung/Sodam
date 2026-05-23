param(
  [switch]$FailOnMismatch,
  [string]$Out = "logs\android-verify-$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Helpers
function New-Row([string]$name, [string]$expected, [string]$actual, [bool]$ok, [string]$note = "") {
  [PSCustomObject]@{ Name = $name; Expected = $expected; Actual = $actual; Status = $(if ($ok) { 'PASS' } else { 'FAIL' }); Note = $note }
}

function Write-MDTable($rows) {
  "| Check | Expected | Actual | Status | Note |" | Out-File -FilePath $Out -Encoding UTF8
  "|---|---|---|---|---|" | Out-File -FilePath $Out -Append -Encoding UTF8
  foreach ($r in $rows) {
    "| $($r.Name) | $($r.Expected) | $($r.Actual) | $($r.Status) | $($r.Note) |" | Out-File -FilePath $Out -Append -Encoding UTF8
  }
}

function StatusStr([bool]$flag, [string]$trueVal = 'present', [string]$falseVal = 'missing') {
  if ($flag) { return $trueVal } else { return $falseVal }
}
function BoolStr([bool]$flag) {
  if ($flag) { return 'true' } else { return 'false' }
}
function ValueOrNA([string]$v) {
  if ([string]::IsNullOrEmpty($v)) { return 'n/a' } else { return $v }
}

# Ensure logs dir
$logDir = Split-Path -Parent $Out
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$rows = @()
$now = Get-Date -Format o
"# Android Gradle / Autolinking Verification`n`nGenerated: $now`nRepo: $repoRoot`n" | Out-File -FilePath $Out -Encoding UTF8

# Read files
$wrapperPath = "android\gradle\wrapper\gradle-wrapper.properties"
$topGradle = "android\build.gradle"
$appGradle = "android\app\build.gradle"
$gradleProps = "android\gradle.properties"
$settingsGradle = "android\settings.gradle"
$autoCMake = "android\app\build\generated\autolinking\src\main\jni\Android-autolinking.cmake"

$wrapperText = if (Test-Path $wrapperPath) { Get-Content -Raw $wrapperPath } else { '' }
$topText = if (Test-Path $topGradle) { Get-Content -Raw $topGradle } else { '' }
$appText = if (Test-Path $appGradle) { Get-Content -Raw $appGradle } else { '' }
$propsText = if (Test-Path $gradleProps) { Get-Content -Raw $gradleProps } else { '' }
$settingsText = if (Test-Path $settingsGradle) { Get-Content -Raw $settingsGradle } else { '' }
$autoText = if (Test-Path $autoCMake) { Get-Content -Raw $autoCMake } else { '' }

# Expectations
$expGradle = '8.13'
$expAGP = '8.6.1'
$expKotlin = '2.0.21'
$expRNPlugin = '0.81.0'
$expReactAndroid = '0.81.0'
$expCompile = '36'
$expTarget = '36'
$expMin = '24'
$expNDK = '27.1.12297006'

# Extracts
$actGradle = ($wrapperText -match 'distributionUrl=.*gradle-(?<v>[^-]+)-bin.zip') | Out-Null; $actGradle = $Matches['v']
$actAGP = ($topText -match 'id\("com\.android\.application"\) version "(?<v>[^"]+)"') | Out-Null; $actAGP = $Matches['v']
$actKotlin = ($topText -match 'id\("org\.jetbrains\.kotlin\.android"\) version "(?<v>[^"]+)"') | Out-Null; $actKotlin = $Matches['v']
$actRNPlugin = ($topText -match 'id\("com\.facebook\.react"\) version "(?<v>[^"]+)"') | Out-Null; $actRNPlugin = $Matches['v']
$hasReactAndroidForce = ($topText -match "force 'com.facebook.react:react-android:$expReactAndroid'")
$hasReactNativeSub = ($topText -match "substitute module\('com.facebook.react:react-native'\) using module\('com.facebook.react:react-android:$expReactAndroid'\)")

$actCompile = ($appText -match 'compileSdkVersion\s+(?<v>\d+)') | Out-Null; $actCompile = $Matches['v']
$actTarget = ($appText -match 'targetSdkVersion\s+(?<v>\d+)') | Out-Null; $actTarget = $Matches['v']
$actMin = ($appText -match 'minSdkVersion\s+(?<v>\d+)') | Out-Null; $actMin = $Matches['v']
$actNDK = ($appText -match 'ndkVersion\s+"(?<v>[^"]+)"') | Out-Null; $actNDK = $Matches['v']

$hasHermesTrue = ($propsText -match '(?m)^\s*hermesEnabled\s*=\s*true' -or $topText -match 'hermesEnabled\s*=\s*"true"')
$hasNewArchTrue = ($propsText -match '(?m)^\s*newArchEnabled\s*=\s*true')

$hasSettingsPlugin = ($settingsText -match 'id\("com\.facebook\.react\.settings"\)')
$hasAutolinkCmd = ($settingsText -match 'autolinkLibrariesFromCommand\(\)')
$autoExists = Test-Path $autoCMake

# Autolinking JNI-bearing modules expected
$expectModules = @('react-native-reanimated','react-native-screens','react-native-safe-area-context','react-native-svg','react-native-permissions','@react-native-async-storage/async-storage')
$foundMods = @{}
foreach ($m in $expectModules) { $foundMods[$m] = $false }
if ($autoExists) {
  foreach ($m in $expectModules) {
    if ($autoText -match [Regex]::Escape($m)) { $foundMods[$m] = $true }
  }
}

# Rows
$rows += New-Row 'Gradle Wrapper' $expGradle (ValueOrNA $actGradle) ($actGradle -eq $expGradle)
$rows += New-Row 'AGP (com.android.application)' $expAGP (ValueOrNA $actAGP) ($actAGP -eq $expAGP)
$rows += New-Row 'Kotlin Plugin' $expKotlin (ValueOrNA $actKotlin) ($actKotlin -eq $expKotlin)
$rows += New-Row 'RN Gradle Plugin' $expRNPlugin (ValueOrNA $actRNPlugin) ($actRNPlugin -eq $expRNPlugin)
$rows += New-Row 'Force react-android' "react-android:$expReactAndroid" (StatusStr $hasReactAndroidForce) $hasReactAndroidForce
$rows += New-Row 'Substitute react-native->react-android' "react-android:$expReactAndroid" (StatusStr $hasReactNativeSub) $hasReactNativeSub
$rows += New-Row 'compileSdkVersion' $expCompile (ValueOrNA $actCompile) ($actCompile -eq $expCompile)
$rows += New-Row 'targetSdkVersion' $expTarget (ValueOrNA $actTarget) ($actTarget -eq $expTarget)
$rows += New-Row 'minSdkVersion' $expMin (ValueOrNA $actMin) ($actMin -eq $expMin)
$rows += New-Row 'ndkVersion' $expNDK (ValueOrNA $actNDK) ($actNDK -eq $expNDK)
$rows += New-Row 'Hermes Enabled' 'true' (BoolStr $hasHermesTrue) $hasHermesTrue
$rows += New-Row 'New Architecture Enabled' 'true' (BoolStr $hasNewArchTrue) $hasNewArchTrue
$rows += New-Row 'settings.gradle plugin' 'com.facebook.react.settings' (StatusStr $hasSettingsPlugin) $hasSettingsPlugin
$rows += New-Row 'autolinkLibrariesFromCommand()' 'present' (StatusStr $hasAutolinkCmd) $hasAutolinkCmd
$rows += New-Row 'Android-autolinking.cmake' 'exists' (StatusStr $autoExists 'exists' 'missing') $autoExists

foreach ($kvp in $foundMods.GetEnumerator()) {
  $rows += New-Row ("Autolink module: " + $kvp.Key) 'present' (StatusStr $kvp.Value) $kvp.Value
}

Write-MDTable $rows

$failCount = @($rows | Where-Object { $_.Status -eq 'FAIL' }).Count

"`nSummary: $failCount failure(s). Output: $Out" | Out-File -FilePath $Out -Append -Encoding UTF8

if ($FailOnMismatch -and $failCount -gt 0) {
  Write-Error "Verification failed with $failCount failure(s). See $Out"
  exit 1
} else {
  Write-Host "Verification completed with $failCount failure(s). See $Out"
}
