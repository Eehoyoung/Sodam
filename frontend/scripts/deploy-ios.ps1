param(
    [string]$Platform = "simulator",
    [string]$Device = "iPhone 15 Pro"
)

Write-Host "=== Sodam iOS 배포 시작 ===" -ForegroundColor Green
Write-Host "플랫폼: $Platform, 기기: $Device" -ForegroundColor Yellow

# 1. 환경 확인
Write-Host "1. 환경 확인 중..." -ForegroundColor Cyan

# Expo CLI 설치 확인
$expoVersion = npx expo --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Expo CLI 설치 중..." -ForegroundColor Yellow
    npm install -g @expo/cli
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Expo CLI 설치 실패"
        exit 1
    }
} else {
    Write-Host "Expo CLI 버전: $expoVersion" -ForegroundColor Green
}

# 2. iOS 종속성 확인
Write-Host "2. iOS 종속성 확인 중..." -ForegroundColor Cyan
if (Test-Path "ios\Podfile.lock") {
    Write-Host "Podfile.lock 발견. Pod 업데이트 건너뛰기..." -ForegroundColor Yellow
} else {
    Write-Host "Pod 설치 확인 중..." -ForegroundColor Cyan
    if (Get-Command "pod" -ErrorAction SilentlyContinue) {
        Set-Location ios
        pod install
        Set-Location ..
    } else {
        Write-Warning "CocoaPods가 설치되지 않음. macOS에서 'sudo gem install cocoapods' 실행 필요"
    }
}

# 3. 시뮬레이터 확인 (시뮬레이터 빌드인 경우)
if ($Platform -eq "simulator") {
    Write-Host "3. iOS 시뮬레이터 확인 중..." -ForegroundColor Cyan

    # 사용 가능한 시뮬레이터 목록 확인 시도
    try {
        $simulators = xcrun simctl list devices available 2>$null
        if ($simulators -and $simulators -like "*$Device*") {
            Write-Host "시뮬레이터 '$Device' 확인됨" -ForegroundColor Green
        } else {
            Write-Warning "시뮬레이터 '$Device'를 찾을 수 없음. 기본 시뮬레이터 사용"
            $Device = ""
        }
    } catch {
        Write-Warning "시뮬레이터 확인 실패. macOS 환경이 아니거나 Xcode가 설치되지 않음"
    }
}

# 4. 빌드 실행
Write-Host "4. iOS $Platform 빌드 중..." -ForegroundColor Cyan

try {
    if ($Platform -eq "device") {
        Write-Host "실제 기기용 빌드 시작..." -ForegroundColor Yellow
        npx expo run:ios --device
    } else {
        Write-Host "시뮬레이터용 빌드 시작..." -ForegroundColor Yellow
        if ($Device -ne "") {
            npx expo run:ios --simulator "$Device"
        } else {
            npx expo run:ios
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "iOS 빌드 실패 (Exit Code: $LASTEXITCODE)"
        exit 1
    }
} catch {
    Write-Error "iOS 빌드 중 오류 발생: $($_.Exception.Message)"
    exit 1
}

# 5. 빌드 결과 확인
Write-Host "5. 빌드 결과 확인 중..." -ForegroundColor Cyan

# iOS 프로젝트 정보 출력
Write-Host "✅ iOS 빌드 성공!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "iOS 프로젝트 정보:" -ForegroundColor Cyan
Write-Host "  - Bundle Identifier: com.sodam-front-end" -ForegroundColor White
Write-Host "  - Version: 0.0.1" -ForegroundColor White
Write-Host "  - Build Number: 1" -ForegroundColor White
Write-Host "  - Platform: $Platform" -ForegroundColor White

if ($Platform -eq "simulator") {
    Write-Host "  - Target Device: $Device" -ForegroundColor White
}

Write-Host "" -ForegroundColor White
Write-Host "다음 단계:" -ForegroundColor Cyan

if ($Platform -eq "simulator") {
    Write-Host "  - 시뮬레이터에서 앱이 자동으로 실행됩니다" -ForegroundColor Yellow
    Write-Host "  - 시뮬레이터 메뉴에서 Device > Screenshots를 통해 스크린샷 가능" -ForegroundColor Yellow
} else {
    Write-Host "  - 연결된 iOS 기기에서 앱을 확인하세요" -ForegroundColor Yellow
    Write-Host "  - Xcode에서 Archive 생성: Product > Archive" -ForegroundColor Yellow
    Write-Host "  - TestFlight 또는 App Store Connect 업로드 가능" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "Archive 생성 (macOS 전용):" -ForegroundColor Cyan
Write-Host "  cd ios" -ForegroundColor Yellow
Write-Host "  xcodebuild clean -workspace Sodam_Front_End.xcworkspace -scheme Sodam_Front_End" -ForegroundColor Yellow
Write-Host "  xcodebuild archive -workspace Sodam_Front_End.xcworkspace -scheme Sodam_Front_End -archivePath ./build/Sodam_Front_End.xcarchive" -ForegroundColor Yellow

Write-Host "=== iOS 배포 완료 ===" -ForegroundColor Green
