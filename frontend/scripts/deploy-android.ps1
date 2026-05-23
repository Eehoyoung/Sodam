param(
    [string]$BuildType = "debug",
    [string]$OutputFormat = "apk"
)

Write-Host "=== Sodam Android 배포 시작 ===" -ForegroundColor Green
Write-Host "빌드 타입: $BuildType, 출력 형식: $OutputFormat" -ForegroundColor Yellow

# 1. 환경 정리
Write-Host "1. 환경 정리 중..." -ForegroundColor Cyan
npm run gradle-clean
if ($LASTEXITCODE -ne 0) {
    Write-Error "Gradle 정리 실패"
    exit 1
}

# 2. Metro 캐시 리셋
Write-Host "2. Metro 캐시 리셋 중..." -ForegroundColor Cyan
npm run metro-reset

# 3. 빌드 실행
Write-Host "3. Android $BuildType $OutputFormat 빌드 중..." -ForegroundColor Cyan
Set-Location android

if ($OutputFormat -eq "aab") {
    .\gradlew bundle$($BuildType.Substring(0,1).ToUpper() + $BuildType.Substring(1))
} else {
    .\gradlew assemble$($BuildType.Substring(0,1).ToUpper() + $BuildType.Substring(1))
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Android 빌드 실패"
    Set-Location ..
    exit 1
}

Set-Location ..

# 4. 결과 확인
Write-Host "4. 빌드 결과 확인 중..." -ForegroundColor Cyan
if ($OutputFormat -eq "aab") {
    $outputPath = "android\app\build\outputs\bundle\$BuildType\app-$BuildType.aab"
} else {
    if ($BuildType -eq "release") {
        $outputPath = "android\app\build\outputs\apk\$BuildType\app-$BuildType-unsigned.apk"
    } else {
        $outputPath = "android\app\build\outputs\apk\$BuildType\app-$BuildType.apk"
    }
}

if (Test-Path $outputPath) {
    Write-Host "✅ 빌드 성공!" -ForegroundColor Green
    Write-Host "파일 위치: $outputPath" -ForegroundColor Yellow

    # 파일 크기 확인
    $fileSize = [math]::Round((Get-Item $outputPath).Length / 1MB, 2)
    Write-Host "파일 크기: $fileSize MB" -ForegroundColor Yellow

    # 추가 정보 출력
    Write-Host "Android 정보:" -ForegroundColor Cyan
    Write-Host "  - Application ID: com.sodam_front_end" -ForegroundColor White
    Write-Host "  - Version Name: 0.0.1" -ForegroundColor White
    Write-Host "  - Version Code: 1" -ForegroundColor White
    Write-Host "  - Min SDK: 24" -ForegroundColor White
    Write-Host "  - Target SDK: 36" -ForegroundColor White
    Write-Host "  - Hermes: Enabled" -ForegroundColor White

    # ADB 설치 가이드
    Write-Host "" -ForegroundColor White
    Write-Host "테스트 설치 명령어:" -ForegroundColor Cyan
    Write-Host "  adb install `"$outputPath`"" -ForegroundColor Yellow
} else {
    Write-Error "빌드 파일을 찾을 수 없습니다: $outputPath"
    exit 1
}

Write-Host "=== Android 배포 완료 ===" -ForegroundColor Green
