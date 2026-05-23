param(
  [string[]] $Keywords = @("qrcode","qr-code","/qr-verify","QRCode","qr code","/location-verify","/nfc-verify"),
  [string] $Out = "logs\qr-scan-report.md",
  [string[]] $ExcludeDirs = @("node_modules","android\build","android\app\build","android\logs","ios\build","out\production",".git",".idea",".junie","logs","tests","__tests__","docs"),
  [string[]] $ExcludeFiles = @("docs\QR_Residual_Removal_Guide_2025-08-28.md","scripts\scan-qr-residue.ps1","package-lock.json","yarn.lock","android\app\src\main\assets\index.android.bundle",".output.txt"),
  [switch] $FailOnMatch
)

$ErrorActionPreference = 'SilentlyContinue'

function Join-NormalizedPath([string] $base, [string] $rel) {
  return [System.IO.Path]::GetFullPath((Join-Path $base $rel))
}

$repoRoot = (Get-Location).Path
$outPath = Join-NormalizedPath $repoRoot $Out
$outDir = Split-Path -Parent $outPath
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# Normalize excludes to full paths
$excludeDirPaths = @()
foreach ($d in $ExcludeDirs) {
  $excludeDirPaths += (Join-NormalizedPath $repoRoot $d)
}
$excludeFilePaths = @()
foreach ($f in $ExcludeFiles) {
  $excludeFilePaths += (Join-NormalizedPath $repoRoot $f)
}

# Define text extensions to content-scan; non-text files will only be 'accessed' via open/close
$textExts = @('.ts','.tsx','.js','.jsx','.json','.xml','.gradle','.properties','.kt','.java','.c','.cpp','.h','.m','.mm','.plist','.md','.mdx','.cjs','.mjs','.yml','.yaml','.ps1','.bat','.sh','.txt','.tsconfig')

$allFiles = Get-ChildItem -Path $repoRoot -Recurse -File -Force | Where-Object {
  $full = $_.FullName
  # Exclude directories
  $exclude = $false
  foreach ($d in $excludeDirPaths) { if ($full.StartsWith($d, [System.StringComparison]::OrdinalIgnoreCase)) { $exclude = $true; break } }
  if ($exclude) { return $false }
  # Exclude specific files
  foreach ($ef in $excludeFilePaths) { if ($full -eq $ef) { $exclude = $true; break } }
  return -not $exclude
}

$matchResults = @()
$accessedCount = 0
$matchCount = 0

Write-Host ("[SCAN] Files to process: {0}" -f $allFiles.Count)

foreach ($file in $allFiles) {
  $accessedCount++
  # Access file at least once
  try {
    $fs = [System.IO.File]::Open($file.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $fs.Close()
  } catch {}

  $ext = [System.IO.Path]::GetExtension($file.FullName)
  if ($textExts -contains $ext.ToLower()) {
    try {
      $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
      $lines = $content -split "`n"
      for ($i=0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        foreach ($kw in $Keywords) {
          if ($line -match [Regex]::Escape($kw)) { # case-insensitive by default in PS? ensure:
            if ($line.ToLower().Contains($kw.ToLower())) {
              $matchCount++
              $matchResults += [PSCustomObject]@{
                File = $file.FullName.Replace($repoRoot + "\", '')
                Line = ($i+1)
                Keyword = $kw
                Snippet = ($line.Trim())
              }
            }
          }
        }
      }
    } catch {
      # ignore read errors
    }
  }
}

# Build report
$timeStr = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss K')
$report = @()
$report += "# QR Residual Scan Report"
$report += ""
$report += "- Generated: $timeStr"
$report += "- Repo Root: $repoRoot"
$report += "- Files Accessed: $accessedCount"
$report += "- Keywords: `"" + ($Keywords -join '", "') + '"'
$report += "- Excluded Dirs: " + ($ExcludeDirs -join ', ')
$report += "- Excluded Files: " + ($ExcludeFiles -join ', ')
$report += "- Total Matches: $matchCount"
$report += ""

if ($matchResults.Count -gt 0) {
  $report += "## Matches"
  foreach ($m in $matchResults) {
    $report += "- [$($m.Keyword)] $($m.File):$($m.Line) :: $($m.Snippet)"
  }
} else {
  $report += "## Matches"
  $report += "- No matches found."
}

$reportText = ($report -join "`r`n")
Set-Content -LiteralPath $outPath -Value $reportText -Encoding UTF8

Write-Host ("[SCAN] Report written: {0}" -f $outPath)

if ($FailOnMatch -and $matchCount -gt 0) { exit 1 } else { exit 0 }
