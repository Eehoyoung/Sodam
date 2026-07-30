param(
    [Parameter(Mandatory = $true)][string]$Serial,
    [Parameter(Mandatory = $true)][string]$ScreenId,
    [Parameter(Mandatory = $true)][string]$Breakpoint,
    [Parameter(Mandatory = $true)][int]$WidthPx,
    [Parameter(Mandatory = $true)][int]$HeightPx,
    [int]$Density = 320
)
$ErrorActionPreference = 'Stop'
$adb = (Get-Command adb -ErrorAction Stop).Source
$outDir = "C:\Users\LeeHoYoung\Downloads\Project_sodam\artifacts\v3-visual-responsive"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

& $adb -s $Serial shell wm size "${WidthPx}x${HeightPx}" | Out-Null
& $adb -s $Serial shell wm density $Density | Out-Null

$uri = "sodam:///v3/actual/$ScreenId"
$routeMarker = "v3-visual-actual-$ScreenId"
& $adb -s $Serial shell am force-stop com.sodam_front_end | Out-Null
& $adb -s $Serial shell am start -W -a android.intent.action.VIEW -d $uri com.sodam_front_end | Out-Null

$remoteXml = '/sdcard/sodam-v3-ready.xml'
$ready = $false
try {
    for ($attempt = 1; $attempt -le 15; $attempt += 1) {
        Start-Sleep -Seconds 1
        & $adb -s $Serial shell "uiautomator dump $remoteXml >/dev/null" | Out-Null
        $xml = (& $adb -s $Serial shell cat $remoteXml) -join "`n"
        if ($xml.Contains($routeMarker)) {
            $ready = $true
            break
        }
    }
} finally {
    & $adb -s $Serial shell rm -f $remoteXml 2>$null
}

if (-not $ready) {
    Write-Warning "Route marker not found for $ScreenId at $Breakpoint - capturing anyway for diagnostics"
}

$remotePng = "/sdcard/sodam-resp-$ScreenId.png"
$localPng = Join-Path $outDir "$ScreenId--$Breakpoint.png"
& $adb -s $Serial shell screencap -p $remotePng | Out-Null
& $adb -s $Serial pull $remotePng $localPng | Out-Null
& $adb -s $Serial shell rm -f $remotePng | Out-Null
Write-Host "Captured $ScreenId @ $Breakpoint (${WidthPx}x${HeightPx}) -> $localPng"
