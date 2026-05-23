param(
  [Parameter(Position=0, ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

# Set project-local Gradle user home to avoid system cache at C:\gradle
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Split-Path -Parent $scriptDir
$projectRoot = Split-Path -Parent $androidDir
# Use very short path for Gradle user home to avoid Windows MAX_PATH issues with CMake/Ninja
$shortGradleHome = "C:\\guh"
if (!(Test-Path -LiteralPath $shortGradleHome)) {
  New-Item -ItemType Directory -Path $shortGradleHome | Out-Null
}
$env:GRADLE_USER_HOME = $shortGradleHome
Write-Host "[INFO] Using GRADLE_USER_HOME=$env:GRADLE_USER_HOME" -ForegroundColor Cyan

# Default to 'help' if no args passed
if (-not $Args -or $Args.Length -eq 0) {
  $Args = @("help")
}

Push-Location (Join-Path $projectRoot "android")
try {
  & .\gradlew.bat @Args
} finally {
  Pop-Location
}
