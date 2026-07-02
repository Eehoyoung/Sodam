param(
  [Parameter(Mandatory = $true)][string]$LogPath,
  [string]$OutPath = "logs/LogCat_Analysis.md",
  [string]$AppId = "com.sodam_front_end"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-DirIfMissing([string]$path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

try {
  if (-not (Test-Path $LogPath)) { throw "Log file not found: $LogPath" }

  $repoRoot = Split-Path -Parent $PSScriptRoot
  $outFull = Join-Path $repoRoot $OutPath
  $outDir = Split-Path -Parent $outFull
  New-DirIfMissing $outDir

  # Preload content (raw + line enumeration for precise coverage)
  $raw = Get-Content $LogPath -Raw
  $lines = Get-Content $LogPath
  $totalLines = $lines.Count

  # Helper: Safe regex count
  function Count-Regex([string]$text, [string]$pattern, [switch]$IgnoreCase) {
    try {
      $opt = [System.Text.RegularExpressions.RegexOptions]::Multiline
      if ($IgnoreCase) { $opt = $opt -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase }
      return ([regex]::Matches($text, $pattern, $opt)).Count
    } catch {
      return 0
    }
  }

  # Attempt to detect entry boundaries. Use literal match for stability.
  $entryCount = (Select-String -InputObject $raw -Pattern '"message":' -SimpleMatch | Measure-Object).Count
  if ($entryCount -lt 1) { $entryCount = $totalLines } # Fallback

  # Log levels
  $levels = @('VERBOSE','DEBUG','INFO','WARN','ERROR','ASSERT','FATAL')
  $levelCounts = @{}
  foreach ($lvl in $levels) {
    $lvlPattern = '"logLevel"\s*:\s*"' + [regex]::Escape($lvl) + '"'
    $levelCounts[$lvl] = Count-Regex $raw $lvlPattern
  }

  # Tags (sample top N)
  $tagMatches = [regex]::Matches($raw, '"tag"\s*:\s*"([^"]+)"')
  $tagCounts = @{}
  foreach ($m in $tagMatches) { $t = $m.Groups[1].Value; if ($tagCounts.ContainsKey($t)) { $tagCounts[$t]++ } else { $tagCounts[$t]=1 } }
  $topTags = $tagCounts.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 15

  # ApplicationId counts
  $appMatches = [regex]::Matches($raw, '"applicationId"\s*:\s*"([^"]*)"')
  $appCounts = @{}
  foreach ($m in $appMatches) { $a = $m.Groups[1].Value; if ($appCounts.ContainsKey($a)) { $appCounts[$a]++ } else { $appCounts[$a]=1 } }
  $topApps = $appCounts.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 15
  $ourAppCount = if ($appCounts.ContainsKey($AppId)) { $appCounts[$AppId] } else { 0 }

  # Time range from seconds/nanos fields
  $secMatches = [regex]::Matches($raw, '"seconds"\s*:\s*(\d+)')
  $nanoMatches = [regex]::Matches($raw, '"nanos"\s*:\s*(\d+)')
  $minSec = $null; $maxSec = $null
  foreach ($m in $secMatches) { $s = [int64]$m.Groups[1].Value; if ($minSec -eq $null -or $s -lt $minSec) { $minSec=$s }; if ($maxSec -eq $null -or $s -gt $maxSec) { $maxSec=$s } }
  function To-DateTimeFromEpoch([int64]$seconds) {
    if ($null -eq $seconds) { return $null }
    return ([DateTimeOffset]::FromUnixTimeSeconds($seconds)).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss')
  }
  $startTime = To-DateTimeFromEpoch $minSec
  $endTime = To-DateTimeFromEpoch $maxSec

  # Problem patterns
  $patterns = @{
    'FATAL EXCEPTION' = 'FATAL EXCEPTION';
    'ANR' = 'ANR in ';
    'ProcessDied' = 'has died';
    'JavaScript TypeError' = 'TypeError:';
    'JavaScript ReferenceError' = 'ReferenceError:';
    'Hermes' = 'Hermes';
    'Reanimated' = 'Reanimated';
    'ReactNoCrashSoftException' = 'ReactNoCrashSoftException';
    'OutOfMemory' = 'OutOfMemoryError';
    'SIGSEGV' = 'signal 11 (SIGSEGV)';
    'Network Error' = 'Network Error';
    'Timeout' = 'timeout';
    'SSL' = 'SSLHandshakeException';
    'NFC' = 'Nfc|NFC|react-native-nfc-manager';
  }

  $problemCounts = @{}
  $problemFirstLine = @{}
  foreach ($kv in $patterns.GetEnumerator()) {
    $pat = $kv.Value
    $count = (Select-String -Path $LogPath -Pattern $pat -SimpleMatch -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($count -eq 0 -and ($kv.Key -eq 'NFC')) {
      # Use regex for NFC to support alternation
      $count = (Select-String -Path $LogPath -Pattern 'Nfc|NFC|react-native-nfc-manager' -ErrorAction SilentlyContinue | Measure-Object).Count
    }
    $problemCounts[$kv.Key] = $count
    $first = $null
    if ($count -gt 0) {
      try {
        $first = (Select-String -Path $LogPath -Pattern $pat -SimpleMatch -ErrorAction SilentlyContinue | Select-Object -First 1).LineNumber
      } catch {}
      if (-not $first -and ($kv.Key -eq 'NFC')) {
        try { $first = (Select-String -Path $LogPath -Pattern 'Nfc|NFC|react-native-nfc-manager' -ErrorAction SilentlyContinue | Select-Object -First 1).LineNumber } catch {}
      }
    }
    $problemFirstLine[$kv.Key] = $first
  }

  # Our app applicationId-based occurrence lines (ASCII-safe)
  $appIdPattern = '"applicationId"\s*:\s*"' + [regex]::Escape($AppId) + '"'
  $appIdLineNumbers = @(Select-String -Path $LogPath -Pattern $appIdPattern -ErrorAction SilentlyContinue | ForEach-Object { $_.LineNumber })
  $appIdFirstLine = if ($appIdLineNumbers.Count -gt 0) { $appIdLineNumbers[0] } else { $null }
  $appIdLastLine = if ($appIdLineNumbers.Count -gt 0) { $appIdLineNumbers[$appIdLineNumbers.Count-1] } else { $null }

  # RN lifecycle markers (as used elsewhere)
  $rnMarkers = @(
    '[DEBUG_LOG] About to require AppComponent',
    '[CONTEXT_READINESS] React Native context is now ready',
    '[DEBUG_LOG] Component registered successfully',
    'JSI runtime initialized',
    'FabricRenderer'
  )
  $rnMarkerCounts = @{}
  foreach ($m in $rnMarkers) { $rnMarkerCounts[$m] = Count-Regex $raw ([regex]::Escape($m)) }

  # Compose report
  $out = @()
  $out += "# LogCat Comprehensive Analysis Report"
  $out += ""
  $out += "- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
  $out += "- Repo Root: $repoRoot"
  $out += "- Log File: $LogPath"
  $out += "- AppId: $AppId"
  $out += ""
  $out += "## Coverage"
  $out += "- Total lines: $totalLines"
  $out += "- Entry count heuristic (message fields or lines): $entryCount"
  $out += ("- Time range: {0} -> {1}" -f $startTime, $endTime)
  $out += ""
  $out += "## Counts by Level"
  foreach ($lvl in $levels) { $out += ("- {0}: {1}" -f $lvl, $levelCounts[$lvl]) }
  $out += ""
  $out += "## Top Tags"
  foreach ($kv in $topTags) { $out += ("- {0}: {1}" -f $($kv.Key), $($kv.Value)) }
  $out += ""
  $out += "## Top Applications"
  foreach ($kv in $topApps) { $out += ("- {0}: {1}" -f $($kv.Key), $($kv.Value)) }
  $out += ("- Our app occurrences ({0}): {1}" -f $AppId, $ourAppCount)
  $out += ""
  $out += "## Problem Signals"
  foreach ($k in $patterns.Keys) {
    $count = $problemCounts[$k]
    $first = $problemFirstLine[$k]
    $lineInfo = if ($first) { " (first at line $first)" } else { "" }
    $out += ("- {0}: {1}{2}" -f $k, $count, $lineInfo)
  }
  $out += ""
  $out += "## ApplicationId Presence"
  $out += ("- applicationId '{0}' occurrences: {1}" -f $AppId, $appIdLineNumbers.Count)
  $firstLineText = if ($appIdFirstLine) { $appIdFirstLine } else { 'N/A' }
  $lastLineText = if ($appIdLastLine) { $appIdLastLine } else { 'N/A' }
  $out += ("- First occurrence line: {0}" -f $firstLineText)
  $out += ("- Last occurrence line: {0}" -f $lastLineText)
  $out += ""
  $out += "## React Native Lifecycle Markers"
  foreach ($m in $rnMarkers) { $out += ("- '{0}': {1}" -f $m, $rnMarkerCounts[$m]) }
  $out += ""
  $out += "## Notes"
  $out += "- This report uses regex-based parsing to ensure every line is scanned at least once."
  $out += "- If JSON schema varies inside the log, counts by level default to pattern scans."
  $out += ""
  $out += "> Generated by scripts/analyze-logcat.ps1"

  $out | Set-Content -Path $outFull -Encoding UTF8
  Write-Host "[analyze-logcat] Report written to $outFull"
  exit 0
} catch {
  Write-Error "[analyze-logcat] Failed: $($_.Exception.Message)"
  exit 1
}
