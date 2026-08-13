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
    [string]$RequireText,

    [string]$OutputRoot
)

$ErrorActionPreference = 'Stop'
$adb = (Get-Command adb -ErrorAction Stop).Source
$captureScript = Join-Path $PSScriptRoot 'capture-v3-android-screen.ps1'
$captureKind = if ($Source -eq 'reference') {'native-reference'} else {'actual'}
$uri = "sodam:///v3/$Source/$ScreenId"
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

# 마커가 떴다고 레이아웃이 끝난 것은 아니다.
#
# react-native-safe-area-context 는 인셋을 비동기로 전달하므로, 최초 렌더(인셋 0)와
# 확정 렌더 사이에 촬영되면 화면 전체가 십수 px 밀린 채 찍힌다. 2026-08-13 T-14
# 기준선 재수립에서 154 중 5개가 이 경합으로 어긋났다(예: 급여 3단계 확인 화면에서
# 총액 행이 하단 CTA 에 가림).
#
# 대기 시간을 추측해 늘리는 대신 화면이 스스로 멈췄다고 말할 때까지 기다린다 —
# 연속 두 장이 바이트 단위로 같으면 정착한 것이다. 애니메이션·비동기 데이터 등
# 다른 원인의 경합도 같은 조건으로 함께 걸린다.
$remoteShot = '/sdcard/sodam-v3-settle.png'
$previousHash = $null
$settled = $false
try {
    for ($attempt = 1; $attempt -le 12; $attempt += 1) {
        & $adb -s $Serial shell screencap -p $remoteShot | Out-Null
        $hash = (& $adb -s $Serial shell "md5sum $remoteShot" | Out-String).Trim().Split(' ')[0]
        if ($hash -and $hash -eq $previousHash) {
            $settled = $true
            break
        }
        $previousHash = $hash
        Start-Sleep -Milliseconds 400
    }
} finally {
    & $adb -s $Serial shell rm -f $remoteShot 2>$null
}
if (-not $settled) {
    # 계속 움직이는 화면을 찍으면 그 결과는 다음 실행과 다를 수밖에 없다. 조용히
    # 찍어서 나중에 "회귀"로 오해받느니, 여기서 실패로 드러내는 편이 낫다.
    throw "Screen never settled (12 samples still changing): $routeMarker"
}

$captureArgs = @{
    Serial = $Serial
    ScreenId = $ScreenId
    RequireText = $RequireText
    Theme = $Theme
    CaptureKind = $captureKind
}
if (-not [string]::IsNullOrWhiteSpace($OutputRoot)) {
    $captureArgs.OutputRoot = $OutputRoot
}
& $captureScript @captureArgs
if ($LASTEXITCODE -ne 0) {
    throw "Capture failed for $uri"
}
