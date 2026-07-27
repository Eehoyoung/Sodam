param(
    [Parameter(Mandatory = $true)]
    [string]$Serial,

    [Parameter(Mandatory = $true)]
    [string]$ScreenId,

    [Parameter(Mandatory = $true)]
    [ValidateSet('reference', 'actual')]
    [string]$Source,

    [ValidateSet('light', 'dark')]
    [string]$Theme = 'light',

    [switch]$ColdStart,

    [Parameter(Mandatory = $true)]
    [string]$RequireText
)

$ErrorActionPreference = 'Stop'
$adb = (Get-Command adb -ErrorAction Stop).Source
$captureScript = Join-Path $PSScriptRoot 'capture-v3-android-screen.ps1'
$captureKind = if ($Source -eq 'reference') {'native-reference'} else {'actual'}
$uri = "sodam://v3/$Source/$ScreenId"
$routeMarker = "v3-visual-$Source-$ScreenId"

if ($ColdStart) {
    & $adb -s $Serial shell am force-stop com.sodam_front_end | Out-Null
}
& $adb -s $Serial shell am start -W -a android.intent.action.VIEW -d $uri com.sodam_front_end | Out-Null

$remoteXml = '/sdcard/sodam-v3-ready.xml'
$ready = $false
try {
    for ($attempt = 1; $attempt -le 15; $attempt += 1) {
        Start-Sleep -Seconds 1
        & $adb -s $Serial shell "uiautomator dump $remoteXml >/dev/null" | Out-Null
        $xml = (& $adb -s $Serial shell cat $remoteXml) -join "`n"
        if ($xml.Contains($routeMarker) -and $xml.Contains($RequireText)) {
            $ready = $true
            break
        }
    }
} finally {
    & $adb -s $Serial shell rm -f $remoteXml 2>$null
}

if (-not $ready) {
    throw "Visual route did not render marker '$routeMarker' and expected text '$RequireText': $uri"
}

& $captureScript -Serial $Serial -ScreenId $ScreenId -RequireText $RequireText -Theme $Theme -CaptureKind $captureKind
if ($LASTEXITCODE -ne 0) {
    throw "Capture failed for $uri"
}
