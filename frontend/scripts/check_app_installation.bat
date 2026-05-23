@echo off
echo ========================================
echo Sodam App Installation Checker
echo ========================================
echo.

echo Checking if emulator is running...
adb devices
echo.

echo Checking if Sodam app is installed...
adb shell pm list packages | findstr com.sodam_front_end
echo.

echo Getting app info if installed...
adb shell dumpsys package com.sodam_front_end | findstr "versionName\|versionCode\|targetSdk\|minSdk"
echo.

echo Checking app installation path...
adb shell pm path com.sodam_front_end
echo.

echo Trying to start the app...
adb shell am start -n com.sodam_front_end/.MainActivity
echo.

echo Getting recent logcat for the app...
adb logcat -d | findstr com.sodam_front_end | tail -20
echo.

echo ========================================
echo Installation check complete!
echo ========================================
pause
