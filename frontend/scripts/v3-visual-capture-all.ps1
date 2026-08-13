param(
    [Parameter(Mandatory = $true)]
    [string]$Serial,

    [ValidateSet('light', 'dark')]
    [string]$Theme = 'light',

    [Parameter(Mandatory = $true)]
    [ValidateSet('reference', 'actual')]
    [string]$CaptureSource,

    [Parameter(Mandatory = $true)]
    [string]$SourceCommit,

    [string]$OutputRoot,

    [string]$SourceRoot,

    [int]$MaxScreens = 0
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$frontendRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $frontendRoot
$sourceRepoRoot = if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
    $repoRoot
} else {
    [System.IO.Path]::GetFullPath($SourceRoot)
}
$resolvedHead = (& git -C $sourceRepoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $resolvedHead -ne $SourceCommit) {
    throw "Capture source mismatch: requested $SourceCommit but checkout is $resolvedHead"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $outputRoot = Join-Path $repoRoot 'artifacts\v3-visual'
} else {
    $outputRoot = [System.IO.Path]::GetFullPath($OutputRoot)
}
$manifestPath = Join-Path $outputRoot 'manifest.json'
$visualDriver = Join-Path $scriptDir 'capture-v3-android-visual.ps1'
$captureKind = if ($CaptureSource -eq 'reference') { 'native-reference' } else { 'actual' }
$captureDirectory = Join-Path $outputRoot $captureKind
$logPath = Join-Path $outputRoot "capture-$CaptureSource-log.jsonl"

New-Item -ItemType Directory -Force -Path $captureDirectory | Out-Null
$adb = (Get-Command adb -ErrorAction Stop).Source
$sourceManifest = [ordered]@{
    formatVersion = 1
    source = $CaptureSource
    commitSha = $resolvedHead
    workingTree = $sourceRepoRoot
    capturedAt = (Get-Date).ToUniversalTime().ToString('o')
    dirty = [bool]((& git -C $sourceRepoRoot status --porcelain --untracked-files=no) -join '')
    avd = [ordered]@{
        serial = $Serial
        model = ((& $adb -s $Serial shell getprop ro.product.model) -join '').Trim()
        resolution = ((& $adb -s $Serial shell wm size) -join ' ').Trim()
        density = ((& $adb -s $Serial shell wm density) -join ' ').Trim()
        fontScale = ((& $adb -s $Serial shell settings get system font_scale) -join '').Trim()
    }
}
$sourceManifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $captureDirectory 'source-manifest.json') -Encoding utf8

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

    foreach ($source in @($CaptureSource)) {
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
            & $visualDriver -Serial $Serial -ScreenId $id -Source $source -Theme $Theme -RequireText $routeMarker -OutputRoot $outputRoot
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

Write-Host "Done. source=$CaptureSource sha=$resolvedHead ok=$okCount failed=$failCount (out of $total capture attempts, existing files skipped)"
if ($failCount -gt 0) {
    exit 1
}
