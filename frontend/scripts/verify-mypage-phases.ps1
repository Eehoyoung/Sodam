param(
  [switch]$FailOnError
)

$ErrorActionPreference = 'Stop'

# Paths
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$logsDir = Join-Path $repoRoot 'logs'
$mypageReport = Join-Path $logsDir 'mypage_verification_report.md'

# Ensure logs directory exists
if (!(Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

# Verification items
$componentFiles = @(
  'src\common\components\sections\SectionCard.tsx',
  'src\common\components\sections\SectionHeader.tsx',
  'src\common\components\buttons\PrimaryButton.tsx'
)

$screenFiles = @(
  'src\features\myPage\screens\EmployeeMyPageRNScreen.tsx',
  'src\features\myPage\screens\MasterMyPageScreen.tsx',
  'src\features\myPage\screens\PersonalUserScreen.tsx'
)

$requiredImports = @(
  'common/components/sections/SectionCard',
  'common/components/sections/SectionHeader',
  'common/components/buttons/PrimaryButton'
)

$checks = @()
$failed = $false

function Add-Check {
  param($Name, [bool]$Pass, $Details)
  $global:checks += [pscustomobject]@{ Name=$Name; Pass=$Pass; Details=$Details }
  if (-not $Pass) { $global:failed = $true }
}

# 1) Component file existence
foreach ($file in $componentFiles) {
  $full = Join-Path $repoRoot $file
  Add-Check -Name "Exists: $file" -Pass (Test-Path $full) -Details $full
}

# 2) Screens import usage for Phase A/B adoption
foreach ($screen in $screenFiles) {
  $full = Join-Path $repoRoot $screen
  if (Test-Path $full) {
    $content = Get-Content $full -Raw
    foreach ($imp in $requiredImports) {
      $has = $content -match [regex]::Escape($imp)
      $detail = if ($has) { 'found' } else { 'not found' }
      Add-Check -Name "Import '$imp' in $screen" -Pass $has -Details $detail
    }
  } else {
    Add-Check -Name "Screen present: $screen" -Pass $false -Details 'missing screen file'
  }
}

# 3) Basic token/style usage sanity (COLORS usage)
$colorsFile = Join-Path $repoRoot 'src\common\components\logo\Colors.ts'
$colorsOk = Test-Path $colorsFile
Add-Check -Name 'Colors.ts exists' -Pass $colorsOk -Details $colorsFile

# Write report
$lines = @()
$lines += "# MyPage Phase A/B Verification Report"
$lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += ""
foreach ($c in $checks) {
  $status = if ($c.Pass) { 'PASS' } else { 'FAIL' }
  $lines += "- [$status] $($c.Name) — $($c.Details)"
}
$summary = if ($failed) { 'OVERALL: FAIL' } else { 'OVERALL: PASS' }
$lines += ""
$lines += "**$summary**"

Set-Content -Path $mypageReport -Value ($lines -join "`n") -Encoding UTF8

Write-Host "Report written to: $mypageReport"
if ($failed -and $FailOnError) { exit 1 } else { exit 0 }
