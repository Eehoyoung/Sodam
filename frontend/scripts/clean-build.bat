@echo off
echo Cleaning Sodam Front End build artifacts...

echo.
echo [1/6] Cleaning Gradle cache...
cd android
call gradlew clean
cd ..

echo.
echo [2/6] Removing .gradle directories...
if exist "android\.gradle" rmdir /s /q "android\.gradle"

echo.
echo [3/6] Removing .cxx directories...
if exist "android\app\.cxx" rmdir /s /q "android\app\.cxx"
for /d %%i in ("node_modules\*") do (
    if exist "%%i\android\.cxx" rmdir /s /q "%%i\android\.cxx"
)

echo.
echo [4/6] Cleaning Metro cache...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
if exist "%TEMP%\metro-*" rmdir /s /q "%TEMP%\metro-*"

echo.
echo [5/6] Cleaning React Native cache...
npx react-native start --reset-cache --port 8081 &
timeout /t 3 >nul
taskkill /f /im node.exe >nul 2>&1

echo.
echo [6/6] Cleaning npm cache...
npm cache clean --force

echo.
echo ✅ Build cleanup completed!
echo You can now run: npm run android
pause
