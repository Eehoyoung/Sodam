[CmdletBinding()]
param(
    [string[]]$AvdNames = @("Medium_Phone", "Sodam_Emp"),
    [switch]$SkipDockerBuild,
    [switch]$SkipNpmInstall,
    [switch]$SkipAndroidBuild,
    [switch]$SkipMetro,
    [int]$MetroPort = 8088,
    [int]$BootTimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$frontend = Join-Path $root "frontend"
$sdk = if ($env:ANDROID_HOME) {
    $env:ANDROID_HOME
} elseif ($env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT
} else {
    Join-Path $env:LOCALAPPDATA "Android\Sdk"
}
$adb = Join-Path $sdk "platform-tools\adb.exe"
$emulator = Join-Path $sdk "emulator\emulator.exe"
$apk = Join-Path $frontend "android\app\build\outputs\apk\debug\app-debug.apk"

function Invoke-Step {
    param(
        [string]$Title,
        [scriptblock]$Action
    )

    Write-Host "`n==> $Title" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Title failed (exit code: $LASTEXITCODE)"
    }
}

function Get-RunningEmulators {
    $devices = & $adb devices
    return @(
        $devices |
            Select-String "^emulator-\d+\s+device$" |
            ForEach-Object { ($_ -split "\s+")[0] }
    )
}

function Get-RunningAvdNames {
    return @(
        Get-RunningEmulators |
            ForEach-Object {
                $name = (& $adb -s $_ emu avd name 2>$null | Select-Object -First 1)
                if ($name) {
                    $name.Trim()
                }
            }
    )
}

function Resolve-AvdName {
    param([string]$RequestedName)

    $avdRoot = Join-Path $env:USERPROFILE ".android\avd"
    $directConfig = Join-Path $avdRoot "$RequestedName.avd\config.ini"
    if (Test-Path $directConfig) {
        return $RequestedName
    }

    $iniPath = Join-Path $avdRoot "$RequestedName.ini"
    if (Test-Path $iniPath) {
        $configuredPath = Get-Content $iniPath |
            Where-Object { $_ -like "path=*" } |
            Select-Object -First 1
        if ($configuredPath) {
            $target = $configuredPath.Substring(5)
            if (Test-Path (Join-Path $target "config.ini")) {
                return [IO.Path]::GetFileNameWithoutExtension($target)
            }
        }
    }

    throw "AVD '$RequestedName' was not found under $avdRoot."
}

function Wait-ForNewEmulator {
    param(
        [string[]]$ExistingSerials,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        Start-Sleep -Seconds 2
        $serial = Get-RunningEmulators |
            Where-Object { $_ -notin $ExistingSerials } |
            Select-Object -First 1
        if ($serial) {
            & $adb -s $serial wait-for-device
            do {
                Start-Sleep -Seconds 2
                $booted = (& $adb -s $serial shell getprop sys.boot_completed 2>$null).Trim()
            } until ($booted -eq "1" -or (Get-Date) -ge $deadline)

            if ($booted -eq "1") {
                return $serial
            }
        }
    } until ((Get-Date) -ge $deadline)

    throw "Emulator did not finish booting within $TimeoutSeconds seconds."
}

function Set-MetroDebugHost {
    param(
        [string]$Serial,
        [int]$Port
    )

    $xml = "<?xml version=`"1.0`" encoding=`"utf-8`" standalone=`"yes`" ?><map><string name=`"debug_http_host`">10.0.2.2:$Port</string></map>"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($xml))
    & $adb -s $Serial shell "echo $encoded | base64 -d | run-as com.sodam_front_end sh -c 'cat > shared_prefs/com.sodam_front_end_preferences.xml'"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to set the Metro debug host on $Serial."
    }
}

if (-not (Test-Path $adb)) {
    throw "adb.exe not found: $adb"
}
if (-not (Test-Path $emulator)) {
    throw "emulator.exe not found: $emulator"
}
if ($AvdNames.Count -lt 2) {
    throw "Specify at least two AVD names with -AvdNames."
}

Set-Location $root

if ($SkipDockerBuild) {
    Invoke-Step "Start Docker services" { docker compose up -d }
} else {
    Invoke-Step "Build and start Docker services" { docker compose up -d --build }
}

Set-Location $frontend
if (-not $SkipNpmInstall) {
    Invoke-Step "Install npm dependencies" { npm ci }
}

if (-not $SkipAndroidBuild) {
    Invoke-Step "Build Android debug APK" {
        Push-Location (Join-Path $frontend "android")
        try {
            .\gradlew.bat assembleDebug
        } finally {
            Pop-Location
        }
    }
}

if (-not (Test-Path $apk)) {
    throw "Debug APK not found: $apk"
}

& $adb start-server | Out-Null
$serials = @(Get-RunningEmulators)
$needed = 2 - $serials.Count
$runningAvds = @(Get-RunningAvdNames)
$availableAvds = @(
    $AvdNames |
        ForEach-Object { Resolve-AvdName $_ } |
        Where-Object { $_ -notin $runningAvds }
)

for ($i = 0; $i -lt $needed; $i++) {
    if ($i -ge $availableAvds.Count) {
        throw "Not enough unused AVDs are available to start two emulators."
    }
    $avdName = $availableAvds[$i]
    $before = @(Get-RunningEmulators)
    Write-Host "`n==> Start AVD: $avdName" -ForegroundColor Cyan
    Start-Process -FilePath $emulator -ArgumentList @(
        "-avd", $avdName,
        "-no-snapshot-save",
        "-netdelay", "none",
        "-netspeed", "full"
    )
    $serials += Wait-ForNewEmulator -ExistingSerials $before -TimeoutSeconds $BootTimeoutSeconds
}

$serials = @(Get-RunningEmulators | Select-Object -First 2)
foreach ($serial in $serials) {
    Invoke-Step "Install app on $serial" {
        & $adb -s $serial install -r $apk
    }
    Set-MetroDebugHost -Serial $serial -Port $MetroPort
    & $adb -s $serial reverse tcp:8081 "tcp:$MetroPort" | Out-Null
    & $adb -s $serial shell monkey -p com.sodam_front_end -c android.intent.category.LAUNCHER 1 | Out-Null
}

if (-not $SkipMetro) {
    $metroRunning = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue
    if (-not $metroRunning) {
        Write-Host "`n==> Start Metro in a separate window" -ForegroundColor Cyan
        Start-Process powershell.exe -WorkingDirectory $frontend -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command", "npm run start"
        )
        $deadline = (Get-Date).AddSeconds(30)
        do {
            Start-Sleep -Seconds 1
            $metroRunning = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue
        } until ($metroRunning -or (Get-Date) -ge $deadline)
        if (-not $metroRunning) {
            throw "Metro did not start listening on port $MetroPort within 30 seconds."
        }
    } else {
        Write-Host "`n==> Metro is already running" -ForegroundColor DarkGray
    }
}

Set-Location $root
Write-Host "`nDevelopment environment is ready." -ForegroundColor Green
docker compose ps
& $adb devices -l
