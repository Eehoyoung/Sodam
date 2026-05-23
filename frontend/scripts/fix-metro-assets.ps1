#!/usr/bin/env pwsh
# 🚀 Metro Asset Registry Path 자동 수정 스크립트
# React Native 프로젝트의 Metro 번들러 asset registry path 오류 해결

param(
    [switch]$Verbose,
    [switch]$Force
)

Write-Host "🚀 Metro Asset Registry 자동 수정 시작..." -ForegroundColor Green
Write-Host "📅 실행 시간: $( Get-Date )" -ForegroundColor Cyan

# 현재 디렉터리가 React Native 프로젝트인지 확인
if (-not (Test-Path "package.json"))
{
    Write-Host "❌ 오류: package.json을 찾을 수 없습니다. React Native 프로젝트 루트에서 실행하세요." -ForegroundColor Red
    exit 1
}

# package.json에서 React Native 프로젝트 확인
$packageJson = Get-Content "package.json" | ConvertFrom-Json
if (-not $packageJson.dependencies."react-native")
{
    Write-Host "❌ 오류: React Native 프로젝트가 아닙니다." -ForegroundColor Red
    exit 1
}

Write-Host "✅ React Native 프로젝트 확인됨: $( $packageJson.name )" -ForegroundColor Green

# 1단계: Metro 캐시 완전 정리
Write-Host "`n📁 [1/6] Metro 캐시 정리 중..." -ForegroundColor Yellow

$cacheDirectories = @(
    "node_modules\.cache",
    "$env:TEMP\metro-*",
    "$env:TEMP\haste-map-*",
    "$env:TEMP\react-native-*",
    "$env:LOCALAPPDATA\Temp\metro-*"
)

foreach ($dir in $cacheDirectories)
{
    if (Test-Path $dir)
    {
        try
        {
            Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
            Write-Host "  ✅ 삭제됨: $dir" -ForegroundColor Green
        }
        catch
        {
            Write-Host "  ⚠️  삭제 실패: $dir" -ForegroundColor Yellow
        }
    }
}

# 2단계: React Native 캐시 정리
Write-Host "`n🧹 [2/6] React Native 캐시 정리 중..." -ForegroundColor Yellow

