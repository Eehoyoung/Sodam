# Grant full CRUD permissions to current user for all files under the repository
# Note: Some operations may require Administrator privileges. Run PowerShell as Administrator if needed.
# This script stays within the project directory; it does not create files outside the repo.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  Write-Host "[grant-permissions] Starting permission grant..."
  $repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  if (-not (Test-Path $repoRoot)) {
    throw "Repository root not found."
  }

  $user = $env:USERNAME
  if (-not $user) { throw 'USERNAME environment variable not found.' }

  Write-Host "[grant-permissions] Repository root: $repoRoot"
  Write-Host "[grant-permissions] Current user: $user"

  # Optionally take ownership (may need admin)
  try {
    Write-Host "[grant-permissions] Taking ownership (best-effort)..."
    takeown /F "$repoRoot" /R /D Y | Out-Null
  } catch {
    Write-Warning "[grant-permissions] takeown failed or requires admin. Continuing to ACL grant..."
  }

  # Grant Full control recursively to the current user
  # (OI)(CI) applies to objects and containers; /T for recursion, /C to continue on errors
  Write-Host "[grant-permissions] Granting Full Control recursively..."
  icacls "$repoRoot" /grant:r "$user:(OI)(CI)F" /T /C | Out-Null

  Write-Host "[grant-permissions] Permissions granted successfully."
  exit 0
} catch {
  Write-Error "[grant-permissions] Failed: $($_.Exception.Message)"
  exit 1
}
