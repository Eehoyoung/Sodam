param(
    [Parameter(Mandatory = $true)]
    [string]$Serial,

    [ValidateSet('light', 'dark')]
    [string]$Theme = 'light',

    [switch]$Reset
)

$ErrorActionPreference = 'Stop'
$adbCommand = Get-Command adb -ErrorAction Stop
$adb = $adbCommand.Source

$deviceState = (& $adb -s $Serial get-state).Trim()
if ($deviceState -ne 'device') {
    throw "ADB device $Serial is not ready (state: $deviceState)."
}

if ($Reset) {
    & $adb -s $Serial shell wm size reset | Out-Null
    & $adb -s $Serial shell wm density reset | Out-Null
    & $adb -s $Serial shell cmd uimode night no | Out-Null
    Write-Host "Reset $Serial to its physical display and light mode."
    exit 0
}

# The references are rendered at 274 CSS px with DPR 2. A 548 px Android
# screenshot therefore requires 274 dp at 320 dpi, not the AVD's default 420 dpi.
& $adb -s $Serial shell wm size 548x1300 | Out-Null
& $adb -s $Serial shell wm density 320 | Out-Null
$nightMode = if ($Theme -eq 'dark') {'yes'} else {'no'}
& $adb -s $Serial shell cmd uimode night $nightMode | Out-Null

$sizeOutput = ((& $adb -s $Serial shell wm size) -join "`n")
$densityOutput = ((& $adb -s $Serial shell wm density) -join "`n")
$nightOutput = ((& $adb -s $Serial shell cmd uimode night) -join "`n")
$expectedNight = if ($Theme -eq 'dark') {'yes'} else {'no'}

if ($sizeOutput -notmatch 'Override size:\s*548x1300(?:\s|$)') {
    throw "Could not set canonical size. Actual: $sizeOutput"
}
if ($densityOutput -notmatch 'Override density:\s*320(?:\s|$)') {
    throw "Could not set canonical density. Actual: $densityOutput"
}
if ($nightOutput -notmatch "Night mode:\s*$expectedNight$") {
    throw "Could not set $Theme mode. Actual: $nightOutput"
}

Write-Host "Prepared $Serial for v3 strict capture: 548x1300 px, 320 dpi, $Theme mode."
