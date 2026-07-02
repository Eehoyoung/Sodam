# Run an iteration loop: optional permissions -> metro reset -> android run
# This is a convenience script; ensure Android emulator/device is available.

param(
  [string]$Device = "auto",
  [int]$TimeoutSec = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  $repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  Push-Location $repoRoot
  try {
    Write-Host "[iter] Optional: granting permissions (best-effort)"
    if (Test-Path '.\scripts\grant-permissions.ps1') {
      try { powershell -ExecutionPolicy Bypass -File .\scripts\grant-permissions.ps1 } catch { Write-Warning "[iter] grant-permissions failed: $($_.Exception.Message)" }
    }

    Write-Host "[iter] Metro reset cache"
    npx react-native start --reset-cache

    Write-Host "[iter] Running Android app"
    npx react-native run-android
  } finally {
    Pop-Location
  }
  Write-Host "[iter] Iteration completed"
  exit 0
} catch {
  Write-Error "[iter] Failed: $($_.Exception.Message)"
  exit 1
}
