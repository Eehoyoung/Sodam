param(
  [string]$Device = 'auto',
  [string]$OutPath = 'logs',
  [int]$DurationSec = 60,
  [string]$TagFilters = 'ReactNative:V React:V SoLoader:V Hermes:V *:S'
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -Path $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

Ensure-Dir -Path $OutPath
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$outFile = Join-Path $OutPath ("run_" + $timestamp + ".logcat")

# Resolve adb
$adb = 'adb'
try {
  $adbVersion = & $adb version 2>$null
} catch {
  Write-Error 'adb not found in PATH. Please install Android Platform-Tools and add to PATH.'
}

if ($Device -ne 'auto') {
  $deviceArg = @('-s', $Device)
} else {
  $deviceArg = @()
}

# Start logcat capture
Write-Host "[DEBUG_LOG] Starting logcat capture to $outFile for $DurationSec seconds..."
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $adb
$startInfo.Arguments = ("$($deviceArg -join ' ') logcat -v time $TagFilters")
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $startInfo
$null = $proc.Start()

$stream = [System.IO.StreamWriter]::new($outFile, $false)
$reader = $proc.StandardOutput
$end = (Get-Date).AddSeconds($DurationSec)

try {
  while (-not $proc.HasExited -and (Get-Date) -lt $end) {
    $line = $reader.ReadLine()
    if ($null -ne $line) { $stream.WriteLine($line) }
  }
} finally {
  try { $proc.Kill() } catch {}
  $stream.Flush(); $stream.Close()
}

Write-Host "[DEBUG_LOG] Logcat captured: $outFile"
