param(
    [Parameter(Mandatory = $true)]
    [string]$Serial,

    [ValidateSet('light', 'dark')]
    [string]$Theme = 'light',

    [int]$MaxScreens = 0
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$frontendRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $frontendRoot
$outputRoot = Join-Path $repoRoot 'artifacts\v3-visual'
$manifestPath = Join-Path $outputRoot 'manifest.json'
$visualDriver = Join-Path $scriptDir 'capture-v3-android-visual.ps1'
$logPath = Join-Path $outputRoot 'capture-all-log.jsonl'

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
$screens = $manifest.screens
if ($MaxScreens -gt 0) {
    $screens = $screens | Select-Object -First $MaxScreens
}

$total = $screens.Count
$index = 0
$okCount = 0
$failCount = 0

foreach ($screen in $screens) {
    $index += 1
    $id = $screen.id
    Write-Host "[$index/$total] $id"

    foreach ($source in @('reference', 'actual')) {
        $captureKind = if ($source -eq 'reference') { 'native-reference' } else { 'actual' }
        $targetPng = Join-Path $outputRoot "$captureKind\$id.png"
        if (Test-Path -LiteralPath $targetPng) {
            continue
        }

        $routeMarker = "v3-visual-$source-$id"
        $entry = [ordered]@{
            id = $id
            source = $source
            timestamp = (Get-Date).ToString('o')
        }
        try {
            & $visualDriver -Serial $Serial -ScreenId $id -Source $source -Theme $Theme -RequireText $routeMarker
            if ($LASTEXITCODE -ne 0) {
                throw "capture-v3-android-visual.ps1 exited with code $LASTEXITCODE"
            }
            $entry.status = 'ok'
            $okCount += 1
        } catch {
            $entry.status = 'failed'
            $entry.error = $_.Exception.Message
            $failCount += 1
            Write-Warning "  $source failed: $($_.Exception.Message)"
        }
        ($entry | ConvertTo-Json -Compress) | Add-Content -LiteralPath $logPath -Encoding utf8
    }
}

Write-Host "Done. ok=$okCount failed=$failCount (out of $($total * 2) capture attempts, existing files skipped)"
