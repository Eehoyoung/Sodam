# Verify presence of critical native modules and Android configuration
# Outputs a simple report for iterative troubleshooting (Windows PowerShell)

param(
  [string]$Device = "auto",
  [string]$Out = "logs/verify-native-modules.log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  $repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  $androidDir = Join-Path $repoRoot 'android'
  $outPath = Join-Path $repoRoot $Out
  $outDir = Split-Path -Parent $outPath
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

  $lines = @()
  $lines += "[verify-native-modules] Repo: $repoRoot"
  $lines += "[verify-native-modules] Android Dir Exists: " + (Test-Path $androidDir)

  # Read package.json as text for simple dependency checks
  $pkgJsonPath = Join-Path $repoRoot 'package.json'
  if (-not (Test-Path $pkgJsonPath)) { throw "package.json not found at $pkgJsonPath" }
  $pkgText = Get-Content $pkgJsonPath -Raw

  $depsToCheck = @(
    'react-native-reanimated',
    'react-native-screens',
    '@react-native-async-storage/async-storage'
  )

  foreach ($d in $depsToCheck) {
    $pattern = '"' + $d + '"'
    if ($pkgText -match $pattern) {
      $lines += "[dep] ${d}: present"
    } else {
      $lines += "[dep] ${d}: missing"
    }
  }

  $settings = Join-Path $androidDir 'settings.gradle'
  $appGradle = Join-Path $androidDir 'app\build.gradle'
  $lines += "[file] settings.gradle exists: " + (Test-Path $settings)
  $lines += "[file] app/build.gradle exists: " + (Test-Path $appGradle)

  $babelPath = Join-Path $repoRoot 'babel.config.js'
  $hasBabel = Test-Path $babelPath
  $lines += "[file] babel.config.js exists: $hasBabel"
  if ($hasBabel) {
    $babelContent = Get-Content $babelPath -Raw
    $lines += "[babel] has RN preset: " + ($babelContent -match "@react-native/babel-preset")
    $lines += "[babel] mentions reanimated plugin: " + ($babelContent -match "react-native-reanimated/plugin")
  }

  $lines += "[hint] Next: run 'npm run metro-reset' then 'npm run android:run'"

  $lines | Set-Content -Path $outPath -Encoding UTF8
  Write-Host "[verify-native-modules] Report written to $outPath"
  exit 0
} catch {
  Write-Error "[verify-native-modules] Failed: $($_.Exception.Message)"
  exit 1
}
