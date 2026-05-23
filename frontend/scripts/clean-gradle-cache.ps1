param(
  [switch]$Force
)

<#
.SYNOPSIS
  Cleans Gradle caches to resolve cache corruption issues (e.g., metadata.bin missing) on Windows.

.DESCRIPTION
  Removes:
    - System-level Gradle caches at C:\gradle\caches (if present)
    - User Gradle caches at $env:USERPROFILE\.gradle\caches
    - Project Gradle caches at .\.gradle and android\.gradle
  Recreates empty directories where appropriate. Safe to run multiple times.

.USAGE
  powershell -ExecutionPolicy Bypass -File .\scripts\clean-gradle-cache.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\clean-gradle-cache.ps1 -Force   # suppress prompts

.NOTES
  - Close Android Studio/Gradle daemons before running for best results.
  - After cleaning, run: powershell -ExecutionPolicy Bypass -File .\gradlew.bat :app:tasks (from android dir) or npm run android
#>

function Remove-PathSafe {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [switch]$Recreate
  )
  if (Test-Path -LiteralPath $Path) {
    Write-Host "[INFO] Removing $Path" -ForegroundColor Yellow
    try {
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
      $errMsg = $_.Exception.Message
      Write-Warning ("[WARN] Failed to remove {0}: {1}" -f $Path, $errMsg)
    }
  } else {
    Write-Host "[INFO] Path not found (skip): $Path" -ForegroundColor DarkGray
  }
  if ($Recreate) {
    try { New-Item -ItemType Directory -Force -Path $Path | Out-Null } catch {}
  }
}

if (-not $Force) {
  $resp = Read-Host "This will delete Gradle caches. Proceed? (y/N)"
  if ($resp -ne 'y' -and $resp -ne 'Y') { Write-Host "Aborted."; exit 1 }
}

Write-Host "[STEP] Stopping Gradle daemons" -ForegroundColor Cyan
try { & gradle --stop 2>$null } catch {}
try { & .\gradlew.bat --stop 2>$null } catch {}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

$paths = @(
  "C:\\gradle\\caches",
  "$env:USERPROFILE\.gradle\caches",
  "$projectRoot\.gradle",
  "$projectRoot\android\.gradle"
)

Write-Host "[STEP] Removing caches" -ForegroundColor Cyan
foreach ($p in $paths) { Remove-PathSafe -Path $p }

Write-Host "[STEP] Cleaning Android build folders" -ForegroundColor Cyan
Remove-PathSafe -Path "$projectRoot\android\app\build"
Remove-PathSafe -Path "$projectRoot\android\build"

Write-Host "[DONE] Gradle caches cleaned. You can now re-run the Android build:" -ForegroundColor Green
Write-Host "  cd android; .\\gradlew.bat clean assembleDebug" -ForegroundColor Green
