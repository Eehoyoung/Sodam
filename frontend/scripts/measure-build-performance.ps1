# 빌드 성능 측정 스크립트
param(
    [string]$BuildType = "assembleDebug",
    [string]$LogFile = "logs\build-performance-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

function Measure-BuildPerformance {
    Write-Host "📊 Starting build performance measurement..." -ForegroundColor Green

    # Create log directory
    $logDir = Split-Path $LogFile -Parent
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    # Record start time
    $startTime = Get-Date
    Write-Host "Start time: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))"

    try {
        # Navigate to Android directory
        Push-Location "android"

        # Clean phase
        Write-Host "🧹 Starting clean task..."
        $cleanStart = Get-Date
        & .\gradlew clean --quiet
        $cleanEnd = Get-Date
        $cleanDuration = ($cleanEnd - $cleanStart).TotalSeconds

        # Build phase
        Write-Host "🔨 Starting $BuildType build..."
        $buildStart = Get-Date
        & .\gradlew $BuildType --profile --info
        $buildEnd = Get-Date
        $buildDuration = ($buildEnd - $buildStart).TotalSeconds

        # Calculate total duration
        $totalDuration = ($buildEnd - $startTime).TotalMinutes

        # Display results
        Write-Host "✅ Build completed!" -ForegroundColor Green
        Write-Host "Clean time: $([math]::Round($cleanDuration, 2)) seconds" -ForegroundColor Yellow
        Write-Host "Build time: $([math]::Round($buildDuration, 2)) seconds" -ForegroundColor Yellow
        Write-Host "Total time: $([math]::Round($totalDuration, 2)) minutes" -ForegroundColor Cyan

        # Save results to log file
        $logContent = @"
Build Performance Measurement Results
====================================
Measured at: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))
Build type: $BuildType

Performance metrics:
- Clean time: $([math]::Round($cleanDuration, 2)) seconds
- Build time: $([math]::Round($buildDuration, 2)) seconds
- Total time: $([math]::Round($totalDuration, 2)) minutes

Detailed logs location: android/build/reports/profile/
"@

        $logContent | Out-File -FilePath $LogFile -Encoding UTF8
        Write-Host "📝 Performance measurement results saved: $LogFile" -ForegroundColor Green

        # Check APK size (for Debug builds)
        if ($BuildType -eq "assembleDebug") {
            $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
            if (Test-Path $apkPath) {
                $apkSize = (Get-Item $apkPath).Length / 1MB
                Write-Host "📱 APK size: $([math]::Round($apkSize, 2))MB" -ForegroundColor Magenta
                Add-Content -Path $LogFile -Value "- APK size: $([math]::Round($apkSize, 2))MB"
            }
        }

        return @{
            CleanTime = $cleanDuration
            BuildTime = $buildDuration
            TotalTime = $totalDuration
            Success = $true
        }

    } catch {
        Write-Error "Error occurred during build: $($_.Exception.Message)"
        Add-Content -Path $LogFile -Value "Error occurred: $($_.Exception.Message)"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    } finally {
        Pop-Location
    }
}

# Execute measurement
$result = Measure-BuildPerformance

if ($result.Success) {
    Write-Host "`n🎉 Build performance measurement completed!" -ForegroundColor Green
    Write-Host "Check detailed results in: $LogFile" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Error occurred during build performance measurement." -ForegroundColor Red
    exit 1
}
