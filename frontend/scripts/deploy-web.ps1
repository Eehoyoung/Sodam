param(
    [string]$BuildType = "production",
    [string]$Port = "8000",
    [switch]$Serve = $false,
    [switch]$Analyze = $false
)

Write-Host "=== Sodam Web 배포 시작 ===" -ForegroundColor Green
Write-Host "빌드 타입: $BuildType" -ForegroundColor Yellow

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

# 2. Web 종속성 확인
Write-Host "2. Web 종속성 확인 중..." -ForegroundColor Cyan

# React Native Web 확인
if (-not (Test-Path "node_modules\react-native-web")) {
    Write-Host "React Native Web 설치 중..." -ForegroundColor Yellow
    npm install react-native-web --save-dev
    if ($LASTEXITCODE -ne 0) {
        Write-Error "React Native Web 설치 실패"
        exit 1
    }
} else {
    Write-Host "React Native Web 설치됨" -ForegroundColor Green
}

# Webpack 설정 확인
if (-not (Test-Path "node_modules\@expo\webpack-config")) {
    Write-Host "Expo Webpack 설정 설치 중..." -ForegroundColor Yellow
    npm install @expo/webpack-config --save-dev
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Expo Webpack 설정 설치 실패"
        exit 1
    }
} else {
    Write-Host "Expo Webpack 설정 설치됨" -ForegroundColor Green
}

# 3. 기존 빌드 정리
Write-Host "3. 기존 빌드 정리 중..." -ForegroundColor Cyan
if (Test-Path "web-build") {
    Remove-Item "web-build" -Recurse -Force
    Write-Host "기존 web-build 디렉토리 삭제됨" -ForegroundColor Yellow
}

# 4. Web 빌드 실행
Write-Host "4. Web $BuildType 빌드 중..." -ForegroundColor Cyan

try {
    if ($BuildType -eq "development") {
        Write-Host "개발 서버 시작 중..." -ForegroundColor Yellow
        Write-Host "브라우저에서 http://localhost:19006 에 접속하세요" -ForegroundColor Cyan
        npx expo start:web
    } else {
        Write-Host "프로덕션 빌드 시작..." -ForegroundColor Yellow

        if ($Analyze) {
            Write-Host "번들 분석 모드로 빌드 중..." -ForegroundColor Yellow
            npx expo export:web --analyze
        } else {
            npx expo export:web
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Web 빌드 실패 (Exit Code: $LASTEXITCODE)"
            exit 1
        }
    }
} catch {
    Write-Error "Web 빌드 중 오류 발생: $($_.Exception.Message)"
    exit 1
}

# 5. 빌드 결과 확인 (프로덕션 빌드인 경우만)
if ($BuildType -ne "development") {
    Write-Host "5. 빌드 결과 확인 중..." -ForegroundColor Cyan

    if (Test-Path "web-build") {
        Write-Host "✅ Web 빌드 성공!" -ForegroundColor Green

        # 빌드 정보 출력
        $buildFiles = Get-ChildItem "web-build" -Recurse -File
        $totalFiles = $buildFiles.Count
        $buildSize = [math]::Round(($buildFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 2)

        Write-Host "" -ForegroundColor White
        Write-Host "빌드 정보:" -ForegroundColor Cyan
        Write-Host "  - 빌드 디렉토리: web-build\" -ForegroundColor White
        Write-Host "  - 총 파일 수: $totalFiles" -ForegroundColor White
        Write-Host "  - 총 크기: $buildSize MB" -ForegroundColor White

        # 주요 파일들 크기 확인
        $jsFiles = $buildFiles | Where-Object { $_.Extension -eq ".js" }
        $cssFiles = $buildFiles | Where-Object { $_.Extension -eq ".css" }
        $htmlFiles = $buildFiles | Where-Object { $_.Extension -eq ".html" }

        if ($jsFiles.Count -gt 0) {
            $jsSize = [math]::Round(($jsFiles | Measure-Object -Property Length -Sum).Sum / 1KB, 2)
            Write-Host "  - JavaScript 파일: $($jsFiles.Count)개, $jsSize KB" -ForegroundColor White
        }

        if ($cssFiles.Count -gt 0) {
            $cssSize = [math]::Round(($cssFiles | Measure-Object -Property Length -Sum).Sum / 1KB, 2)
            Write-Host "  - CSS 파일: $($cssFiles.Count)개, $cssSize KB" -ForegroundColor White
        }

        if ($htmlFiles.Count -gt 0) {
            Write-Host "  - HTML 파일: $($htmlFiles.Count)개" -ForegroundColor White
        }

        # 배포 가이드
        Write-Host "" -ForegroundColor White
        Write-Host "배포 방법:" -ForegroundColor Cyan
        Write-Host "  1. 정적 호스팅 서비스 (Vercel, Netlify, GitHub Pages)" -ForegroundColor Yellow
        Write-Host "  2. 웹 서버 (Apache, Nginx)" -ForegroundColor Yellow
        Write-Host "  3. CDN (CloudFront, CloudFlare)" -ForegroundColor Yellow

        # 로컬 테스트 서버 옵션
        if ($Serve) {
            Write-Host "" -ForegroundColor White
            Write-Host "로컬 테스트 서버 시작 중..." -ForegroundColor Cyan

            # serve 패키지 확인 및 설치
            $serveInstalled = npm list -g serve 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "serve 패키지 설치 중..." -ForegroundColor Yellow
                npm install -g serve
            }

            Set-Location web-build
            Write-Host "브라우저에서 http://localhost:$Port 에 접속하세요" -ForegroundColor Green
            npx serve . -p $Port
            Set-Location ..
        } else {
            Write-Host "" -ForegroundColor White
            Write-Host "로컬 테스트 명령어:" -ForegroundColor Cyan
            Write-Host "  cd web-build && npx serve . -p $Port" -ForegroundColor Yellow
            Write-Host "  또는" -ForegroundColor White
            Write-Host "  python -m http.server $Port (Python 설치된 경우)" -ForegroundColor Yellow
        }

        # 성능 최적화 팁
        Write-Host "" -ForegroundColor White
        Write-Host "성능 최적화 팁:" -ForegroundColor Cyan
        Write-Host "  - Gzip 압축 활성화" -ForegroundColor Yellow
        Write-Host "  - 정적 자산 캐싱 설정" -ForegroundColor Yellow
        Write-Host "  - CDN 사용 권장" -ForegroundColor Yellow

        if ($Analyze) {
            Write-Host "" -ForegroundColor White
            Write-Host "번들 분석 결과가 자동으로 열립니다" -ForegroundColor Cyan
        } else {
            Write-Host "" -ForegroundColor White
            Write-Host "번들 분석: npx expo export:web --analyze" -ForegroundColor Cyan
        }

    } else {
        Write-Error "Web 빌드 디렉토리를 찾을 수 없습니다"
        exit 1
    }
}

Write-Host "=== Web 배포 완료 ===" -ForegroundColor Green
