param(
    [Parameter(Mandatory = $true)]
    [string]$Serial,

    [Parameter(Mandatory = $true)]
    [string]$ScreenId,

    [string]$RequireText,

    [string]$OutputRoot,

    [ValidateSet('light', 'dark')]
    [string]$Theme,

    [ValidateSet('actual', 'native-reference')]
    [string]$CaptureKind = 'actual',

    [int]$CanonicalWidth = 548,

    [int]$CanonicalContentTop = 48,

    [int]$CanonicalContentHeight = 1204,

    [int]$CanonicalDensity = 320
)

$ErrorActionPreference = 'Stop'
$adbCommand = Get-Command adb -ErrorAction Stop
$adb = $adbCommand.Source
$frontendRoot = Split-Path -Parent $PSScriptRoot
$normalizer = Join-Path $PSScriptRoot 'v3-visual-regression.mjs'
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $frontendRoot '..\artifacts\v3-visual'
}
$outputRootPath = [IO.Path]::GetFullPath($OutputRoot)
$manifestPath = Join-Path $outputRootPath 'manifest.json'

if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Reference manifest not found: $manifestPath. Run npm run visual:v3:reference first."
}
if ($ScreenId -notmatch '^[A-Za-z0-9_-]+$') {
    throw 'ScreenId may contain only letters, numbers, underscores, and hyphens.'
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
$screen = @($manifest.screens | Where-Object {$_.id -eq $ScreenId})
if ($screen.Count -ne 1) {
    throw "Unknown visual screen id: $ScreenId"
}

$deviceState = (& $adb -s $Serial get-state).Trim()
if ($deviceState -ne 'device') {
    throw "ADB device $Serial is not ready (state: $deviceState)."
}

$densityOutput = ((& $adb -s $Serial shell wm density) -join "`n")
if ($densityOutput -notmatch "Override density:\s*$CanonicalDensity(?:\s|$)") {
    throw "Canonical density mismatch. Expected Override density: $CanonicalDensity. Run npm run visual:v3:prepare -- -Serial $Serial -Theme <light|dark>. Actual: $densityOutput"
}

if (-not [string]::IsNullOrWhiteSpace($Theme)) {
    $nightOutput = ((& $adb -s $Serial shell cmd uimode night) -join "`n").Trim()
    $expectedNight = if ($Theme -eq 'dark') {'yes'} else {'no'}
    if ($nightOutput -notmatch "Night mode:\s*$expectedNight$") {
        throw "Theme mismatch. Expected $Theme mode. Actual: $nightOutput"
    }
}

$remotePng = "/sdcard/sodam-v3-$ScreenId.png"
$remoteXml = '/sdcard/sodam-v3-window.xml'
$rawPng = Join-Path $env:TEMP "sodam-v3-$ScreenId-$([Guid]::NewGuid().ToString('N')).png"
$captureDirectory = Join-Path $outputRootPath $CaptureKind
$uiDirectory = Join-Path $captureDirectory 'uiautomator'
$actualPng = Join-Path $captureDirectory "$ScreenId.png"
$actualXml = Join-Path $uiDirectory "$ScreenId.xml"
$referencePng = Join-Path $outputRootPath $screen[0].reference

try {
    New-Item -ItemType Directory -Force -Path $captureDirectory | Out-Null
    New-Item -ItemType Directory -Force -Path $uiDirectory | Out-Null
    & $adb -s $Serial shell "uiautomator dump $remoteXml >/dev/null" | Out-Null
    & $adb -s $Serial pull $remoteXml $actualXml | Out-Null
    $xml = Get-Content -LiteralPath $actualXml -Raw -Encoding utf8
    if (-not [string]::IsNullOrWhiteSpace($RequireText) -and -not $xml.Contains($RequireText)) {
        throw "Capture refused: expected text '$RequireText' was not present in the current UI hierarchy."
    }
    $contentNode = [regex]::Match(
        $xml,
        '<node[^>]*resource-id="android:id/content"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
    )
    if (-not $contentNode.Success) {
        throw 'Could not find the Android app content bounds in the UI tree.'
    }

    $x = [int]$contentNode.Groups[1].Value
    $y = [int]$contentNode.Groups[2].Value
    $right = [int]$contentNode.Groups[3].Value
    $bottom = [int]$contentNode.Groups[4].Value
    $contentWidth = $right - $x
    $contentHeight = $bottom - $y
    $expectedBottom = $CanonicalContentTop + $CanonicalContentHeight
    $translucentStatusBarBounds = $x -eq 0 -and $y -eq 0 -and $contentWidth -eq $CanonicalWidth -and $bottom -eq $expectedBottom
    $insetContentBounds = $x -eq 0 -and $y -eq $CanonicalContentTop -and $contentWidth -eq $CanonicalWidth -and $contentHeight -eq $CanonicalContentHeight
    if (-not $translucentStatusBarBounds -and -not $insetContentBounds) {
        throw "Canonical content bounds mismatch. Expected inset [0,$CanonicalContentTop][$CanonicalWidth,$expectedBottom] or translucent-status-bar [0,0][$CanonicalWidth,$expectedBottom], actual [$x,$y][$right,$bottom]."
    }

    & $adb -s $Serial shell screencap -p $remotePng | Out-Null
    & $adb -s $Serial pull $remotePng $rawPng | Out-Null
    # Always exclude the fixed 48px status-bar inset. ScreenContainer opts into
    # transparent Android status bars, so its root content may begin at y=0;
    # non-translucent screens begin at y=48. Both use this identical crop.
    $crop = "0,$CanonicalContentTop,$CanonicalWidth,$CanonicalContentHeight"
    & node $normalizer normalize --input $rawPng --output $actualPng --reference $referencePng --crop $crop
    if ($LASTEXITCODE -ne 0) {
        throw "Android capture normalization failed for $ScreenId."
    }
    Write-Host "Captured $CaptureKind/$ScreenId to $actualPng (UI tree: $actualXml)"
} finally {
    & $adb -s $Serial shell rm -f $remotePng $remoteXml 2>$null
    if (Test-Path -LiteralPath $rawPng) {
        Remove-Item -LiteralPath $rawPng -Force
    }
}