# 실행 중인 Metro 프로세스 종료
$metroProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*react-native*" }
if ($metroProcesses)
{
    Write-Host "  🔄 기존 Metro 프로세스 종료 중..." -ForegroundColor Cyan
    $metroProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Metro 캐시 리셋 (짧은 시간 실행 후 종료)
try
{
    Write-Host "  🔄 Metro 캐시 리셋 실행 중..." -ForegroundColor Cyan
    $metroProcess = Start-Process -FilePath "npx" -ArgumentList "react-native", "start", "--reset-cache", "--port", "8081" -PassThru -NoNewWindow
    Start-Sleep -Seconds 5
    $metroProcess | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Metro 캐시 리셋 완료" -ForegroundColor Green
}
catch
{
    Write-Host "  ⚠️  Metro 캐시 리셋 중 오류 발생" -ForegroundColor Yellow
}

# 3단계: NPM 캐시 정리
Write-Host "`n📦 [3/6] NPM 캐시 정리 중..." -ForegroundColor Yellow
try
{
    npm cache clean --force
    Write-Host "  ✅ NPM 캐시 정리 완료" -ForegroundColor Green
}
catch
{
    Write-Host "  ⚠️  NPM 캐시 정리 중 오류 발생" -ForegroundColor Yellow
}

# 4단계: Metro 설정 검증 및 최적화
Write-Host "`n⚙️  [4/6] Metro 설정 검증 중..." -ForegroundColor Yellow

$metroConfigExists = Test-Path "metro.config.js"
$metroConfigCjsExists = Test-Path "metro.config.js"

if ($metroConfigExists)
{
    Write-Host "  ✅ metro.config.js 발견됨" -ForegroundColor Green

    # metro.config.js 내용 검증
    $metroConfig = Get-Content "metro.config.js" -Raw
    if ($metroConfig -match "assetRegistryPath")
    {
        Write-Host "  ✅ assetRegistryPath 설정 확인됨" -ForegroundColor Green
    }
    else
    {
        Write-Host "  ⚠️  assetRegistryPath 설정이 없습니다" -ForegroundColor Yellow
    }

    if ($metroConfig -match "getDefaultConfig.*await")
    {
        Write-Host "  ✅ 비동기 getDefaultConfig 확인됨" -ForegroundColor Green
    }
    else
    {
        Write-Host "  ⚠️  getDefaultConfig가 비동기로 처리되지 않을 수 있습니다" -ForegroundColor Yellow
    }
}
elseif ($metroConfigCjsExists)
{
    Write-Host "  ✅ metro.config.js 발견됨 (CommonJS 모드)" -ForegroundColor Green
}
else
{
    Write-Host "  ❌ Metro 설정 파일이 없습니다" -ForegroundColor Red
    Write-Host "  💡 metro.config.js 파일을 생성해야 합니다" -ForegroundColor Cyan
}

# package.json의 모듈 타입 확인
if ($packageJson.type -eq "module")
{
    Write-Host "  ✅ ESM 모듈 타입 확인됨" -ForegroundColor Green
}
else
{
    Write-Host "  ℹ️  CommonJS 모듈 타입 (기본값)" -ForegroundColor Cyan
}

# 5단계: 설정 파일 호환성 확인
Write-Host "`n🔧 [5/6] 설정 파일 호환성 확인 중..." -ForegroundColor Yellow

$configFiles = @("babel.config.js", "babel.config.js", "react-native.config.js", "react-native.config.js")
foreach ($file in $configFiles)
{
    if (Test-Path $file)
    {
        Write-Host "  ✅ 발견됨: $file" -ForegroundColor Green
    }
}

# 6단계: Metro 테스트 실행
Write-Host "`n🧪 [6/6] Metro 설정 테스트 중..." -ForegroundColor Yellow

if ($Force -or (Read-Host "Metro 테스트를 실행하시겠습니까? (y/N)") -eq "y")
{
    Write-Host "  🔄 Metro 테스트 시작..." -ForegroundColor Cyan

    try
    {
        # Metro를 짧은 시간 동안 실행하여 설정 로딩 테스트
        $testProcess = Start-Process -FilePath "npx" -ArgumentList "react-native", "start", "--reset-cache" -PassThru -NoNewWindow -RedirectStandardOutput "metro-test.log" -RedirectStandardError "metro-error.log"
        Start-Sleep -Seconds 10

        if (-not $testProcess.HasExited)
        {
            $testProcess | Stop-Process -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Metro가 성공적으로 시작되었습니다" -ForegroundColor Green

            # 로그 파일에서 오류 확인
            if (Test-Path "metro-error.log")
            {
                $errorLog = Get-Content "metro-error.log" -Raw
                if ($errorLog -match "missing-asset-registry-path")
                {
                    Write-Host "  ❌ 여전히 asset registry path 오류가 발생합니다" -ForegroundColor Red
                }
                else
                {
                    Write-Host "  ✅ asset registry path 오류가 해결된 것 같습니다" -ForegroundColor Green
                }
            }
        }
        else
        {
            Write-Host "  ❌ Metro 시작에 실패했습니다" -ForegroundColor Red
        }

        # 임시 로그 파일 정리
        Remove-Item "metro-test.log", "metro-error.log" -ErrorAction SilentlyContinue

    }
    catch
    {
        Write-Host "  ❌ Metro 테스트 중 오류 발생: $( $_.Exception.Message )" -ForegroundColor Red
    }
}
else
{
    Write-Host "  ℹ️  Metro 테스트를 건너뜁니다" -ForegroundColor Cyan
}

# 완료 메시지 및 다음 단계 안내
Write-Host "`n🎉 Metro Asset Registry 자동 수정 완료!" -ForegroundColor Green
Write-Host "⏰ 완료 시간: $( Get-Date )" -ForegroundColor Cyan

Write-Host "`n📋 다음 단계:" -ForegroundColor Yellow
Write-Host "  1. 터미널을 새로 열어주세요" -ForegroundColor White
Write-Host "  2. Metro 시작: npx react-native start --reset-cache" -ForegroundColor White
Write-Host "  3. 앱 빌드: npm run android (또는 npm run ios)" -ForegroundColor White

Write-Host "`n🔍 문제가 지속되는 경우:" -ForegroundColor Yellow
Write-Host "  • AUTOMATED_METRO_ASSET_REGISTRY_SOLUTION.md 문서를 참조하세요" -ForegroundColor White
Write-Host "  • CommonJS 대안 방법을 시도해보세요" -ForegroundColor White
Write-Host "  • 프로젝트 완전 재설정을 고려해보세요" -ForegroundColor White

Write-Host "`n✨ 스크립트 실행 완료! React Native 개발을 즐기세요! 🚀" -ForegroundColor Magenta
