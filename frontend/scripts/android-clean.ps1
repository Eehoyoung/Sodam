# Requires: Windows PowerShell
# Purpose: Clean Android Gradle build (Windows-friendly) without changing RN versions or architecture

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  Write-Host "[android-clean] Starting clean..."
  $repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  $androidDir = Join-Path $repoRoot 'android'

  if (-not (Test-Path $androidDir)) {
    throw "Android directory not found at: $androidDir"
  }

  Push-Location $androidDir
  try {
    if (Test-Path '.\gradlew.bat') {
      Write-Host "[android-clean] Running gradlew.bat clean"
      & .\gradlew.bat clean
    } elseif (Test-Path '.\gradlew') {
      Write-Host "[android-clean] Running gradlew clean"
      & .\gradlew clean
    } else {
      throw 'Gradle wrapper not found. Please run Gradle from Android Studio or install wrapper.'
    }
  } finally {
    Pop-Location
  }

  Write-Host "[android-clean] Clean completed successfully."
  exit 0
} catch {
  Write-Error "[android-clean] Failed: $($_.Exception.Message)"
  exit 1
}
