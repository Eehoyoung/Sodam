param(
  [switch]$FailOnScanner,
  [switch]$Coverage,
  [switch]$All
)

# Phase 3 Verification Script — Scanner + Tests (curated by default)
# Env: Windows + PowerShell; Paths use backslashes (\)
# Purpose: Run disallowed-endpoint scanner and Jest tests. By default runs curated Phase 2 service tests; use -All to run entire suite.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$logsDir = Join-Path $repoRoot 'logs'
if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

$reportPath = Join-Path $logsDir 'phase3-verification-report.md'
$scannerReport = Join-Path $logsDir 'qr-scan-report.md'

function Write-Section($title) {
  Add-Content -Path $reportPath -Value "`n### $title`n"
}

# Start fresh report
"# Phase 3 Verification Report`n`n- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm K')`n- Env: Windows + PowerShell; RN 0.81.0 / React 19.1.0`n- Actions: Scanner (-FailOnMatch), Jest tests $([bool]$Coverage -replace 'True','(coverage)')`n- Test Scope: $([bool]$All -replace 'True','ALL' -replace 'False','CURATED Phase 2 suites')`n" | Set-Content -Path $reportPath

# 1) Run scanner
Write-Section 'Scanner (disallowed endpoints)'
try {
  Push-Location $repoRoot
  powershell -ExecutionPolicy Bypass -File .\scripts\scan-qr-residue.ps1 -FailOnMatch | Tee-Object -Variable scannerOut | Out-Null
  Pop-Location
  Add-Content -Path $reportPath -Value "Result: PASS`n"
  if (Test-Path $scannerReport) {
    Add-Content -Path $reportPath -Value "See: $scannerReport`n"
  }
} catch {
  Add-Content -Path $reportPath -Value "Result: FAIL`nError: $($_.Exception.Message)`n"
  if ($FailOnScanner) { throw }
}

# 2) Run tests
Write-Section 'Jest Tests'
try {
  Push-Location $repoRoot
  $npmCmd = ''
  if ($All) {
    if ($Coverage) { $npmCmd = 'npm test -- --coverage' } else { $npmCmd = 'npm test' }
  } else {
    $patterns = @(
      '__tests__/wage/wageService.test.ts',
      '__tests__/salary/payrollService.test.ts',
      '__tests__/store/storeService.test.ts',
      '__tests__/qna/qnaService.test.ts',
      '__tests__/myPage/timeOffService.test.ts',
      '__tests__/myPage/masterService.test.ts',
      '__tests__/auth/userService.test.ts'
    )
    $prefix = 'npm test -- '
    $coverageFlag = ''
    if ($Coverage) { $coverageFlag = '--coverage ' }
    $npmCmd = $prefix + $coverageFlag + ($patterns -join ' ')
  }
  Write-Host "[RUN] $npmCmd"
  cmd /c $npmCmd | Tee-Object -Variable jestOut | Out-Null
  Pop-Location
  Add-Content -Path $reportPath -Value "Result: PASS`n"
} catch {
  Add-Content -Path $reportPath -Value "Result: FAIL`nError: $($_.Exception.Message)`n"
  throw
}

Add-Content -Path $reportPath -Value "`n---`nAll checks done."

Write-Host "Phase 3 verification complete. Report: $reportPath"
