param(
  [string] $OutFile
)

$ErrorActionPreference = 'Stop'

function Get-Ts {
  return (Get-Date -Format 'yyyyMMdd_HHmmss')
}

try {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repoRoot = Split-Path -Parent $scriptDir
  $androidDir = Join-Path $repoRoot 'android'
  $gradleBat = Join-Path $androidDir 'gradlew.bat'

  if (-not (Test-Path $gradleBat)) {
    throw "Gradle wrapper not found: $gradleBat"
  }

  $logsDir = Join-Path $repoRoot 'logs'
  if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
  $timestamp = Get-Ts
  $logPath = if ($OutFile) { $OutFile } else { Join-Path $logsDir ("gradle-sync-report-$timestamp.log") }

  "[INFO] Gradle sync reproduction started at $(Get-Date)" | Tee-Object -FilePath $logPath -Append | Out-Null
  "[INFO] Env: GradleWrapper=$gradleBat; AndroidDir=$androidDir" | Tee-Object -FilePath $logPath -Append | Out-Null

  # Step 1: Basic help (configuration phase)
  "[STEP] Running: gradlew -p android help" | Tee-Object -FilePath $logPath -Append | Out-Null
  & $gradleBat -p $androidDir help 2>&1 | Tee-Object -FilePath $logPath -Append
  $code1 = $LASTEXITCODE
  if ($code1 -ne 0) {
    "[ERROR] Gradle help failed with exit code $code1" | Tee-Object -FilePath $logPath -Append | Out-Null
    Write-Output "[FAIL] Gradle sync reproduction FAILED at 'help'. LOG_FILE: $logPath"
    exit $code1
  }

  # Step 2: List app tasks (ensures subproject config and CMake tasks wiring)
  "[STEP] Running: gradlew -p android :app:tasks --all" | Tee-Object -FilePath $logPath -Append | Out-Null
  & $gradleBat -p $androidDir ':app:tasks' '--all' 2>&1 | Tee-Object -FilePath $logPath -Append
  $code2 = $LASTEXITCODE
  if ($code2 -ne 0) {
    "[ERROR] :app:tasks --all failed with exit code $code2" | Tee-Object -FilePath $logPath -Append | Out-Null
    Write-Output "[FAIL] Gradle sync reproduction FAILED at ':app:tasks --all'. LOG_FILE: $logPath"
    exit $code2
  }

  "[SUCCESS] Gradle sync reproduction PASSED. LOG_FILE: $logPath" | Tee-Object -FilePath $logPath -Append | Out-Null
  Write-Output "[SUCCESS] Gradle sync reproduction PASSED. LOG_FILE: $logPath"
  exit 0
}
catch {
  $msg = $_.Exception.Message
  Write-Output "[EXCEPTION] $msg"
  exit 1
}
