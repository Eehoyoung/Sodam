# Sodam App Installation and Debug Checker
# PowerShell script to verify app installation and diagnose issues

Write-Host "========================================" -ForegroundColor Green
Write-Host "Sodam App Installation Checker" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if ADB is available
Write-Host "Checking ADB availability..." -ForegroundColor Yellow
try
{
    $adbVersion = adb version
    Write-Host "ADB is available: $( $adbVersion[0] )" -ForegroundColor Green
}
catch
{
    Write-Host "ERROR: ADB not found. Please ensure Android SDK is installed and ADB is in PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check connected devices
Write-Host "Checking connected devices..." -ForegroundColor Yellow
$devices = adb devices
Write-Host $devices
Write-Host ""

# Check if emulator is running
$deviceList = adb devices | Select-String "emulator"
if ($deviceList.Count -eq 0)
{
    Write-Host "WARNING: No emulator detected. Please start an Android emulator." -ForegroundColor Red
}
else
{
    Write-Host "Emulator detected: $deviceList" -ForegroundColor Green
}

Write-Host ""

# Check if app is installed
Write-Host "Checking if Sodam app is installed..." -ForegroundColor Yellow
$appInstalled = adb shell pm list packages | Select-String "com.sodam_front_end"
if ($appInstalled)
{
    Write-Host "✓ App is installed: $appInstalled" -ForegroundColor Green

    # Get app details
    Write-Host ""
    Write-Host "Getting app details..." -ForegroundColor Yellow
    adb shell dumpsys package com.sodam_front_end | Select-String "versionName|versionCode|targetSdk|minSdk|enabled|stopped"

    # Get app path
    Write-Host ""
    Write-Host "App installation path:" -ForegroundColor Yellow
    adb shell pm path com.sodam_front_end

}
else
{
    Write-Host "✗ App is NOT installed" -ForegroundColor Red
}

Write-Host ""

# Try to start the app
Write-Host "Attempting to start the app..." -ForegroundColor Yellow
try
{
    $startResult = adb shell am start -n com.sodam_front_end/.MainActivity 2>&1
    Write-Host $startResult
    if ($startResult -match "Error")
    {
        Write-Host "✗ Failed to start app" -ForegroundColor Red
    }
    else
    {
        Write-Host "✓ App start command executed" -ForegroundColor Green
    }
}
catch
{
    Write-Host "✗ Error starting app: $_" -ForegroundColor Red
}

Write-Host ""

# Get recent logs
Write-Host "Getting recent app logs..." -ForegroundColor Yellow
$recentLogs = adb logcat -d | Select-String "com.sodam_front_end" | Select-Object -Last 10
if ($recentLogs)
{
    $recentLogs | ForEach-Object { Write-Host $_ }
}
else
{
    Write-Host "No recent logs found for the app" -ForegroundColor Yellow
}

Write-Host ""

# Check for common issues
Write-Host "Checking for common issues..." -ForegroundColor Yellow

# Check if React Native Metro server is running
$metroProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*metro*" }
if ($metroProcess)
{
    Write-Host "✓ Metro bundler appears to be running" -ForegroundColor Green
}
else
{
    Write-Host "⚠ Metro bundler may not be running. Try: npm start" -ForegroundColor Yellow
}

# Check gradle daemon
$gradleProcess = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*gradle*" }
if ($gradleProcess)
{
    Write-Host "✓ Gradle daemon is running" -ForegroundColor Green
}
else
{
    Write-Host "ℹ Gradle daemon not detected (this is normal)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Diagnostic Summary:" -ForegroundColor Green
Write-Host "1. If app is not installed, try: npm run android" -ForegroundColor Cyan
Write-Host "2. If app fails to start, check the logcat for errors" -ForegroundColor Cyan
Write-Host "3. If build fails, try: cd android && ./gradlew clean" -ForegroundColor Cyan
Write-Host "4. Make sure Metro bundler is running: npm start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

Read-Host "Press Enter to exit"
