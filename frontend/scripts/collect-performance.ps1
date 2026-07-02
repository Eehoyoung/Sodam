# Collect simple performance metrics (placeholder) for iterative runs
# Note: This is a minimal, non-invasive logger to keep repo integrity.

param(
  [int]$DurationSec = 30,
  [int]$IntervalMs = 1000,
  [string]$Out = "logs/perf-collect.log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  $repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
  $outPath = Join-Path $repoRoot $Out
  $outDir = Split-Path -Parent $outPath
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

  $start = Get-Date
  $lines = @()
  $lines += "[perf] start: $start"
  $elapsed = 0
  while ($elapsed -lt ($DurationSec * 1000)) {
    $ts = Get-Date
    # Placeholder metrics: system CPU info snapshot
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $mem = Get-CimInstance Win32_OperatingSystem
    $freeMb = [math]::Round($mem.FreePhysicalMemory / 1024, 2)
    $totalMb = [math]::Round($mem.TotalVisibleMemorySize / 1024, 2)
    $lines += "[perf] $ts cpu_load=%$cpu mem_free=${freeMb}MB mem_total=${totalMb}MB"
    Start-Sleep -Milliseconds $IntervalMs
    $elapsed += $IntervalMs
  }
  $end = Get-Date
  $lines += "[perf] end: $end"
  $lines | Set-Content -Path $outPath -Encoding UTF8
  Write-Host "[perf] Metrics written to $outPath"
  exit 0
} catch {
  Write-Error "[perf] Failed: $($_.Exception.Message)"
  exit 1
}
