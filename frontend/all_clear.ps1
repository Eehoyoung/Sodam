# 캐시 초기화 스크립트 (Windows PowerShell)

Write-Host "=== Metro & Watchman 캐시 삭제 ==="
try {
    watchman watch-del-all
} catch {
    Write-Host "Watchman이 설치되어 있지 않거나 실행 불가 - 건너뜀"
}

# Metro / Haste-map 캐시 삭제
Remove-Item "$env:TEMP\metro-*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\haste-map-*" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== Android 빌드 캐시 삭제 ==="
Remove-Item "android\app\build" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== Gradle 클린 ==="
cd android
./gradlew clean
cd ..

Write-Host "=== Metro 번들러 캐시 리셋 후 시작 ==="
npx react-native start --reset-cache
